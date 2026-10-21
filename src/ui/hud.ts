// Left column of the HUD: title, dial, production and consumption, reserves, messages, chart.

import type { NarrativeMessage, Snapshot } from "../game";
import { createChart } from "./chart";
import { createDial } from "./dial";
import { el, fmt, icon } from "./dom";

/** A message stays on screen at least this long before the next one replaces it. */
const MESSAGE_MIN_S = 6;
/** After this long a message fades from view once the day is running. */
const MESSAGE_MAX_S = 14;
/** The screen reader summary is refreshed at most this often. */
const LIVE_EVERY_S = 5;

export interface Hud {
  element: HTMLElement;
  update(snapshot: Snapshot, dtSeconds: number): void;
  reset(): void;
}

interface Readout {
  box: HTMLElement;
  value: HTMLElement;
}

function readout(label: string, testId?: string): Readout {
  const value = el("span", { class: "num readout-value" }, ["0"]);
  if (testId) {
    value.setAttribute("data-testid", testId);
  }
  const box = el("div", { class: "readout" }, [
    el("span", { class: "readout-label" }, [label]),
    el("span", {}, [value, el("span", { class: "readout-unit" }, [" MW"])]),
  ]);
  return { box, value };
}

export function createHud(onOpenHowReal: () => void): Hud {
  const dial = createDial();
  const chart = createChart();

  const howButton = el(
    "button",
    { type: "button", class: "btn btn-ghost", "data-testid": "how-real-button", "aria-haspopup": "dialog" },
    [icon("info"), "How real is this?"],
  );
  howButton.addEventListener("click", onOpenHowReal);

  const production = readout("Production", "production");
  const consumption = readout("Consumption", "consumption");
  const gap = readout("Gap", "gap");
  gap.box.classList.add("readout-key");

  const fcr = el("span", { class: "num" }, ["0"]);
  const afrr = el("span", { class: "num" }, ["0"]);
  const reserves = el("div", { class: "reserves" }, [
    el("span", { class: "readout-label" }, ["Reserves now"]),
    el("span", {}, ["FCR ", fcr, " MW"]),
    el("span", {}, ["aFRR ", afrr, " MW"]),
  ]);

  const message = el("p", { class: "message", "data-testid": "message", hidden: "" });
  const live = el("div", { class: "visually-hidden", "aria-live": "polite", "aria-atomic": "true" });

  const element = el("section", { class: "hud", "aria-label": "Grid status" }, [
    el("div", { class: "topbar" }, [el("h1", { class: "title" }, ["GridSim"]), howButton]),
    el("div", { class: "panel hud-card" }, [
      dial.element,
      el("div", { class: "readouts" }, [production.box, consumption.box, gap.box]),
      reserves,
    ]),
    message,
    chart.element,
    live,
  ]);
  chart.element.classList.add("panel");

  let queue: string[] = [];
  let currentAge = Number.POSITIVE_INFINITY;
  let hasCurrent = false;
  let sinceLive = LIVE_EVERY_S;

  function showNext(): void {
    const next = queue.shift();
    if (next === undefined) {
      return;
    }
    message.textContent = next;
    message.hidden = false;
    currentAge = 0;
    hasCurrent = true;
  }

  function enqueue(messages: readonly NarrativeMessage[]): void {
    queue.push(...messages.map((m) => m.text));
  }

  function update(snapshot: Snapshot, dt: number): void {
    dial.update(snapshot.f, dt);
    chart.push(snapshot.t, snapshot.f);

    const sign = snapshot.pGen - snapshot.pLoad;
    production.value.textContent = fmt(snapshot.pGen, 0);
    consumption.value.textContent = fmt(snapshot.pLoad, 0);
    gap.value.textContent = `${sign >= 0 ? "+" : "-"}${fmt(Math.abs(sign), 0)}`;
    gap.box.classList.toggle("is-danger", Math.abs(sign) > 50);

    let fcrNow = 0;
    let afrrNow = 0;
    for (const unit of snapshot.units) {
      if (unit.online) {
        fcrNow += unit.fcr;
        afrrNow += unit.afrr;
      }
    }
    fcr.textContent = fmt(fcrNow, 0);
    afrr.textContent = fmt(afrrNow, 0);

    enqueue(snapshot.newMessages);
    currentAge += dt;
    if (queue.length > 0 && (!hasCurrent || currentAge >= MESSAGE_MIN_S)) {
      showNext();
    } else if (hasCurrent && queue.length === 0 && snapshot.state === "running" && currentAge >= MESSAGE_MAX_S) {
      message.hidden = true;
      hasCurrent = false;
    }

    sinceLive += dt;
    if (sinceLive >= LIVE_EVERY_S) {
      sinceLive = 0;
      live.textContent =
        `Frequency ${fmt(snapshot.f, 2)} hertz. Production ${fmt(snapshot.pGen, 0)} megawatts. ` +
        `Consumption ${fmt(snapshot.pLoad, 0)} megawatts.`;
    }
  }

  function reset(): void {
    queue = [];
    hasCurrent = false;
    currentAge = Number.POSITIVE_INFINITY;
    message.hidden = true;
    message.textContent = "";
    chart.reset();
    sinceLive = LIVE_EVERY_S;
  }

  return { element, update, reset };
}
