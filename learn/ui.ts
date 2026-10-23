// Page pieces: lesson list, progress, panel with tabs, callouts, simulators. No three.js here.
import arrowCcw from "@phosphor-icons/core/assets/regular/arrow-counter-clockwise.svg?raw";
import arrowLineRight from "@phosphor-icons/core/assets/regular/arrow-line-right.svg?raw";
import arrowsOut from "@phosphor-icons/core/assets/regular/arrows-out-cardinal.svg?raw";
import arrowsVertical from "@phosphor-icons/core/assets/regular/arrows-vertical.svg?raw";
import calculator from "@phosphor-icons/core/assets/regular/calculator.svg?raw";
import caretDown from "@phosphor-icons/core/assets/regular/caret-down.svg?raw";
import caretRight from "@phosphor-icons/core/assets/regular/caret-right.svg?raw";
import caretUp from "@phosphor-icons/core/assets/regular/caret-up.svg?raw";
import dropBold from "@phosphor-icons/core/assets/bold/drop-bold.svg?raw";
import drop from "@phosphor-icons/core/assets/regular/drop.svg?raw";
import dropHalf from "@phosphor-icons/core/assets/regular/drop-half.svg?raw";
import door from "@phosphor-icons/core/assets/regular/door.svg?raw";
import fish from "@phosphor-icons/core/assets/regular/fish.svg?raw";
import funnel from "@phosphor-icons/core/assets/regular/funnel.svg?raw";
import gauge from "@phosphor-icons/core/assets/regular/gauge.svg?raw";
import gearSix from "@phosphor-icons/core/assets/regular/gear-six.svg?raw";
import gridFour from "@phosphor-icons/core/assets/regular/grid-four.svg?raw";
import lightning from "@phosphor-icons/core/assets/regular/lightning.svg?raw";
import lockSimple from "@phosphor-icons/core/assets/regular/lock-simple.svg?raw";
import minus from "@phosphor-icons/core/assets/regular/minus.svg?raw";
import mountains from "@phosphor-icons/core/assets/regular/mountains.svg?raw";
import percent from "@phosphor-icons/core/assets/regular/percent.svg?raw";
import pipe from "@phosphor-icons/core/assets/regular/pipe.svg?raw";
import play from "@phosphor-icons/core/assets/fill/play-fill.svg?raw";
import plus from "@phosphor-icons/core/assets/regular/plus.svg?raw";
import ruler from "@phosphor-icons/core/assets/regular/ruler.svg?raw";
import stack from "@phosphor-icons/core/assets/regular/stack.svg?raw";
import warning from "@phosphor-icons/core/assets/regular/warning.svg?raw";
import waves from "@phosphor-icons/core/assets/regular/waves.svg?raw";
import type { Fact, Lesson } from "./lessons";
import { bucketEfficiency, DEFLECTION_DEG, exitSpeedMs, jetPowerKW, K_IDEAL } from "./sim/bucket";
import { peakFlowRatio, turbineEfficiency } from "./sim/efficiency";
import { frictionLossM, GROSS_HEAD_M, pipeVelocityMs, reynolds, ROUGHNESS_MM, swameeJainF } from "./sim/friction";
import { criticalTimeS, PIPES, surgeM, waveSpeedMs, type HammerParams } from "./sim/hammer";
import { CV, jetFlowLps, jetSpeedMs, NOZZLE_MM } from "./sim/jet";
import { isCorrectOrder, PLANT_ORDER } from "./sim/order";
import { powerKW } from "./sim/power";
import { trapLengthM, widthTooLarge, zankeVdMmS } from "./sim/settling";
import { fittingTurbines, peltonDiameterM, specificSpeed, type Turbine } from "./sim/specific";

const ICONS: Record<string, string> = {
  "arrow-counter-clockwise": arrowCcw,
  "arrow-line-right": arrowLineRight,
  "arrows-out-cardinal": arrowsOut,
  "arrows-vertical": arrowsVertical,
  calculator,
  "caret-down": caretDown,
  "caret-right": caretRight,
  "caret-up": caretUp,
  "drop-bold": dropBold,
  drop,
  "drop-half": dropHalf,
  door,
  fish,
  funnel,
  gauge,
  "gear-six": gearSix,
  "grid-four": gridFour,
  lightning,
  "lock-simple": lockSimple,
  minus,
  mountains,
  percent,
  pipe,
  play,
  plus,
  ruler,
  stack,
  warning,
  waves,
};

export function icon(name: string): string {
  return `<span class="ic">${ICONS[name] ?? ""}</span>`;
}

/** Fills every `[data-icon]` under `root` with its SVG. */
export function hydrateIcons(root: ParentNode): void {
  for (const e of root.querySelectorAll<HTMLElement>("[data-icon]")) e.innerHTML = icon(e.dataset.icon ?? "");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- progress and lesson list ----------

export function renderProgress(host: HTMLElement, n: number): void {
  let segs = "";
  for (let i = 0; i < 12; i++) segs += `<i class="${i < n - 1 ? "on" : i === n - 1 ? "now" : ""}"></i>`;
  host.innerHTML =
    `<span class="h lab">Hydro · Pelton</span><span class="seg">${segs}</span><span class="mono num">${n} / 12</span>`;
}

export function buildLessonList(
  host: HTMLElement,
  titles: readonly string[],
  thumbs: readonly string[],
  unlocked: number,
  onSelect: (n: number) => void,
): void {
  host.innerHTML = "";
  titles.forEach((title, i) => {
    const n = i + 1;
    const locked = n > unlocked;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "card lesson" + (locked ? " lock" : "");
    b.dataset.n = String(n);
    if (locked) b.setAttribute("aria-disabled", "true");
    b.innerHTML =
      `<span class="num">${String(n).padStart(2, "0")}</span><img src="${thumbs[i] ?? ""}" alt="">` +
      `<span class="h">${esc(title)}</span>${icon(locked ? "lock-simple" : "caret-right")}`;
    b.addEventListener("click", () => {
      if (!locked) onSelect(n);
    });
    host.appendChild(b);
  });
}

export function markCurrentLesson(host: HTMLElement, n: number): void {
  for (const b of host.querySelectorAll<HTMLElement>(".lesson")) b.classList.toggle("on", b.dataset.n === String(n));
}

// ---------- panel ----------

export type TabId = "overview" | "parts" | "how" | "specs";

const claimsAttr = (c: string[]) => ` data-claims="${esc(c.join(" "))}"`;

export function renderPanel(body: HTMLElement, lesson: Lesson, tab: TabId, onPart: (id: string | null) => void): void {
  let html = "";
  if (tab === "overview") {
    html += `<div class="ttl h"><span>${esc(lesson.title)}</span></div>`;
    html += `<p${claimsAttr(lesson.intro.claims)}>${esc(lesson.intro.text)}</p>`;
    for (const r of lesson.rows) html += `<div class="feat"${claimsAttr(r.claims)}>${icon(r.icon)}<span>${esc(r.text)}</span></div>`;
  } else if (tab === "parts") {
    for (const p of lesson.parts) {
      html +=
        `<button type="button" class="partrow" data-part="${esc(p.part ?? "")}"${claimsAttr(p.claims)}>${icon(p.icon)}` +
        `<span><span class="h">${esc(p.label ?? "")}</span><p>${esc(p.text)}</p></span></button>`;
    }
  } else if (tab === "how") {
    html += `<ol class="how">`;
    for (const s of lesson.how) {
      html +=
        `<li data-part="${esc(s.part ?? "")}"${claimsAttr(s.claims)}><span class="h">${esc(s.label ?? "")}</span>` +
        `<p>${esc(s.text)}</p></li>`;
    }
    html += `</ol>`;
  } else {
    for (const s of lesson.specs) {
      html += `<div class="spec"${claimsAttr(s.claims)}><span class="h">${esc(s.label ?? "")}</span><span class="mono">${esc(s.text)}</span></div>`;
    }
  }
  body.innerHTML = html;

  if (tab === "parts") {
    let sel: HTMLElement | null = null;
    for (const row of body.querySelectorAll<HTMLElement>(".partrow")) {
      row.addEventListener("click", () => {
        const same = sel === row;
        sel?.classList.remove("sel");
        sel = same ? null : row;
        sel?.classList.add("sel");
        onPart(sel ? (sel.dataset.part ?? null) : null);
      });
    }
  }
}

/** Marks the step of "How it works" that matches `id` (during the L1 run). */
export function setActiveStep(body: HTMLElement, id: string | null): void {
  for (const li of body.querySelectorAll<HTMLElement>(".how li")) li.classList.toggle("act", id !== null && li.dataset.part === id);
}

// ---------- callouts ----------

export interface CalloutItem {
  part: string;
  el: HTMLElement;
}

export interface Area {
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** Bottom limit of the left column (the scene buttons sit under it). */
  bottomLeft: number;
}

export function createCallouts(host: HTMLElement, facts: readonly Fact[]): CalloutItem[] {
  host.innerHTML = "";
  const items: CalloutItem[] = [];
  for (const f of facts) {
    const el = document.createElement("div");
    el.className = "card callout";
    el.dataset.part = f.part ?? "";
    el.dataset.claims = f.claims.join(" ");
    el.innerHTML = `${icon(f.icon)}<div><div class="h">${esc(f.label ?? "")}</div><p>${esc(f.text)}</p></div>`;
    host.appendChild(el);
    items.push({ part: f.part ?? "", el });
  }
  return items;
}

const GAP = 10;
const MARGIN = 14;

interface Box {
  item: CalloutItem;
  a: [number, number];
  w: number;
  h: number;
  x: number;
  y: number;
  side: "top" | "bottom" | "left" | "right";
}

/** Rows of callouts above and below the scene (overflow goes to the sides), each with a leader line to its anchor. */
export function placeCallouts(items: CalloutItem[], svg: SVGElement, screen: Record<string, [number, number]>, area: Area): void {
  const boxes: Box[] = [];
  for (const item of items) {
    const a = screen[item.part];
    if (!a) continue;
    boxes.push({ item, a, w: item.el.offsetWidth, h: item.el.offsetHeight, x: 0, y: 0, side: "top" });
  }
  const perRow = Math.max(1, Math.floor((area.right - area.left - MARGIN) / ((boxes[0]?.w ?? 220) + GAP)));
  const byY = [...boxes].sort((p, q) => p.a[1] - q.a[1]);
  const half = Math.ceil(byY.length / 2);
  const top = byY.slice(0, half).sort((p, q) => p.a[0] - q.a[0]);
  const bottom = byY.slice(half).sort((p, q) => p.a[0] - q.a[0]);
  for (const row of [top, bottom]) {
    while (row.length > perRow) {
      // the row is full: its outermost box moves to the nearer side
      const first = row[0];
      const last = row[row.length - 1];
      if (!first || !last) break;
      const takeLeft = first.a[0] - area.left < area.right - last.a[0];
      const b = takeLeft ? row.shift() : row.pop();
      if (b) b.side = takeLeft ? "left" : "right";
    }
  }
  for (const b of top) b.side = "top";
  for (const b of bottom) b.side = "bottom";
  for (const row of [top, bottom]) {
    let next = area.left + MARGIN;
    for (const b of row) {
      b.x = Math.max(b.a[0] - b.w / 2, next);
      next = b.x + b.w + GAP;
    }
    let limit = area.right - MARGIN;
    for (let i = row.length - 1; i >= 0; i--) {
      const b = row[i];
      if (!b) continue;
      b.x = Math.min(b.x, limit - b.w);
      limit = b.x - GAP;
    }
    for (const b of row) b.y = b.side === "top" ? area.top : area.bottom - b.h;
  }
  const rowH = Math.max(0, ...top.map((b) => b.h));
  for (const b of boxes) {
    if (b.side === "left" || b.side === "right") {
      b.x = b.side === "left" ? area.left + MARGIN : area.right - b.w - MARGIN;
      b.y = Math.min(Math.max(b.a[1] - b.h / 2, area.top + rowH + GAP), area.bottomLeft - b.h);
    }
  }
  let out = "";
  for (const b of boxes) {
    b.item.el.style.left = `${b.x}px`;
    b.item.el.style.top = `${b.y}px`;
    const [ax, ay] = b.a;
    const sx = b.side === "left" ? b.x + b.w : b.side === "right" ? b.x : Math.min(Math.max(ax, b.x + 18), b.x + b.w - 18);
    const sy = b.side === "top" ? b.y + b.h : b.side === "bottom" ? b.y : b.y + b.h / 2;
    out += `<path d="M${sx} ${sy} L${ax} ${ay}" stroke="#1c2531" stroke-width="1.4" stroke-dasharray="4 4" fill="none"/>`;
    out += `<circle cx="${sx}" cy="${sy}" r="4" fill="#f8f9fa" stroke="#3d6a73" stroke-width="1.6"/>`;
    out += `<circle cx="${ax}" cy="${ay}" r="6.5" fill="#fff" stroke="#e0442e" stroke-width="2"/><circle cx="${ax}" cy="${ay}" r="2.6" fill="#e0442e"/>`;
  }
  svg.innerHTML = out;
}

// ---------- simulators ----------

export interface SimHooks {
  runDrop(onPart: (id: string) => void, onDone: () => void): void;
  /** Tells the panel which step the water is in. */
  onStep(id: string | null): void;
  setBasin(flowLps: number, widthM: number): void;
  /** Moves the energy line of lesson 4. */
  setLoss(hfM: number, h0M: number): void;
  /** Plays the valve closing of lesson 5; `onDone` runs when it ends. */
  runHammer(params: HammerParams, onDone: () => void): void;
  /** Spear opening of lesson 6, 0..1. */
  setOpening(opening: number): void;
  setDeflector(on: boolean): void;
  /** Lesson 7: bucket speed over jet speed, 0..1. */
  setSpin(ratio: number): void;
  /** Lesson 7: speed of the water leaving the bucket over jet speed, 0..1. */
  setExit(fraction: number): void;
  /** Lessons 8 and 9: number of jets. */
  setJets(jets: number): void;
  /** Lesson 8: flow over design flow, 0..1. */
  setFlow(flow: number): void;
  /** Lesson 9: moves the point on the map. */
  setPoint(headM: number, nqe: number): void;
  /** Lesson 9: Pelton diameter D1 in m, or null when no Pelton fits. */
  setRunner(d1M: number | null): void;
}

interface SliderSpec {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  fmt: (v: number) => string;
}

function sliderHtml(s: SliderSpec): string {
  return (
    `<div class="sl"><div class="row"><label class="h" for="sim-${s.name}">${esc(s.label)}</label><b class="mono" data-val="${s.name}"></b></div>` +
    `<input type="range" id="sim-${s.name}" name="${s.name}" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.value}"></div>`
  );
}

interface SliderApi {
  set(name: string, v: number): void;
  get(name: string): number;
  /** Puts every slider back to its default and runs `onChange`. */
  reset(): void;
}

/** Binds the sliders of `specs` inside `host`; `onChange` runs after every change. */
function bindSliders(host: HTMLElement, specs: SliderSpec[], onChange: () => void): SliderApi {
  const inputs = new Map<string, HTMLInputElement>();
  const refresh = () => {
    for (const s of specs) {
      const input = inputs.get(s.name);
      const label = host.querySelector<HTMLElement>(`[data-val="${s.name}"]`);
      if (!input || !label) continue;
      const v = Number(input.value);
      label.textContent = s.fmt(v);
      input.style.setProperty("--p", `${((v - s.min) / (s.max - s.min)) * 100}%`);
    }
  };
  for (const s of specs) {
    const input = host.querySelector<HTMLInputElement>(`input[name="${s.name}"]`);
    if (!input) continue;
    inputs.set(s.name, input);
    input.addEventListener("input", () => {
      refresh();
      onChange();
    });
  }
  return {
    set(name: string, v: number) {
      const input = inputs.get(name);
      if (input) input.value = String(v);
    },
    get(name: string): number {
      return Number(inputs.get(name)?.value ?? 0);
    },
    reset() {
      for (const s of specs) this.set(s.name, s.value);
      refresh();
      onChange();
    },
  };
}

const head = (sub: string, buttons: string) =>
  `<div class="top"><span class="h">Try it yourself</span><div class="btns">${buttons}</div></div>` +
  (sub ? `<div class="sub h">${esc(sub)}</div>` : "");

const resetBtn = `<button type="button" class="ibtn" data-reset aria-label="Reset">${icon("arrow-counter-clockwise")}</button>`;

export function mountSim(host: HTMLElement, lesson: Lesson, hooks: SimHooks): void {
  host.innerHTML = "";
  if (lesson.sim === "order") mountOrder(host, lesson, hooks);
  else if (lesson.sim === "power") mountPower(host);
  else if (lesson.sim === "settling") mountSettling(host, hooks);
  else if (lesson.sim === "friction") mountFriction(host, hooks);
  else if (lesson.sim === "hammer") mountHammer(host, hooks);
  else if (lesson.sim === "jet") mountJet(host, hooks);
  else if (lesson.sim === "bucket") mountBucket(host, hooks);
  else if (lesson.sim === "efficiency") mountEfficiency(host, hooks);
  else mountSpecific(host, hooks);
}

function selectHtml(name: string, label: string, options: [string, string][]): string {
  return (
    `<div class="sl"><div class="row"><label class="h" for="sim-${name}">${esc(label)}</label></div>` +
    `<select id="sim-${name}" name="${name}">${options.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("")}</select></div>`
  );
}

const cell = (label: string, out: string, accent = false) =>
  `<div><small class="h">${esc(label)}</small><div class="v mono${accent ? " accent" : ""}" data-out="${out}"></div></div>`;

function setOut(host: HTMLElement, key: string, text: string): void {
  const e = host.querySelector<HTMLElement>(`[data-out="${key}"]`);
  if (e) e.textContent = text;
}

/** Shows or hides the warning `data-out` element; the text is kept only while it is visible. */
function setWarn(host: HTMLElement, text: string, show: boolean): void {
  const e = host.querySelector<HTMLElement>('[data-out="warn"]');
  if (!e) return;
  e.hidden = !show;
  e.textContent = show ? text : "";
}

const SHUFFLE = [3, 0, 5, 2, 6, 1, 4];

function mountOrder(host: HTMLElement, lesson: Lesson, hooks: SimHooks): void {
  const labelOf = (id: string) => lesson.parts.find((p) => p.part === id)?.label ?? id;
  host.innerHTML =
    head("Put the 7 parts in the order the water passes through them", `${resetBtn}<button type="button" class="ibtn run" data-run aria-label="Run">${icon("play")}</button>`) +
    `<ol class="order"></ol><div class="acts"><button type="button" class="act primary" data-check>Check</button><span class="verdict" role="status"></span></div>`;
  const list = host.querySelector<HTMLOListElement>(".order");
  const verdict = host.querySelector<HTMLElement>(".verdict");
  if (!list || !verdict) return;
  const cards = () => [...list.querySelectorAll<HTMLElement>("[data-order]")];
  const renumber = () =>
    cards().forEach((c, i) => {
      const n = c.querySelector(".n");
      if (n) n.textContent = String(i + 1);
    });
  const clearMarks = () => {
    verdict.textContent = "";
    for (const c of cards()) c.classList.remove("ok", "bad");
  };
  const build = () => {
    list.innerHTML = "";
    for (const k of SHUFFLE) {
      const id = PLANT_ORDER[k] ?? "";
      const li = document.createElement("li");
      li.className = "ordcard";
      li.dataset.order = id;
      li.innerHTML =
        `<span class="n mono"></span><span class="h">${esc(labelOf(id))}</span><span class="mv">` +
        `<button type="button" data-move="up" aria-label="Move up">${icon("caret-up")}</button>` +
        `<button type="button" data-move="down" aria-label="Move down">${icon("caret-down")}</button></span>`;
      list.appendChild(li);
    }
    renumber();
    clearMarks();
  };
  build();

  list.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-move]");
    const li = btn?.closest<HTMLElement>("[data-order]");
    if (!btn || !li) return;
    if (btn.dataset.move === "up") {
      const prev = li.previousElementSibling;
      if (prev) list.insertBefore(li, prev);
    } else {
      const next = li.nextElementSibling;
      if (next) list.insertBefore(next, li);
    }
    renumber();
    clearMarks();
  });

  host.querySelector("[data-check]")?.addEventListener("click", () => {
    const ids = cards().map((c) => c.dataset.order ?? "");
    let right = 0;
    cards().forEach((c, i) => {
      const ok = ids[i] === PLANT_ORDER[i];
      if (ok) right++;
      c.classList.toggle("ok", ok);
      c.classList.toggle("bad", !ok);
    });
    verdict.textContent = isCorrectOrder(ids) ? "Correct order." : `${right} of ${ids.length} in the right place. Try again.`;
  });

  host.querySelector("[data-reset]")?.addEventListener("click", build);

  const run = host.querySelector<HTMLButtonElement>("[data-run]");
  run?.addEventListener("click", () => {
    run.disabled = true;
    hooks.runDrop(
      (id) => hooks.onStep(id),
      () => {
        run.disabled = false;
        hooks.onStep(null);
      },
    );
  });
}

function mountPower(host: HTMLElement): void {
  const specs: SliderSpec[] = [
    { name: "head", label: "Head (fall)", min: 5, max: 150, step: 1, value: 60, fmt: (v) => `${v} m` },
    { name: "flow", label: "Flow", min: 5, max: 300, step: 1, value: 40, fmt: (v) => `${v} L/s` },
    { name: "eff", label: "Efficiency (e)", min: 0.5, max: 0.7, step: 0.01, value: 0.6, fmt: (v) => v.toFixed(2) },
  ];
  host.innerHTML =
    head("", resetBtn) +
    specs.map(sliderHtml).join("") +
    `<div class="outs"><div><small class="h">Power</small><div class="v mono accent" data-out="power"></div></div>` +
    `<div><small class="h">Gross power (e = 1)</small><div class="v mono" data-out="gross"></div></div></div>` +
    `<div class="acts"><button type="button" class="act" data-two-ways>Same power, two ways</button></div>` +
    `<div class="formula mono">P = Q · H · g · e, g = 9.81</div>`;
  const power = host.querySelector<HTMLElement>('[data-out="power"]');
  const gross = host.querySelector<HTMLElement>('[data-out="gross"]');
  const s = bindSliders(host, specs, () => {
    const h = s.get("head");
    const q = s.get("flow");
    if (power) power.textContent = `${powerKW(h, q, s.get("eff")).toFixed(1)} kW`;
    if (gross) gross.textContent = `${powerKW(h, q, 1).toFixed(1)} kW`;
  });
  s.reset();
  let second = false;
  host.querySelector("[data-two-ways]")?.addEventListener("click", () => {
    s.set("head", second ? 10 : 100);
    s.set("flow", second ? 200 : 20);
    second = !second;
    host.querySelector<HTMLInputElement>('input[name="head"]')?.dispatchEvent(new Event("input"));
  });
  host.querySelector("[data-reset]")?.addEventListener("click", () => {
    second = false;
    s.reset();
  });
}

function mountSettling(host: HTMLElement, hooks: SimHooks): void {
  const specs: SliderSpec[] = [
    { name: "flow", label: "Flow (Q)", min: 10, max: 100, step: 1, value: 40, fmt: (v) => `${v} L/s` },
    { name: "grain", label: "Grain size (d)", min: 0.1, max: 0.5, step: 0.01, value: 0.2, fmt: (v) => `${v.toFixed(2)} mm` },
    { name: "width", label: "Basin width (B)", min: 0.2, max: 1.0, step: 0.05, value: 0.4, fmt: (v) => `${v.toFixed(2)} m` },
  ];
  host.innerHTML =
    head("Size the settling basin", resetBtn) +
    specs.map(sliderHtml).join("") +
    `<div class="outs"><div><small class="h">Settling speed vD</small><div class="v mono" data-out="vd"></div></div>` +
    `<div><small class="h">Minimum length L</small><div class="v mono accent" data-out="length"></div></div></div>` +
    `<div class="warn" data-out="warn" role="alert" hidden></div>` +
    `<div class="formula mono">still-water first estimate (ESHA)</div>`;
  const vdEl = host.querySelector<HTMLElement>('[data-out="vd"]');
  const lenEl = host.querySelector<HTMLElement>('[data-out="length"]');
  const warn = host.querySelector<HTMLElement>('[data-out="warn"]');
  const s = bindSliders(host, specs, () => {
    const q = s.get("flow");
    const b = s.get("width");
    const vd = zankeVdMmS(s.get("grain"));
    const len = trapLengthM(q, vd, b);
    if (vdEl) vdEl.textContent = `${vd.toFixed(1)} mm/s`;
    if (lenEl) lenEl.textContent = `${len.toFixed(2)} m`;
    if (warn) {
      const bad = widthTooLarge(b, len);
      warn.hidden = !bad;
      warn.textContent = bad ? "Warning: B is more than L/8 (ESHA)." : "";
    }
    hooks.setBasin(q, b);
  });
  s.reset();
  host.querySelector("[data-reset]")?.addEventListener("click", () => s.reset());
}

function mountFriction(host: HTMLElement, hooks: SimHooks): void {
  const specs: SliderSpec[] = [
    { name: "flow", label: "Flow (Q)", min: 10, max: 100, step: 1, value: 40, fmt: (v) => `${v} L/s` },
    { name: "diameter", label: "Inside diameter (D)", min: 100, max: 300, step: 10, value: 200, fmt: (v) => `${v} mm` },
    { name: "length", label: "Length (L)", min: 50, max: 500, step: 10, value: 150, fmt: (v) => `${v} m` },
  ];
  host.innerHTML =
    head("Size the penstock", resetBtn) +
    specs.map(sliderHtml).join("") +
    selectHtml("material", "Pipe material", [["pe", "Polyethylene"], ["steel", "Welded steel"]]) +
    `<div class="outs"><div><small class="h">Gross head</small><div class="v mono">${GROSS_HEAD_M} m</div></div>` +
    cell("Speed V", "velocity") + cell("Friction factor f", "f") + cell("Friction loss hf", "loss") +
    cell("Net head", "net", true) + cell("Loss", "pct") + `</div>` +
    `<div class="warn" data-out="warn" data-claims="D6" role="alert" hidden></div>` +
    `<div class="formula mono">Limit: friction only. Rack, entry, bends and valve losses are not counted.</div>`;
  const material = host.querySelector<HTMLSelectElement>('select[name="material"]');
  const update = () => {
    const dMm = s.get("diameter");
    const dM = dMm / 1000;
    const velocity = pipeVelocityMs(s.get("flow"), dMm);
    const f = swameeJainF(ROUGHNESS_MM[material?.value === "steel" ? "steel" : "pe"], dM, reynolds(velocity, dM));
    const hf = frictionLossM(f, s.get("length"), dM, velocity);
    const pct = (hf / GROSS_HEAD_M) * 100;
    setOut(host, "velocity", `${velocity.toFixed(2)} m/s`);
    setOut(host, "f", f.toFixed(4));
    setOut(host, "loss", `${hf.toFixed(2)} m`);
    setOut(host, "net", `${(GROSS_HEAD_M - hf).toFixed(1)} m`);
    setOut(host, "pct", `${pct.toFixed(1)} %`);
    setWarn(host, "Warning: more than 5 % of the head is lost. The usual target is a few percent.", pct > 5);
    hooks.setLoss(hf, GROSS_HEAD_M);
  };
  const s = bindSliders(host, specs, update);
  material?.addEventListener("change", update);
  s.reset();
  host.querySelector("[data-reset]")?.addEventListener("click", () => {
    if (material) material.value = "pe";
    s.reset();
  });
}

function mountHammer(host: HTMLElement, hooks: SimHooks): void {
  const FLOW_LPS = 40;
  const DIAMETER_MM = 200;
  const v0 = pipeVelocityMs(FLOW_LPS, DIAMETER_MM);
  const specs: SliderSpec[] = [
    { name: "time", label: "Closing time (t)", min: 0.1, max: 20, step: 0.1, value: 5, fmt: (v) => `${v.toFixed(1)} s` },
    { name: "length", label: "Length (L)", min: 50, max: 500, step: 10, value: 150, fmt: (v) => `${v} m` },
  ];
  host.innerHTML =
    head("Close the valve", resetBtn) +
    specs.map(sliderHtml).join("") +
    selectHtml("material", "Pipe material", [["steel", "Steel"], ["pvc", "PVC"]]) +
    `<div class="acts"><button type="button" class="act primary" data-run>Close the valve</button></div>` +
    `<div class="outs">` +
    cell("Wave speed c", "c") + cell("Critical time Tc", "tc") + cell("Surge ΔH", "surge") +
    cell("Maximum head", "max", true) + cell("Closing", "mode") + `</div>` +
    `<div class="warn" data-out="warn" data-claims="E8" role="alert" hidden></div>` +
    `<div class="formula mono">Q = ${FLOW_LPS} L/s, D = ${DIAMETER_MM} mm, H₀ = ${GROSS_HEAD_M} m. Limit: no friction, full stop.</div>`;
  const material = host.querySelector<HTMLSelectElement>('select[name="material"]');
  let params: HammerParams = { closeS: 0, h0M: GROSS_HEAD_M, dH: 0 };
  const update = () => {
    const pipe = PIPES[material?.value === "pvc" ? "pvc" : "steel"];
    const length = s.get("length");
    const closeS = s.get("time");
    const c = waveSpeedMs(pipe.e, pipe.dOverT);
    const { dH, sudden } = surgeM(c, length, v0, GROSS_HEAD_M, closeS);
    params = { closeS, h0M: GROSS_HEAD_M, dH };
    setOut(host, "c", `${c.toFixed(1)} m/s`);
    setOut(host, "tc", `${criticalTimeS(length, c).toFixed(2)} s`);
    setOut(host, "surge", `${dH.toFixed(2)} m`);
    setOut(host, "max", `${(GROSS_HEAD_M + dH).toFixed(1)} m`);
    setOut(host, "mode", sudden ? "sudden" : "gradual");
    setWarn(host, "Warning: the surge is more than 30 % of the static head.", dH > 0.3 * GROSS_HEAD_M);
  };
  const s = bindSliders(host, specs, update);
  material?.addEventListener("change", update);
  s.reset();
  const run = host.querySelector<HTMLButtonElement>("[data-run]");
  run?.addEventListener("click", () => {
    run.disabled = true;
    hooks.runHammer(params, () => {
      run.disabled = false;
    });
  });
  host.querySelector("[data-reset]")?.addEventListener("click", () => {
    if (material) material.value = "steel";
    s.reset();
  });
}

function mountJet(host: HTMLElement, hooks: SimHooks): void {
  const specs: SliderSpec[] = [
    { name: "head", label: "Net head (H)", min: 20, max: 200, step: 1, value: 59, fmt: (v) => `${v} m` },
    { name: "opening", label: "Spear opening", min: 10, max: 100, step: 1, value: 100, fmt: (v) => `${v} %` },
  ];
  host.innerHTML =
    head("Open the spear", resetBtn) +
    specs.map(sliderHtml).join("") +
    `<label class="chk h"><input type="checkbox" name="deflector"> Deflector in</label>` +
    `<div class="outs">` +
    cell("Jet speed v", "speed") + cell("Flow Q", "flow") + cell("Power to the runner", "power", true) + `</div>` +
    `<div class="warn" data-out="note" data-claims="F5" role="status" hidden></div>` +
    `<div class="formula mono">Cv = ${CV}, nozzle d₀ = ${NOZZLE_MM} mm, e = 0.6. Limit: area ∝ opening (simplified).</div>`;
  const deflector = host.querySelector<HTMLInputElement>('input[name="deflector"]');
  const note = host.querySelector<HTMLElement>('[data-out="note"]');
  const update = () => {
    const h = s.get("head");
    const opening = s.get("opening") / 100;
    const on = deflector?.checked ?? false;
    const speed = jetSpeedMs(h, CV);
    const flow = jetFlowLps(speed, NOZZLE_MM, opening);
    setOut(host, "speed", `${speed.toFixed(1)} m/s`);
    setOut(host, "flow", `${flow.toFixed(1)} L/s`);
    setOut(host, "power", `${(on ? 0 : powerKW(h, flow, 0.6)).toFixed(1)} kW`);
    if (note) {
      note.hidden = !on;
      note.textContent = on ? "Water still flows: no water hammer." : "";
    }
    hooks.setOpening(opening);
    hooks.setDeflector(on);
  };
  const s = bindSliders(host, specs, update);
  deflector?.addEventListener("change", update);
  s.reset();
  host.querySelector("[data-reset]")?.addEventListener("click", () => {
    if (deflector) deflector.checked = false;
    s.reset();
  });
}

const NET_HEAD_M = 59;

function mountBucket(host: HTMLElement, hooks: SimHooks): void {
  const v1 = jetSpeedMs(NET_HEAD_M, CV);
  const flowLps = jetFlowLps(v1, NOZZLE_MM, 1);
  const specs: SliderSpec[] = [
    { name: "ratio", label: "Bucket speed ÷ jet speed (u / v₁)", min: 0, max: 1, step: 0.01, value: 0.25, fmt: (v) => v.toFixed(2) },
    { name: "angle", label: "Deflection angle (θ)", min: 90, max: 180, step: 1, value: DEFLECTION_DEG, fmt: (v) => `${v}°` },
  ];
  host.innerHTML =
    head("Spin the runner", resetBtn) +
    specs.map(sliderHtml).join("") +
    `<div class="outs">` +
    cell("Bucket speed u", "u") + cell("Hydraulic efficiency", "eta") + cell("Power on the buckets", "power", true) +
    cell("Exit speed v₂", "exit") + `</div>` +
    `<div class="formula mono">v₁ = ${v1.toFixed(1)} m/s, Q = ${flowLps.toFixed(1)} L/s. Limit: ideal bucket, no friction (k = 1).</div>`;
  const update = () => {
    const r = s.get("ratio");
    const theta = s.get("angle");
    const eta = bucketEfficiency(r, theta, K_IDEAL);
    const v2 = exitSpeedMs(v1, r, theta, K_IDEAL);
    setOut(host, "u", `${(r * v1).toFixed(2)} m/s`);
    setOut(host, "eta", `${(eta * 100).toFixed(1)} %`);
    setOut(host, "power", `${(eta * jetPowerKW(flowLps, v1)).toFixed(1)} kW`);
    setOut(host, "exit", `${v2.toFixed(1)} m/s`);
    hooks.setSpin(r);
    hooks.setExit(v2 / v1);
  };
  const s = bindSliders(host, specs, update);
  s.reset();
  host.querySelector("[data-reset]")?.addEventListener("click", () => s.reset());
}

// the efficiency curve of lesson 8: flow 0.1..1 on x, efficiency 0..1 on y
const CURVE = { w: 300, h: 150, left: 36, right: 12, top: 12, bottom: 28 };
const curveX = (q: number) => CURVE.left + ((q - 0.1) / 0.9) * (CURVE.w - CURVE.left - CURVE.right);
const curveY = (eta: number) => CURVE.top + (1 - eta) * (CURVE.h - CURVE.top - CURVE.bottom);

function curveHtml(): string {
  const base = CURVE.h - CURVE.bottom;
  const label = (x: number, y: number, anchor: string, text: string) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
  return (
    `<svg class="curve" data-curve viewBox="0 0 ${CURVE.w} ${CURVE.h}" role="img" aria-label="Efficiency against flow">` +
    `<path class="ax" d="M${CURVE.left} ${CURVE.top} V${base} H${CURVE.w - CURVE.right}"/><path class="line" d=""/>` +
    `<circle data-dot r="4.5" cx="0" cy="0"/>` +
    label(CURVE.left - 5, base + 3, "end", "0") + label(CURVE.left - 5, CURVE.top + 4, "end", "1") +
    label(curveX(0.1), base + 14, "middle", "0.1") + label(curveX(1), base + 14, "middle", "1") +
    label(CURVE.w - CURVE.right, CURVE.h - 3, "end", "Q / Qd") + label(4, CURVE.top + 4, "start", "η") +
    `</svg>`
  );
}

function mountEfficiency(host: HTMLElement, hooks: SimHooks): void {
  const qd = jetFlowLps(jetSpeedMs(NET_HEAD_M, CV), NOZZLE_MM, 1);
  const specs: SliderSpec[] = [
    { name: "flow", label: "Flow (% of design flow)", min: 10, max: 100, step: 1, value: 50, fmt: (v) => `${v} %` },
  ];
  host.innerHTML =
    head("Turn down the flow", resetBtn) +
    specs.map(sliderHtml).join("") +
    selectHtml("jets", "Number of jets", [1, 2, 3, 4, 5, 6].map((j): [string, string] => [String(j), String(j)])) +
    `<div class="outs">` + cell("Efficiency η", "eta", true) + cell("Best efficiency at", "peak") + cell("Shaft power", "power") + `</div>` +
    curveHtml() +
    `<div class="formula mono">RETScreen curve, peak from ESHA; real curves vary by maker</div>`;
  const jetsSel = host.querySelector<HTMLSelectElement>('select[name="jets"]');
  const path = host.querySelector<SVGPathElement>("svg[data-curve] .line");
  const dot = host.querySelector<SVGCircleElement>("svg[data-curve] [data-dot]");
  const update = () => {
    const q = s.get("flow") / 100;
    const jets = Number(jetsSel?.value ?? "1");
    const eta = turbineEfficiency(q, jets);
    setOut(host, "eta", `${(eta * 100).toFixed(1)} %`);
    setOut(host, "peak", `${(peakFlowRatio(jets) * 100).toFixed(1)} %`);
    setOut(host, "power", `${powerKW(NET_HEAD_M, qd * q, eta).toFixed(1)} kW`);
    let d = "";
    for (let i = 0; i <= 45; i++) {
      const x = (10 + 2 * i) / 100;
      d += `${i === 0 ? "M" : "L"}${curveX(x).toFixed(1)} ${curveY(turbineEfficiency(x, jets)).toFixed(1)} `;
    }
    path?.setAttribute("d", d);
    dot?.setAttribute("cx", curveX(q).toFixed(1));
    dot?.setAttribute("cy", curveY(eta).toFixed(1));
    hooks.setJets(jets);
    hooks.setFlow(q);
  };
  const s = bindSliders(host, specs, update);
  jetsSel?.addEventListener("change", update);
  s.reset();
  host.querySelector("[data-reset]")?.addEventListener("click", () => {
    if (jetsSel) jetsSel.value = "1";
    s.reset();
  });
}

const SPEEDS_RPM = [3000, 1500, 1000, 750, 600, 500];

function numberHtml(name: string, label: string, min: number, max: number, step: number, value: number): string {
  return (
    `<div class="sl"><div class="row"><label class="h" for="sim-${name}">${esc(label)}</label></div>` +
    `<input type="number" id="sim-${name}" name="${name}" min="${min}" max="${max}" step="${step}" value="${value}"></div>`
  );
}

function verdictText(fit: Turbine[], jets: number): string {
  if (fit.length === 0) return "No standard runner — try another speed or more jets";
  const names = fit.map((t) => (t === "pelton" ? `Pelton (${jets} jet${jets === 1 ? "" : "s"})` : t === "francis" ? "Francis" : "Kaplan"));
  return names.join(", ");
}

function mountSpecific(host: HTMLElement, hooks: SimHooks): void {
  host.innerHTML =
    head("Pick the turbine", resetBtn) +
    numberHtml("head", "Net head (H), m", 2, 1000, 1, NET_HEAD_M) +
    numberHtml("flow", "Flow (Q), L/s", 10, 50000, 0.1, 41.9) +
    selectHtml("speed", "Generator speed", SPEEDS_RPM.map((r): [string, string] => [String(r), `${r} rpm`])) +
    selectHtml("jets", "Number of Pelton jets", [1, 2, 3, 4].map((j): [string, string] => [String(j), String(j)])) +
    `<div class="outs">` + cell("Specific speed nQE", "nqe") + cell("Runner diameter D1", "d1") +
    `<div class="wide"><small class="h">Fits</small><div class="v mono accent txt" data-out="verdict"></div></div></div>` +
    `<div class="formula mono">First estimate only — makers give the real size.</div>`;
  const headIn = host.querySelector<HTMLInputElement>('input[name="head"]');
  const flowIn = host.querySelector<HTMLInputElement>('input[name="flow"]');
  const speedSel = host.querySelector<HTMLSelectElement>('select[name="speed"]');
  const jetsSel = host.querySelector<HTMLSelectElement>('select[name="jets"]');
  if (!headIn || !flowIn || !speedSel || !jetsSel) return;
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
  const update = () => {
    const h = clamp(Number(headIn.value), 2, 1000);
    const q = clamp(Number(flowIn.value), 10, 50000);
    const rpm = Number(speedSel.value);
    const jets = Number(jetsSel.value);
    const nqe = specificSpeed(rpm, q / 1000, h);
    const fit = fittingTurbines(nqe, h, jets);
    const d1 = fit.includes("pelton") ? peltonDiameterM(h, rpm) : null;
    setOut(host, "nqe", nqe.toFixed(4));
    setOut(host, "d1", d1 === null ? "" : `${d1.toFixed(2)} m`);
    setOut(host, "verdict", verdictText(fit, jets));
    hooks.setPoint(h, nqe);
    hooks.setJets(jets);
    hooks.setRunner(d1);
  };
  const reset = () => {
    headIn.value = String(NET_HEAD_M);
    flowIn.value = "41.9";
    speedSel.value = "750";
    jetsSel.value = "1";
    update();
  };
  for (const input of [headIn, flowIn]) input.addEventListener("input", update);
  for (const sel of [speedSel, jetsSel]) sel.addEventListener("change", update);
  host.querySelector("[data-reset]")?.addEventListener("click", reset);
  reset();
}
