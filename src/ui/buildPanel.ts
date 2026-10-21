// Build panel: cards for the five buildings, budget, start button and the list of existing plants.

import { BUILDS, LEVEL1 } from "../game";
import type { ActionResult, BuildKind, Session, Snapshot } from "../game";
import { buildStartSeconds } from "../game/builds";
import { clear, el, fmt, icon } from "./dom";
import { BUILD_INFO, BUILD_ORDER, UNIT_LABEL } from "./labels";

export interface SidePart {
  element: HTMLElement;
  update(snapshot: Snapshot): void;
}

const STARTING_UNIT_IDS: ReadonlySet<string> = new Set(LEVEL1.units.map((u) => u.id));

/** Runs an action on click and shows a refusal reason inline, next to the control. */
export function bindAction(button: HTMLButtonElement, refusal: HTMLElement, run: () => ActionResult): void {
  button.addEventListener("click", () => {
    const result = run();
    refusal.textContent = result.ok ? "" : result.reason;
  });
}

function sizeText(kind: BuildKind, sandbox: boolean): string {
  const spec = BUILDS[kind];
  const startMinutes = Math.round(buildStartSeconds(kind) / 60);
  const parts = [`${spec.pMaxMW} MW`];
  if (sandbox) {
    parts.push(startMinutes > 0 ? `ready in ${startMinutes} min` : "ready at once");
  } else {
    parts.push(`${spec.cost} pts`);
  }
  return parts.join(" / ");
}

function buildCard(kind: BuildKind, sandbox: boolean, getSession: () => Session): HTMLElement {
  const refusal = el("p", { class: "refusal", "aria-live": "polite" });
  const button = el("button", { type: "button", class: "btn btn-secondary", "data-testid": `build-${kind}` }, [
    `Build ${UNIT_LABEL[kind].toLowerCase()}`,
  ]);
  bindAction(button, refusal, () => getSession().build(kind));
  const info = BUILD_INFO[kind];
  return el("article", { class: "card" }, [
    el("div", { class: "card-head" }, [
      icon(info.icon),
      el("h3", { class: "card-title" }, [UNIT_LABEL[kind]]),
      el("span", { class: "num card-meta" }, [sizeText(kind, sandbox)]),
    ]),
    el("p", { class: "card-text" }, [info.text]),
    button,
    refusal,
  ]);
}

export function createBuildPanel(getSession: () => Session): SidePart {
  const budget = el("p", { class: "budget", "data-testid": "budget" });
  const cards = el("div", { class: "cards" });
  const plantsTitle = el("h2", { class: "section-title" }, ["On the island"]);
  const plants = el("ul", { class: "rows" });
  const startRefusal = el("p", { class: "refusal", "aria-live": "polite" });
  const startButton = el("button", { type: "button", class: "btn btn-primary", "data-testid": "start-button" }, [
    icon("play"),
    "Start the day",
  ]);
  bindAction(startButton, startRefusal, () => getSession().start());
  const startBox = el("div", { class: "start-box" }, [startButton, startRefusal]);

  const buildTitle = el("h2", { class: "section-title" }, ["Build"]);
  const element = el("div", { class: "build-panel", "data-testid": "build-panel" }, [
    buildTitle,
    budget,
    cards,
    plantsTitle,
    plants,
    startBox,
  ]);

  let cardsKey = "";
  let plantsKey = "";
  let powerCells = new Map<string, HTMLElement>();

  function renderPlants(snapshot: Snapshot, canDemolish: boolean): void {
    clear(plants);
    powerCells = new Map();
    for (const unit of snapshot.units) {
      const power = el("span", { class: "num" }, [""]);
      powerCells.set(unit.id, power);
      const label = el("span", { class: "row-label" }, [UNIT_LABEL[unit.kind]]);
      if (!unit.online) {
        label.append(el("span", { class: "tag-off" }, ["offline"]));
      }
      const row = el("li", { class: "row" }, [label, el("span", {}, [power, ` / ${fmt(unit.pMax, 0)} MW`])]);
      const demolishable = snapshot.mode === "sandbox" || !STARTING_UNIT_IDS.has(unit.id);
      if (canDemolish && demolishable) {
        const refusal = el("p", { class: "refusal", "aria-live": "polite" });
        const button = el("button", {
          type: "button",
          class: "btn btn-icon",
          "aria-label": `Demolish ${UNIT_LABEL[unit.kind].toLowerCase()}`,
          title: "Demolish",
        }, [icon("trash")]);
        bindAction(button, refusal, () => getSession().demolish(unit.id));
        row.append(button, refusal);
      }
      plants.append(row);
    }
  }

  function update(snapshot: Snapshot): void {
    const sandbox = snapshot.mode === "sandbox";
    const preparing = snapshot.state === "prepare";
    const showCards = preparing || sandbox;

    buildTitle.hidden = !showCards;
    cards.hidden = !showCards;
    startBox.hidden = !preparing;
    budget.hidden = snapshot.budget === null;
    if (snapshot.budget !== null) {
      budget.textContent = `Budget left: ${fmt(snapshot.budget, 0)} pts`;
    }

    const nextCardsKey = `${snapshot.mode}`;
    if (nextCardsKey !== cardsKey) {
      cardsKey = nextCardsKey;
      clear(cards);
      for (const kind of BUILD_ORDER) {
        cards.append(buildCard(kind, sandbox, getSession));
      }
    }

    const canDemolish = preparing || sandbox;
    const nextPlantsKey = [
      snapshot.mode,
      canDemolish,
      ...snapshot.units.map((u) => `${u.id}:${u.online}`),
    ].join("|");
    if (nextPlantsKey !== plantsKey) {
      plantsKey = nextPlantsKey;
      renderPlants(snapshot, canDemolish);
    }
    for (const unit of snapshot.units) {
      const cell = powerCells.get(unit.id);
      if (cell) {
        cell.textContent = fmt(unit.p, 0);
      }
    }
  }

  return { element, update };
}
