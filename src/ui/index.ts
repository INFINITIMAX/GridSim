// Interface entry point: builds the DOM over the canvas and updates it from snapshots.

import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./tokens.css";
import "./ui.css";

import type { GameMode, Session, Snapshot } from "../game";
import { createBuildPanel } from "./buildPanel";
import type { SidePart } from "./buildPanel";
import { el } from "./dom";
import { createHowReal } from "./howReal";
import { createHud } from "./hud";
import { createResultScreen } from "./result";
import { createSandboxPanel } from "./sandbox";

/** Space kept free next to the side column, in px, so the scene is not hidden under it. */
const SIDE_GAP_PX = 24;
const FPS_WINDOW_S = 0.5;

export interface UiOptions {
  root: HTMLElement;
  onPadding(left: number, right: number): void;
  onRetry(): void;
  onOpenSandbox(): void;
  showFps: boolean;
}

export interface Ui {
  /** Connects the interface to a (new) session and clears everything tied to the old one. */
  bind(session: Session, mode: GameMode): void;
  update(snapshot: Snapshot, dtSeconds: number): void;
}

export function mountUi(options: UiOptions): Ui {
  const howReal = createHowReal();
  const hud = createHud(() => howReal.open());
  const result = createResultScreen(options.onRetry, options.onOpenSandbox);
  const side = el("aside", { class: "side panel", "aria-label": "Build and controls", "data-testid": "side" });
  const fps = el("div", { class: "fps num", "data-testid": "fps", hidden: "" });

  options.root.append(hud.element, side, result.element, howReal.element, fps);

  let session: Session | null = null;
  let parts: SidePart[] = [];
  let resultShown = false;
  let fpsTime = 0;
  let fpsFrames = 0;

  function getSession(): Session {
    if (!session) {
      throw new Error("interface used before bind()");
    }
    return session;
  }

  function reportPadding(): void {
    options.onPadding(hud.element.getBoundingClientRect().right + SIDE_GAP_PX, side.getBoundingClientRect().width + SIDE_GAP_PX);
  }
  const padObserver = new ResizeObserver(reportPadding);
  padObserver.observe(side);
  padObserver.observe(hud.element);
  reportPadding();

  function bind(next: Session, mode: GameMode): void {
    session = next;
    resultShown = false;
    result.hide();
    howReal.close();
    hud.reset();
    parts = mode === "sandbox" ? [createSandboxPanel(getSession), createBuildPanel(getSession)] : [createBuildPanel(getSession)];
    side.replaceChildren(...parts.map((p) => p.element));
  }

  function update(snapshot: Snapshot, dtSeconds: number): void {
    hud.update(snapshot, dtSeconds);
    for (const part of parts) {
      part.update(snapshot);
    }
    if (!resultShown && (snapshot.state === "won" || snapshot.state === "lost")) {
      const outcome = getSession().result();
      if (outcome) {
        resultShown = true;
        result.show(outcome);
      }
    }
    if (options.showFps) {
      fpsTime += dtSeconds;
      fpsFrames += 1;
      if (fpsTime >= FPS_WINDOW_S) {
        fps.hidden = false;
        fps.textContent = `${Math.round(fpsFrames / fpsTime)} fps`;
        fpsTime = 0;
        fpsFrames = 0;
      }
    }
  }

  return { bind, update };
}
