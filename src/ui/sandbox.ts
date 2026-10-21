// Sandbox controls: speed, reconnect load, consumers and builds in progress.

import { CONSUMER_KINDS } from "../game";
import type { Session, Snapshot, Speed } from "../game";
import { LOAD_CATALOG } from "../model";
import { bindAction } from "./buildPanel";
import type { SidePart } from "./buildPanel";
import { clear, el, fmt, icon } from "./dom";
import { LOAD_LABEL, UNIT_LABEL } from "./labels";

const SPEEDS: readonly Speed[] = [1, 2, 4];

function formatRemaining(seconds: number): string {
  const whole = Math.ceil(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function createSandboxPanel(getSession: () => Session): SidePart {
  const speedRefusal = el("p", { class: "refusal", "aria-live": "polite" });
  const speedButtons = SPEEDS.map((speed) => {
    const button = el("button", { type: "button", class: "btn btn-secondary", "data-testid": `speed-${speed}` }, [
      `${speed}x`,
    ]);
    bindAction(button, speedRefusal, () => getSession().setSpeed(speed));
    return { speed, button };
  });
  const speedGroup = el("div", { class: "btn-group", role: "group", "aria-label": "Simulation speed" }, speedButtons.map((s) => s.button));

  const reconnectRefusal = el("p", { class: "refusal", "aria-live": "polite" });
  const reconnect = el("button", { type: "button", class: "btn btn-secondary", "data-testid": "reconnect-load" }, [
    icon("plug"),
    "Reconnect load",
  ]);
  bindAction(reconnect, reconnectRefusal, () => getSession().restoreLoad());

  const addRefusal = el("p", { class: "refusal", "aria-live": "polite" });
  const addButtons = CONSUMER_KINDS.map((kind) => {
    const button = el("button", { type: "button", class: "btn btn-secondary", "data-testid": `add-${kind}` }, [
      `Add ${LOAD_LABEL[kind].toLowerCase()} `,
      el("span", { class: "num" }, [`${LOAD_CATALOG[kind].typicalMW} MW`]),
    ]);
    bindAction(button, addRefusal, () => getSession().addConsumer(kind));
    return button;
  });

  const consumers = el("ul", { class: "rows" });
  const pending = el("ul", { class: "rows", "data-testid": "pending-builds" });
  const pendingTitle = el("h2", { class: "section-title" }, ["Under construction"]);

  const element = el("div", { class: "sandbox-panel", "data-testid": "sandbox-panel" }, [
    el("h2", { class: "section-title" }, ["Speed"]),
    speedGroup,
    speedRefusal,
    el("h2", { class: "section-title" }, ["Load"]),
    reconnect,
    reconnectRefusal,
    el("h2", { class: "section-title" }, ["Consumers"]),
    el("div", { class: "stack" }, addButtons),
    addRefusal,
    consumers,
    pendingTitle,
    pending,
  ]);

  let consumersKey = "";
  let pendingKey = "";
  let timeCells = new Map<string, HTMLElement>();

  function update(snapshot: Snapshot): void {
    for (const { speed, button } of speedButtons) {
      button.setAttribute("aria-pressed", String(snapshot.speed === speed));
    }

    const nextConsumersKey = snapshot.consumers.map((c) => c.id).join("|");
    if (nextConsumersKey !== consumersKey) {
      consumersKey = nextConsumersKey;
      clear(consumers);
      for (const consumer of snapshot.consumers) {
        const refusal = el("p", { class: "refusal", "aria-live": "polite" });
        const button = el("button", {
          type: "button",
          class: "btn btn-icon",
          "aria-label": `Remove ${LOAD_LABEL[consumer.kind].toLowerCase()}`,
          title: "Remove",
        }, [icon("trash")]);
        bindAction(button, refusal, () => getSession().removeConsumer(consumer.id));
        consumers.append(
          el("li", { class: "row" }, [
            el("span", { class: "row-label" }, [LOAD_LABEL[consumer.kind]]),
            el("span", { class: "num" }, [`${fmt(consumer.mw, 0)} MW`]),
            button,
            refusal,
          ]),
        );
      }
    }

    pendingTitle.hidden = snapshot.pendingBuilds.length === 0;
    const nextPendingKey = snapshot.pendingBuilds.map((p) => p.id).join("|");
    if (nextPendingKey !== pendingKey) {
      pendingKey = nextPendingKey;
      clear(pending);
      timeCells = new Map();
      for (const build of snapshot.pendingBuilds) {
        const time = el("span", { class: "num" }, [""]);
        timeCells.set(build.id, time);
        const refusal = el("p", { class: "refusal", "aria-live": "polite" });
        const button = el("button", {
          type: "button",
          class: "btn btn-icon",
          "aria-label": `Cancel ${UNIT_LABEL[build.kind].toLowerCase()}`,
          title: "Cancel",
        }, [icon("close")]);
        bindAction(button, refusal, () => getSession().demolish(build.id));
        pending.append(
          el("li", { class: "row" }, [
            el("span", { class: "row-label" }, [UNIT_LABEL[build.kind]]),
            time,
            button,
            refusal,
          ]),
        );
      }
    }
    for (const build of snapshot.pendingBuilds) {
      const cell = timeCells.get(build.id);
      if (cell) {
        cell.textContent = formatRemaining(build.remainingS);
      }
    }
  }

  return { element, update };
}
