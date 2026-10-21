// GridSim 2D, upgrade panel for the hydro plant. Builds its own DOM inside `root`.

import {
  CANAL_EXTRA_HEAD,
  CANAL_HEAD_LOSS,
  DAM_HEIGHTS,
  ECO_FLOW,
  FLOOD_SHUTDOWN_FLOW,
  MAX_TURBINES,
  RIVER_MAX,
  RIVER_PRESETS,
  SIZES,
  TECHNOLOGIES,
  annual,
  operate,
  powerCurve,
  technologyById,
  type DamHeight,
  type Operation,
  type PlantSetup,
} from "./hydro";

// ---------- Everything you might want to change lives here ----------

const TEXT = {
  title: "Micro hydro",
  subtitle: "Run-of-river",
  full: "Turbines are full. The extra water goes over the dam unused.",
  fewer: "Not enough water for every turbine. Running fewer turbines, each with more water, gives more power.",
  allThrough: "All the water goes through the turbines.",
  noPermit: "No permit. The law requires an ecological flow to bypass the dam.",
  capacityFactor: "Capacity factor: average output divided by installed power.",
};

const START: { setup: PlantSetup; flow: number } = {
  setup: { technology: "kaplan", size: "medium", count: 1, damHeight: 5, canal: false, gates: false, fishLadder: true, autoCleaner: false },
  flow: RIVER_PRESETS.normal,
};
/** Water flowing less than this over the dam counts as nothing spilled, m³/s. */
const SPILL_EPSILON = 0.01;
const FLOW_STEP = 0.1;

const CHART = {
  width: 300,
  height: 170,
  margin: { left: 40, right: 10, top: 22, bottom: 28 },
  xTicks: 4,
  yTicks: 2,
  dotRadius: 4,
};

const MONTHS_CHART = {
  width: 300,
  height: 130,
  margin: { left: 40, right: 10, top: 22, bottom: 24 },
  barGap: 4,
  initials: "JFMAMJJASOND",
};

/** The switches in the panel, each one a yes/no field of the setup. */
const TOGGLES = {
  canal: "Diversion canal",
  autoCleaner: "Automatic cleaner",
  gates: "Spillway gates",
  fishLadder: "Fish ladder",
} as const;
type ToggleKey = keyof typeof TOGGLES;

export interface PanelState {
  setup: PlantSetup;
  riverFlow: number;
  /** How blocked the intake rack is, 0 to 1. */
  clog: number;
  op: Operation;
}

export interface PanelHooks {
  onChange(state: PanelState): void;
  onClose(): void;
  /** The player pressed "Clean now". */
  onCleanNow(): void;
  /** How many tiles of land a dam of this height floods. */
  floodedTiles(damHeight: DamHeight): number;
}

export interface Panel {
  state: PanelState;
  setOpen(open: boolean): void;
  isOpen(): boolean;
  /** The map moved the rack clog on; keep the plant and the panel in step. */
  setClog(clog: number): void;
}

// ---------- Helpers ----------

const SVG_NS = "http://www.w3.org/2000/svg";
const fmt = (n: number, digits = 0): string => n.toFixed(digits);

/** Round up to 1, 1.5, 2, 3, 5 or 10 times a power of ten, so the chart axis ends on a tidy number. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const step = [1, 1.5, 2, 3, 5, 10].find((s) => v <= s * mag + 1e-9) ?? 10;
  return step * mag;
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, cls?: string): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (cls) el.setAttribute("class", cls);
  return el;
}

function toggleHtml(key: ToggleKey): string {
  return `<button type="button" class="up-toggle" data-toggle="${key}" aria-pressed="false">
    <span>${TOGGLES[key]}</span><span class="up-toggle-state"></span>
  </button>`;
}

// ---------- Panel ----------

export function createPanel(root: HTMLElement, hooks: PanelHooks): Panel {
  const setup: PlantSetup = { ...START.setup };
  let riverFlow: number = START.flow;
  const state: PanelState = { setup, riverFlow, clog: 0, op: operate(setup, riverFlow, 0) };
  /** Whole percent last drawn, so the panel is not redrawn on every frame of the clog creeping up. */
  let shownClogPercent = 0;

  root.innerHTML = `
    <header class="up-head">
      <div>
        <h2>${TEXT.title}</h2>
        <p class="up-sub">${TEXT.subtitle}</p>
      </div>
      <button type="button" class="up-close" aria-label="Close">×</button>
    </header>
    <div class="up-sticky">
      <div class="up-power"><output id="up-kw"></output><span>kW</span></div>
      <p class="up-muted" id="up-installed"></p>
      <p id="up-running"></p>
      <p class="up-explain" id="up-explain"></p>
    </div>
    <section>
      <h3>Dam</h3>
      <div class="up-presets" role="group" aria-label="Dam height">
        ${DAM_HEIGHTS.map((h) => `<button type="button" data-dam="${h}" aria-pressed="false">${h} m</button>`).join("")}
      </div>
      <p id="up-head"></p>
      <p class="up-muted" id="up-flooded"></p>
    </section>
    <section>
      <h3>Diversion canal</h3>
      ${toggleHtml("canal")}
      <p class="up-muted">+${CANAL_EXTRA_HEAD} m head, ${fmt(CANAL_HEAD_LOSS, 1)} m lost to friction</p>
    </section>
    <section>
      <h3>Turbines</h3>
      <div class="up-options" role="radiogroup" aria-label="Turbine technology">
        ${TECHNOLOGIES.map(
          (t) => `<button type="button" class="up-option" role="radio" data-tech="${t.id}">
            <span class="up-option-name">${t.name}</span>
            <span class="up-option-eff">${fmt(t.peakEfficiency * 100)}% peak</span>
            <span class="up-option-desc">${t.description}</span>
            <span class="up-option-meta">${t.minHead} to ${t.maxHead} m of head</span>
            <span class="up-option-reason" hidden></span>
          </button>`,
        ).join("")}
      </div>
      <div class="up-presets up-gap" role="group" aria-label="Turbine size">
        ${SIZES.map((s) => `<button type="button" data-size="${s.id}" aria-pressed="false">${s.name}<small>${fmt(s.designFlow, 1)} m³/s</small></button>`).join("")}
      </div>
      <div class="up-stepper up-gap">
        <button type="button" data-step="-1" aria-label="Fewer turbines">−</button>
        <output id="up-count"></output>
        <button type="button" data-step="1" aria-label="More turbines">+</button>
      </div>
    </section>
    <section>
      <h3>Intake rack</h3>
      <div class="up-bar"><span class="up-bar-clog" id="up-bar-clog"></span></div>
      <p class="up-muted up-gap" id="up-clog"></p>
      <button type="button" class="up-action" id="up-clean">Clean now</button>
      ${toggleHtml("autoCleaner")}
    </section>
    <section>
      <h3>Spillway gates</h3>
      ${toggleHtml("gates")}
    </section>
    <section>
      <h3>Fish ladder</h3>
      ${toggleHtml("fishLadder")}
      <p class="up-warn" id="up-eco-warn" hidden>${TEXT.noPermit}</p>
      <p class="up-muted" id="up-eco-ok">${fmt(ECO_FLOW, 1)} m³/s always bypasses the plant.</p>
    </section>
    <section>
      <h3>River flow</h3>
      <div class="up-presets">
        ${(Object.keys(RIVER_PRESETS) as (keyof typeof RIVER_PRESETS)[])
          .map((k) => `<button type="button" data-preset="${k}">${k[0]!.toUpperCase()}${k.slice(1)}</button>`)
          .join("")}
      </div>
      <input type="range" id="up-flow" min="0" max="${RIVER_MAX}" step="${FLOW_STEP}" aria-label="River flow" />
      <output id="up-flow-value" class="up-value"></output>
    </section>
    <section>
      <h3>Water</h3>
      <div class="up-bar">
        <span class="up-bar-used" id="up-bar-used"></span>
        <span class="up-bar-spill" id="up-bar-spill"></span>
        <span class="up-bar-eco" id="up-bar-eco"></span>
      </div>
      <div class="up-bar-legend">
        <span><i class="up-dot up-dot-used"></i><span id="up-used"></span></span>
        <span><i class="up-dot up-dot-spill"></i><span id="up-spill"></span></span>
        <span><i class="up-dot up-dot-eco"></i><span id="up-eco"></span></span>
      </div>
    </section>
    <section>
      <h3>This year</h3>
      <div class="up-power"><output id="up-year"></output><span>MWh</span></div>
      <p id="up-cf"></p>
      <p class="up-muted">${TEXT.capacityFactor}</p>
      <svg id="up-months" viewBox="0 0 ${MONTHS_CHART.width} ${MONTHS_CHART.height}" role="img" aria-label="Energy per month"></svg>
    </section>
    <section>
      <h3>Power vs river flow</h3>
      <svg id="up-chart" viewBox="0 0 ${CHART.width} ${CHART.height}" role="img" aria-label="Power versus river flow"></svg>
    </section>`;

  const q = <T extends HTMLElement | SVGElement>(sel: string): T => root.querySelector<T>(sel)!;
  const all = <T extends HTMLElement>(sel: string): T[] => Array.from(root.querySelectorAll<T>(sel));
  const damButtons = all<HTMLButtonElement>("[data-dam]");
  const techButtons = all<HTMLButtonElement>("[data-tech]");
  const sizeButtons = all<HTMLButtonElement>("[data-size]");
  const toggleButtons = all<HTMLButtonElement>("[data-toggle]");
  const presetButtons = all<HTMLButtonElement>("[data-preset]");
  const slider = q<HTMLInputElement>("#up-flow");
  const chart = q<SVGSVGElement>("#up-chart");
  const monthsChart = q<SVGSVGElement>("#up-months");

  function drawChart(op: Operation): void {
    const { width, height, margin } = CHART;
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const curve = powerCurve(setup, state.clog);
    const yMax = niceCeil(Math.max(...curve.map((p) => p.powerKW)));
    const px = (flow: number): number => margin.left + (flow / RIVER_MAX) * w;
    const py = (kw: number): number => margin.top + h - (kw / yMax) * h;
    chart.replaceChildren();

    for (let i = 0; i <= CHART.yTicks; i++) {
      const kw = (yMax * i) / CHART.yTicks;
      chart.append(svg("line", { x1: margin.left, x2: margin.left + w, y1: py(kw), y2: py(kw) }, "ch-grid"));
      const label = svg("text", { x: margin.left - 6, y: py(kw) + 3.5 }, "ch-label ch-label-end");
      label.textContent = fmt(kw);
      chart.append(label);
    }
    for (let i = 0; i <= CHART.xTicks; i++) {
      const flow = (RIVER_MAX * i) / CHART.xTicks;
      const label = svg("text", { x: px(flow), y: margin.top + h + 16 }, "ch-label ch-label-mid");
      label.textContent = fmt(flow);
      chart.append(label);
    }
    const unitX = svg("text", { x: margin.left + w, y: height - 2 }, "ch-label ch-label-end");
    unitX.textContent = "m³/s";
    const unitY = svg("text", { x: 2, y: 10 }, "ch-label");
    unitY.textContent = "kW";
    chart.append(unitX, unitY);

    const d = curve.map((p, i) => `${i ? "L" : "M"}${px(p.flow).toFixed(1)} ${py(p.powerKW).toFixed(1)}`).join(" ");
    chart.append(svg("path", { d }, "ch-curve"));

    const x = px(riverFlow);
    chart.append(svg("line", { x1: x, x2: x, y1: margin.top, y2: margin.top + h }, "ch-marker"));
    chart.append(svg("circle", { cx: x, cy: py(op.powerKW), r: CHART.dotRadius }, "ch-dot"));
  }

  function drawMonths(monthsMWh: number[]): void {
    const { width, height, margin, barGap, initials } = MONTHS_CHART;
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const yMax = niceCeil(Math.max(...monthsMWh));
    const slot = w / monthsMWh.length;
    monthsChart.replaceChildren();

    for (const mwh of [0, yMax]) {
      const y = margin.top + h - (mwh / yMax) * h;
      monthsChart.append(svg("line", { x1: margin.left, x2: margin.left + w, y1: y, y2: y }, "ch-grid"));
      const label = svg("text", { x: margin.left - 6, y: y + 3.5 }, "ch-label ch-label-end");
      label.textContent = fmt(mwh);
      monthsChart.append(label);
    }
    const unit = svg("text", { x: 2, y: 10 }, "ch-label");
    unit.textContent = "MWh";
    monthsChart.append(unit);

    monthsMWh.forEach((mwh, i) => {
      const barH = (mwh / yMax) * h;
      monthsChart.append(svg("rect", { x: margin.left + i * slot + barGap / 2, y: margin.top + h - barH, width: slot - barGap, height: barH }, "ch-bar"));
      const label = svg("text", { x: margin.left + (i + 0.5) * slot, y: margin.top + h + 14 }, "ch-label ch-label-mid");
      label.textContent = initials[i]!;
      monthsChart.append(label);
    });
  }

  function statusText(op: Operation): string {
    const tech = technologyById(setup.technology);
    if (op.stopReason === "flood") {
      return `Flood. Without spillway gates the plant shuts down above ${FLOOD_SHUTDOWN_FLOW} m³/s to protect the turbines.`;
    }
    if (op.stopReason === "head") {
      return op.grossHead < tech.minHead
        ? `${tech.name} turbines need at least ${tech.minHead} m of head. Raise the dam or add a canal.`
        : `${tech.name} turbines work with at most ${tech.maxHead} m of head. Lower the dam.`;
    }
    if (op.stopReason === "low-flow") {
      return `Too little water. These turbines stop below ${fmt(tech.minLoad * 100)}% of their design flow.`;
    }
    if (op.spilledFlow > SPILL_EPSILON) return TEXT.full;
    return op.running < setup.count ? TEXT.fewer : TEXT.allThrough;
  }

  function render(): void {
    const op = operate(setup, riverFlow, state.clog);
    shownClogPercent = Math.round(state.clog * 100);
    state.riverFlow = riverFlow;
    state.op = op;

    // Sticky summary
    q("#up-kw").textContent = fmt(op.powerKW);
    q("#up-installed").textContent = `Installed ${fmt(op.installedKW)} kW`;
    q("#up-running").textContent = `${op.running} of ${setup.count} turbines running`;
    q("#up-explain").textContent = statusText(op);

    // Dam
    for (const b of damButtons) b.setAttribute("aria-pressed", String(Number(b.dataset.dam) === setup.damHeight));
    const headParts = [`${fmt(op.grossHead)} gross`];
    if (setup.canal) headParts.push(`−${fmt(op.canalLossM, 1)} canal`);
    headParts.push(`−${fmt(op.rackLossM, 1)} rack`);
    q("#up-head").textContent = `Head: ${fmt(op.netHead, 1)} m (${headParts.join(", ")})`;
    const flooded = hooks.floodedTiles(setup.damHeight);
    q("#up-flooded").textContent = `Flooded land: ${flooded} ${flooded === 1 ? "tile" : "tiles"}`;

    // Switches
    for (const b of toggleButtons) {
      const on = setup[b.dataset.toggle as ToggleKey];
      b.setAttribute("aria-pressed", String(on));
      b.querySelector(".up-toggle-state")!.textContent = on ? "On" : "Off";
    }

    // Turbines
    for (const b of techButtons) {
      const tech = technologyById(b.dataset.tech as PlantSetup["technology"]);
      const tooLow = op.grossHead < tech.minHead;
      const tooHigh = op.grossHead > tech.maxHead;
      const reason = b.querySelector<HTMLElement>(".up-option-reason")!;
      b.setAttribute("aria-checked", String(tech.id === setup.technology));
      b.disabled = tooLow || tooHigh;
      reason.hidden = !b.disabled;
      reason.textContent = tooLow
        ? `Needs at least ${tech.minHead} m of head. This site has ${fmt(op.grossHead)} m.`
        : `Works with at most ${tech.maxHead} m of head. This site has ${fmt(op.grossHead)} m.`;
    }
    for (const b of sizeButtons) b.setAttribute("aria-pressed", String(b.dataset.size === setup.size));
    q("#up-count").textContent = String(setup.count);
    q<HTMLButtonElement>('[data-step="-1"]').disabled = setup.count <= 1;
    q<HTMLButtonElement>('[data-step="1"]').disabled = setup.count >= MAX_TURBINES;

    // Intake rack
    q("#up-bar-clog").style.flexBasis = `${state.clog * 100}%`;
    q("#up-clog").textContent = `Clogged: ${fmt(state.clog * 100)}%`;
    q<HTMLButtonElement>("#up-clean").disabled = setup.autoCleaner;

    // Fish ladder
    q<HTMLElement>("#up-eco-warn").hidden = setup.fishLadder;
    q<HTMLElement>("#up-eco-ok").hidden = !setup.fishLadder;

    // River flow
    for (const b of presetButtons) b.setAttribute("aria-pressed", String(Math.abs(RIVER_PRESETS[b.dataset.preset as keyof typeof RIVER_PRESETS] - riverFlow) < 1e-9));
    slider.value = String(riverFlow);
    q("#up-flow-value").textContent = `${fmt(riverFlow, 1)} m³/s`;

    // Water
    const total = op.usedFlow + op.spilledFlow + op.ecoFlow;
    const share = (v: number): string => `${total > 0 ? (v / total) * 100 : 0}%`;
    q("#up-bar-used").style.flexBasis = share(op.usedFlow);
    q("#up-bar-spill").style.flexBasis = share(op.spilledFlow);
    q("#up-bar-eco").style.flexBasis = share(op.ecoFlow);
    q("#up-used").textContent = `${fmt(op.usedFlow, 1)} m³/s through`;
    q("#up-spill").textContent = `${fmt(op.spilledFlow, 1)} m³/s over the dam`;
    q("#up-eco").textContent = `${fmt(op.ecoFlow, 1)} m³/s fish ladder`;

    // This year
    const year = annual(setup);
    q("#up-year").textContent = fmt(year.totalMWh);
    q("#up-cf").textContent = `Capacity factor: ${fmt(year.capacityFactor * 100)}%`;
    drawMonths(year.monthsMWh);

    drawChart(op);
  }

  function changed(): void {
    render();
    hooks.onChange(state);
  }

  for (const b of damButtons) {
    b.addEventListener("click", () => {
      setup.damHeight = Number(b.dataset.dam) as DamHeight;
      changed();
    });
  }
  for (const b of toggleButtons) {
    b.addEventListener("click", () => {
      const key = b.dataset.toggle as ToggleKey;
      setup[key] = !setup[key];
      changed();
    });
  }
  for (const b of techButtons) {
    b.addEventListener("click", () => {
      setup.technology = b.dataset.tech as PlantSetup["technology"];
      changed();
    });
  }
  for (const b of sizeButtons) {
    b.addEventListener("click", () => {
      setup.size = b.dataset.size as PlantSetup["size"];
      changed();
    });
  }
  for (const b of all<HTMLButtonElement>("[data-step]")) {
    b.addEventListener("click", () => {
      setup.count = Math.min(Math.max(setup.count + Number(b.dataset.step), 1), MAX_TURBINES);
      changed();
    });
  }
  q<HTMLButtonElement>("#up-clean").addEventListener("click", () => {
    state.clog = 0;
    hooks.onCleanNow();
    changed();
  });
  for (const b of presetButtons) {
    b.addEventListener("click", () => {
      riverFlow = RIVER_PRESETS[b.dataset.preset as keyof typeof RIVER_PRESETS];
      changed();
    });
  }
  slider.addEventListener("input", () => {
    riverFlow = Number(slider.value);
    changed();
  });
  q<HTMLButtonElement>(".up-close").addEventListener("click", hooks.onClose);

  render();
  return {
    state,
    setOpen(open) {
      root.classList.toggle("open", open);
      if (open) render();
    },
    isOpen: () => root.classList.contains("open"),
    setClog(clog) {
      state.clog = clog;
      state.op = operate(setup, riverFlow, clog);
      if (Math.round(clog * 100) !== shownClogPercent && root.classList.contains("open")) render();
    },
  };
}
