// GridSim 2D, upgrade panel for the hydro plant. Builds its own DOM inside `root`.

import { HEAD_M, MAX_TURBINES, RIVER_MAX, RIVER_PRESETS, TURBINES, operate, powerCurve, type Operation, type PlantSetup } from "./hydro";

// ---------- Everything you might want to change lives here ----------

const TEXT = {
  title: "Micro hydro",
  subtitle: `Run-of-river · ${HEAD_M} m head`,
  tooLittle: "Too little water. Turbines stop below 30% of their design flow.",
  full: "Turbines are full. The extra water goes over the dam unused.",
  fewer: "Not enough water for every turbine. Running fewer turbines, each with more water, gives more power.",
  allThrough: "All the water goes through the turbines.",
};

const START = { turbine: "medium", count: 1, flow: RIVER_PRESETS.normal } as const;
/** Water flowing less than this over the dam counts as nothing spilled, m³/s. */
const SPILL_EPSILON = 0.01;
const FLOW_STEP = 0.1;

const CHART = {
  width: 300,
  height: 170,
  margin: { left: 40, right: 10, top: 10, bottom: 28 },
  xTicks: 4,
  yTicks: 2,
  dotRadius: 4,
};

export interface PanelState {
  setup: PlantSetup;
  riverFlow: number;
  op: Operation;
}

export interface Panel {
  state: PanelState;
  setOpen(open: boolean): void;
  isOpen(): boolean;
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

// ---------- Panel ----------

export function createPanel(root: HTMLElement, onChange: (state: PanelState) => void, onClose: () => void): Panel {
  const setup: PlantSetup = { turbine: START.turbine, count: START.count };
  let riverFlow: number = START.flow;
  const state: PanelState = { setup, riverFlow, op: operate(setup, riverFlow) };

  root.innerHTML = `
    <header class="up-head">
      <div>
        <h2>${TEXT.title}</h2>
        <p class="up-sub">${TEXT.subtitle}</p>
      </div>
      <button type="button" class="up-close" aria-label="Close">×</button>
    </header>
    <section>
      <h3>Turbine</h3>
      <div class="up-options" role="radiogroup" aria-label="Turbine">
        ${TURBINES.map((t) => {
          const kw = operate({ turbine: t.id, count: 1 }, t.designFlow).powerKW;
          return `<button type="button" class="up-option" role="radio" data-turbine="${t.id}">
            <span class="up-option-name">${t.name}</span>
            <span class="up-option-meta">${fmt(t.designFlow, 1)} m³/s · ${fmt(kw)} kW each</span>
            <span class="up-option-eff">${fmt(t.peakEfficiency * 100)}% peak</span>
          </button>`;
        }).join("")}
      </div>
    </section>
    <section>
      <h3>Number of turbines</h3>
      <div class="up-stepper">
        <button type="button" data-step="-1" aria-label="Fewer turbines">−</button>
        <output id="up-count"></output>
        <button type="button" data-step="1" aria-label="More turbines">+</button>
      </div>
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
      <h3>Output</h3>
      <div class="up-power"><output id="up-kw"></output><span>kW</span></div>
      <p class="up-muted" id="up-max"></p>
      <p id="up-running"></p>
      <p id="up-energy"></p>
      <div class="up-bar"><span class="up-bar-used" id="up-bar-used"></span><span class="up-bar-spill" id="up-bar-spill"></span></div>
      <div class="up-bar-legend">
        <span><i class="up-dot up-dot-used"></i><span id="up-used"></span></span>
        <span><i class="up-dot up-dot-spill"></i><span id="up-spill"></span></span>
      </div>
      <p class="up-explain" id="up-explain"></p>
    </section>
    <section>
      <h3>Power vs river flow</h3>
      <svg id="up-chart" viewBox="0 0 ${CHART.width} ${CHART.height}" role="img" aria-label="Power versus river flow"></svg>
    </section>`;

  const q = <T extends HTMLElement | SVGElement>(sel: string): T => root.querySelector<T>(sel)!;
  const optionButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-turbine]"));
  const presetButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-preset]"));
  const slider = q<HTMLInputElement>("#up-flow");
  const chart = q<SVGSVGElement>("#up-chart");

  function drawChart(op: Operation): void {
    const { width, height, margin } = CHART;
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const yMax = niceCeil(op.maxPowerKW);
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
    const unitY = svg("text", { x: 2, y: margin.top + 3.5 }, "ch-label");
    unitY.textContent = "kW";
    chart.append(unitX, unitY);

    const curve = powerCurve(setup);
    const d = curve.map((p, i) => `${i ? "L" : "M"}${px(p.flow).toFixed(1)} ${py(p.powerKW).toFixed(1)}`).join(" ");
    chart.append(svg("path", { d }, "ch-curve"));

    const x = px(riverFlow);
    chart.append(svg("line", { x1: x, x2: x, y1: margin.top, y2: margin.top + h }, "ch-marker"));
    chart.append(svg("circle", { cx: x, cy: py(op.powerKW), r: CHART.dotRadius }, "ch-dot"));
  }

  function render(): void {
    const op = operate(setup, riverFlow);
    state.riverFlow = riverFlow;
    state.op = op;
    for (const b of optionButtons) b.setAttribute("aria-checked", String(b.dataset.turbine === setup.turbine));
    for (const b of presetButtons) b.setAttribute("aria-pressed", String(Math.abs(RIVER_PRESETS[b.dataset.preset as keyof typeof RIVER_PRESETS] - riverFlow) < 1e-9));
    q("#up-count").textContent = String(setup.count);
    q<HTMLButtonElement>('[data-step="-1"]').disabled = setup.count <= 1;
    q<HTMLButtonElement>('[data-step="1"]').disabled = setup.count >= MAX_TURBINES;
    slider.value = String(riverFlow);
    q("#up-flow-value").textContent = `${fmt(riverFlow, 1)} m³/s`;

    q("#up-kw").textContent = fmt(op.powerKW);
    q("#up-max").textContent = `of ${fmt(op.maxPowerKW)} kW max`;
    q("#up-running").textContent = `${op.running} of ${setup.count} turbines running`;
    q("#up-energy").textContent = `${fmt(op.energyPerDayMWh, 1)} MWh per day`;
    const total = op.usedFlow + op.spilledFlow;
    q("#up-bar-used").style.flexBasis = `${total > 0 ? (op.usedFlow / total) * 100 : 0}%`;
    q("#up-bar-spill").style.flexBasis = `${total > 0 ? (op.spilledFlow / total) * 100 : 0}%`;
    q("#up-used").textContent = `${fmt(op.usedFlow, 1)} m³/s through`;
    q("#up-spill").textContent = `${fmt(op.spilledFlow, 1)} m³/s over the dam`;
    q("#up-explain").textContent =
      op.running === 0 ? TEXT.tooLittle : op.spilledFlow > SPILL_EPSILON ? TEXT.full : op.running < setup.count ? TEXT.fewer : TEXT.allThrough;
    drawChart(op);
  }

  function changed(): void {
    render();
    onChange(state);
  }

  for (const b of optionButtons) {
    b.addEventListener("click", () => {
      setup.turbine = b.dataset.turbine as PlantSetup["turbine"];
      changed();
    });
  }
  for (const b of Array.from(root.querySelectorAll<HTMLButtonElement>("[data-step]"))) {
    b.addEventListener("click", () => {
      setup.count = Math.min(Math.max(setup.count + Number(b.dataset.step), 1), MAX_TURBINES);
      changed();
    });
  }
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
  q<HTMLButtonElement>(".up-close").addEventListener("click", onClose);

  render();
  return {
    state,
    setOpen: (open) => root.classList.toggle("open", open),
    isOpen: () => root.classList.contains("open"),
  };
}
