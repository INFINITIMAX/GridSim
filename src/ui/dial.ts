// Frequency dial: an arc instrument drawn from code. Range 48.5 to 51.0 Hz so the
// danger zone below 49.0 Hz (first UFLS stage) is visible.

import { el, fmt, prefersReducedMotion } from "./dom";

const SVG_NS = "http://www.w3.org/2000/svg";
const MIN_HZ = 48.5;
const MAX_HZ = 51.0;
const CX = 110;
const CY = 105;
const RADIUS = 86;
const ARC_WIDTH = 10;
const NEEDLE_LENGTH = 70;
/** Easing rate of the needle, 1/s. */
const NEEDLE_RATE = 10;

interface Zone {
  from: number;
  to: number;
  className: string;
}

const ZONES: readonly Zone[] = [
  { from: MIN_HZ, to: 49.0, className: "zone-danger" },
  { from: 49.0, to: 49.8, className: "zone-caution" },
  { from: 49.8, to: 50.2, className: "zone-normal" },
  { from: 50.2, to: MAX_HZ, className: "zone-caution" },
];

const TICKS: readonly number[] = [49, 50, 51];

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

function clampHz(f: number): number {
  return Math.min(MAX_HZ, Math.max(MIN_HZ, f));
}

/** Point on a circle of the given radius for a frequency. */
function point(f: number, radius: number): { x: number; y: number } {
  const fraction = (clampHz(f) - MIN_HZ) / (MAX_HZ - MIN_HZ);
  const theta = Math.PI * (1 - fraction);
  return { x: CX + radius * Math.cos(theta), y: CY - radius * Math.sin(theta) };
}

function arcPath(from: number, to: number, radius: number): string {
  const a = point(from, radius);
  const b = point(to, radius);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export interface Dial {
  element: HTMLElement;
  /** Moves the needle toward `hz`; `dt` is real seconds since the last call. */
  update(hz: number, dt: number): void;
}

export function createDial(): Dial {
  const root = el("div", { class: "dial", "data-testid": "dial" });
  const graphic = svg("svg", {
    viewBox: "0 0 220 128",
    role: "img",
    "aria-label": "Grid frequency dial from 48.5 to 51 hertz",
  });

  for (const zone of ZONES) {
    graphic.append(
      svg("path", {
        d: arcPath(zone.from, zone.to, RADIUS),
        class: `zone ${zone.className}`,
        "stroke-width": String(ARC_WIDTH),
        fill: "none",
      }),
    );
  }

  for (const tick of TICKS) {
    const inner = point(tick, RADIUS - ARC_WIDTH);
    const outer = point(tick, RADIUS + ARC_WIDTH / 2);
    const label = point(tick, RADIUS - ARC_WIDTH - 10);
    graphic.append(
      svg("line", {
        x1: inner.x.toFixed(2),
        y1: inner.y.toFixed(2),
        x2: outer.x.toFixed(2),
        y2: outer.y.toFixed(2),
        class: "dial-tick",
      }),
    );
    const text = svg("text", {
      x: label.x.toFixed(2),
      y: (label.y + 4).toFixed(2),
      class: "dial-label",
      "text-anchor": "middle",
    });
    text.textContent = String(tick);
    graphic.append(text);
  }

  const needle = svg("line", { x1: String(CX), y1: String(CY), class: "dial-needle" });
  graphic.append(needle, svg("circle", { cx: String(CX), cy: String(CY), r: "5", class: "dial-hub" }));

  const value = el("div", { class: "dial-value num", "data-testid": "dial-value" });
  root.append(graphic, value);

  let shown = 50;
  let lastText = "";

  function placeNeedle(): void {
    const tip = point(shown, NEEDLE_LENGTH);
    needle.setAttribute("x2", tip.x.toFixed(2));
    needle.setAttribute("y2", tip.y.toFixed(2));
  }
  placeNeedle();

  function update(hz: number, dt: number): void {
    const target = clampHz(hz);
    if (prefersReducedMotion()) {
      shown = target;
    } else {
      shown += (target - shown) * (1 - Math.exp(-NEEDLE_RATE * dt));
    }
    placeNeedle();
    const text = `${fmt(hz, 2)} Hz`;
    if (text !== lastText) {
      value.textContent = text;
      lastText = text;
    }
    root.classList.toggle("is-danger", hz < 49.0);
  }

  return { element: root, update };
}
