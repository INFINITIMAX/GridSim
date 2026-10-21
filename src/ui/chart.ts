// Frequency chart for the last 60 s of simulated time. One line, two thin reference lines.

import { el } from "./dom";

const WINDOW_S = 60;
const MIN_HZ = 48.5;
const MAX_HZ = 50.5;
const SAMPLE_EVERY_S = 0.25;
const PAD = { left: 40, right: 8, top: 8, bottom: 8 };

interface Sample {
  t: number;
  f: number;
}

export interface FrequencyChart {
  element: HTMLElement;
  /** Adds a sample when enough simulated time has passed, then redraws if needed. */
  push(t: number, f: number): void;
  reset(): void;
}

export function createChart(): FrequencyChart {
  const canvas = el("canvas", { "data-testid": "chart", "aria-label": "Frequency over the last 60 seconds", role: "img" });
  const root = el("div", { class: "chart" }, [
    el("div", { class: "chart-title" }, ["Last 60 s"]),
    canvas,
  ]);
  const context = canvas.getContext("2d");
  let samples: Sample[] = [];
  let dirty = true;
  let width = 0;
  let height = 0;

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio, 2);
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    dirty = true;
    draw();
  }
  new ResizeObserver(resize).observe(canvas);

  function yFor(f: number): number {
    const clamped = Math.min(MAX_HZ, Math.max(MIN_HZ, f));
    const fraction = (clamped - MIN_HZ) / (MAX_HZ - MIN_HZ);
    return PAD.top + (1 - fraction) * (height - PAD.top - PAD.bottom);
  }

  function draw(): void {
    if (!context || !dirty || width === 0) {
      return;
    }
    dirty = false;
    const style = getComputedStyle(root);
    const ink = style.getPropertyValue("--c-ink").trim();
    const muted = style.getPropertyValue("--c-ink-muted").trim();
    const danger = style.getPropertyValue("--c-danger").trim();
    const mono = style.getPropertyValue("--font-mono").trim();

    context.clearRect(0, 0, width, height);
    context.font = `11px ${mono}`;
    context.textBaseline = "middle";

    const reference = (f: number, color: string, label: string): void => {
      const y = yFor(f);
      context.strokeStyle = color;
      context.lineWidth = 1;
      context.setLineDash([3, 3]);
      context.beginPath();
      context.moveTo(PAD.left, y);
      context.lineTo(width - PAD.right, y);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = color;
      context.textAlign = "right";
      context.fillText(label, PAD.left - 6, y);
    };
    reference(50, muted, "50.0");
    reference(49, danger, "49.0");

    const last = samples[samples.length - 1];
    if (!last) {
      return;
    }
    const start = last.t - WINDOW_S;
    const plotWidth = width - PAD.left - PAD.right;
    context.strokeStyle = ink;
    context.lineWidth = 2;
    context.lineJoin = "round";
    context.beginPath();
    let first = true;
    for (const sample of samples) {
      const x = PAD.left + ((sample.t - start) / WINDOW_S) * plotWidth;
      const y = yFor(sample.f);
      if (first) {
        context.moveTo(x, y);
        first = false;
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();
  }

  function push(t: number, f: number): void {
    const last = samples[samples.length - 1];
    if (last && t < last.t) {
      samples = [];
    }
    const tail = samples[samples.length - 1];
    if (tail && t - tail.t < SAMPLE_EVERY_S) {
      return;
    }
    samples.push({ t, f });
    while (samples.length > 0 && t - (samples[0]?.t ?? t) > WINDOW_S + SAMPLE_EVERY_S) {
      samples.shift();
    }
    dirty = true;
    draw();
  }

  function reset(): void {
    samples = [];
    dirty = true;
    draw();
  }

  return { element: root, push, reset };
}
