// Small DOM helpers shared by the interface modules.

import star from "@phosphor-icons/core/assets/bold/star-bold.svg?raw";
import starFill from "@phosphor-icons/core/assets/fill/star-fill.svg?raw";
import battery from "@phosphor-icons/core/assets/bold/battery-charging-bold.svg?raw";
import flame from "@phosphor-icons/core/assets/bold/flame-bold.svg?raw";
import drop from "@phosphor-icons/core/assets/bold/drop-bold.svg?raw";
import sun from "@phosphor-icons/core/assets/bold/sun-bold.svg?raw";
import wind from "@phosphor-icons/core/assets/bold/wind-bold.svg?raw";
import info from "@phosphor-icons/core/assets/bold/info-bold.svg?raw";
import trash from "@phosphor-icons/core/assets/bold/trash-bold.svg?raw";
import close from "@phosphor-icons/core/assets/bold/x-bold.svg?raw";
import play from "@phosphor-icons/core/assets/bold/play-bold.svg?raw";
import plug from "@phosphor-icons/core/assets/bold/plug-bold.svg?raw";
import redo from "@phosphor-icons/core/assets/bold/arrow-counter-clockwise-bold.svg?raw";

export const ICONS = {
  star,
  starFill,
  battery,
  flame,
  drop,
  sun,
  wind,
  info,
  trash,
  close,
  play,
  plug,
  redo,
} as const;

export type IconName = keyof typeof ICONS;

type Attrs = Record<string, string>;

/** Creates an element with attributes, class names and children. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: ReadonlyArray<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

/** Returns a span holding the inline SVG of a Phosphor icon (decorative). */
export function icon(name: IconName): HTMLSpanElement {
  const span = el("span", { class: "icon", "aria-hidden": "true" });
  span.innerHTML = ICONS[name];
  return span;
}

/** Removes all children of a node. */
export function clear(node: Element): void {
  node.replaceChildren();
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Formats a number with fixed decimals (never uses a locale separator). */
export function fmt(value: number, decimals: number): string {
  return value.toFixed(decimals);
}
