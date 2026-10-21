// Result screen shown when the day is won or lost.

import type { GameResult } from "../game";
import { clear, el, fmt, icon } from "./dom";

export interface ResultScreen {
  element: HTMLElement;
  show(result: GameResult): void;
  hide(): void;
}

export function createResultScreen(onRetry: () => void, onSandbox: () => void): ResultScreen {
  const title = el("h2", { class: "result-title", id: "result-title" });
  const stars = el("div", { class: "stars", role: "img" });
  const reason = el("p", { class: "result-reason" });
  const nadir = el("span", { class: "num figure-value" });
  const shed = el("span", { class: "num figure-value" });

  const retry = el("button", { type: "button", class: "btn btn-primary", "data-testid": "try-again" }, [
    icon("redo"),
    "Try again",
  ]);
  const sandbox = el("button", { type: "button", class: "btn btn-secondary", "data-testid": "open-sandbox" }, [
    "Open sandbox",
  ]);
  retry.addEventListener("click", onRetry);
  sandbox.addEventListener("click", onSandbox);

  const card = el(
    "div",
    { class: "panel result-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "result-title" },
    [
      title,
      stars,
      reason,
      el("dl", { class: "figures" }, [
        el("div", {}, [el("dt", {}, ["Lowest frequency"]), el("dd", {}, [nadir])]),
        el("div", {}, [el("dt", {}, ["Most city cut off"]), el("dd", {}, [shed])]),
      ]),
      el("div", { class: "actions" }, [retry, sandbox]),
    ],
  );
  const element = el("div", { class: "overlay", "data-testid": "result", hidden: "" }, [card]);

  function show(result: GameResult): void {
    title.textContent = result.stars === 0 ? "Blackout" : "The lights stayed on";
    stars.setAttribute("aria-label", `${result.stars} of 3 stars`);
    clear(stars);
    for (let i = 0; i < 3; i += 1) {
      const star = icon(i < result.stars ? "starFill" : "star");
      star.classList.add(i < result.stars ? "star-earned" : "star-empty");
      stars.append(star);
    }
    reason.textContent = result.reason;
    nadir.textContent = `${fmt(result.nadirHz, 2)} Hz`;
    shed.textContent = `${fmt(result.maxShedFraction * 100, 0)}%`;
    element.hidden = false;
    retry.focus();
  }

  function hide(): void {
    element.hidden = true;
  }

  return { element, show, hide };
}
