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
import { isCorrectOrder, PLANT_ORDER } from "./sim/order";
import { powerKW } from "./sim/power";
import { trapLengthM, widthTooLarge, zankeVdMmS } from "./sim/settling";

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
  else mountSettling(host, hooks);
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
