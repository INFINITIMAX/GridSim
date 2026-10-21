// "How real is this?" panel: the simplifications of the model, stated plainly, with sources.

import { el, icon } from "./dom";

interface Source {
  name: string;
  text: string;
  url: string;
}

const SOURCES: readonly Source[] = [
  {
    name: "SO GL",
    text: "System Operation Guideline, Regulation (EU) 2017/1485",
    url: "https://eur-lex.europa.eu/eli/reg/2017/1485/oj",
  },
  {
    name: "NC ER",
    text: "Emergency and Restoration, Regulation (EU) 2017/2196",
    url: "https://eur-lex.europa.eu/eli/reg/2017/2196/oj",
  },
  {
    name: "RfG",
    text: "Requirements for Generators, Regulation (EU) 2016/631",
    url: "https://eur-lex.europa.eu/eli/reg/2016/631/oj",
  },
  {
    name: "NESO DC",
    text: "Dynamic Containment, fast frequency response in Great Britain",
    url: "https://www.neso.energy/industry-information/balancing-services/frequency-response-services/dynamic-containment",
  },
];

const POINTS: ReadonlyArray<{ title: string; text: string }> = [
  {
    title: "An island, not the European grid",
    text:
      "The game grid is a small island on its own, so one lost plant is a big shock. " +
      "Romania is synchronised with continental Europe, where real deviations are only a few hundredths of a hertz.",
  },
  {
    title: "Inverters follow the grid",
    text:
      "Solar, wind and batteries are modelled as grid-following inverters. They add no inertia of their own. " +
      "Newer grid-forming inverters can behave differently and are not modelled.",
  },
  {
    title: "One node",
    text: "The whole island is a single point. There are no line limits, congestion or voltage problems.",
  },
  {
    title: "Game assumptions",
    text:
      "Building sizes, costs, the town's demand and the storm are game values, not measurements. " +
      "Hydro stays above 20% output, a battery delivers its full reserve in 1 s, and the load drops by 1% per hertz of deviation. " +
      "These choices are listed in docs/calcule.md in the project repository.",
  },
];

export interface HowReal {
  element: HTMLElement;
  open(): void;
  close(): void;
}

export function createHowReal(): HowReal {
  const closeButton = el("button", { type: "button", class: "btn btn-icon", "aria-label": "Close", "data-testid": "how-real-close" }, [
    icon("close"),
  ]);
  const body = el("div", { class: "howreal-body" }, [
    ...POINTS.map((p) => el("section", {}, [el("h3", { class: "howreal-heading" }, [p.title]), el("p", {}, [p.text])])),
    el("section", {}, [
      el("h3", { class: "howreal-heading" }, ["Sources"]),
      el(
        "ul",
        { class: "sources" },
        SOURCES.map((s) =>
          el("li", {}, [
            el("a", { href: s.url, target: "_blank", rel: "noopener noreferrer" }, [s.name]),
            ` ${s.text}`,
          ]),
        ),
      ),
    ]),
  ]);
  const card = el(
    "div",
    { class: "panel howreal-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "howreal-title" },
    [
      el("div", { class: "howreal-head" }, [el("h2", { id: "howreal-title", class: "result-title" }, ["How real is this?"]), closeButton]),
      body,
    ],
  );
  const element = el("div", { class: "overlay", "data-testid": "how-real-panel", hidden: "" }, [card]);
  let opener: Element | null = null;

  function close(): void {
    if (element.hidden) {
      return;
    }
    element.hidden = true;
    if (opener instanceof HTMLElement) {
      opener.focus();
    }
  }

  function open(): void {
    opener = document.activeElement;
    element.hidden = false;
    closeButton.focus();
  }

  closeButton.addEventListener("click", close);
  element.addEventListener("click", (event) => {
    if (event.target === element) {
      close();
    }
  });
  element.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
    } else if (event.key === "Tab") {
      // Keep focus inside the dialog.
      const focusable = Array.from(element.querySelectorAll<HTMLElement>("a[href], button"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first && last) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  });

  return { element, open, close };
}
