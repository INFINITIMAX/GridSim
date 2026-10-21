import { createSession } from "./game";
import type { ActionResult, GameMode, Session, Snapshot } from "./game";
import { mountScene } from "./scene";
import { mountUi } from "./ui";

/** Largest real time step handed to the session in one frame, seconds. */
const MAX_FRAME_DT = 0.1;

interface GridSimHooks {
  session: Session;
  /** The snapshot of the last frame. It does not consume narrative messages. */
  snapshot(): Snapshot;
  /** Sudden loss of a unit through the real model (used by e2e tests and the sandbox Trip button). */
  forceTrip(id: string): ActionResult;
}

declare global {
  interface Window {
    __gridsim?: GridSimHooks;
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
const uiRoot = document.querySelector<HTMLElement>("#ui");
if (!canvas || !uiRoot) throw new Error("missing #scene canvas or #ui root");

const params = new URLSearchParams(window.location.search);
const initialMode: GameMode = params.get("mode") === "sandbox" ? "sandbox" : "level1";

const scene = mountScene(canvas);
const ui = mountUi({
  root: uiRoot,
  onPadding: (left, right) => scene.setPadding(left, right),
  onRetry: () => startSession(currentMode),
  onOpenSandbox: () => startSession("sandbox"),
  showFps: params.has("fps"),
});

let currentMode: GameMode = initialMode;
let session: Session = createSession(initialMode);
let lastSnapshot: Snapshot | null = null;

function frame(dtSeconds: number): void {
  session.advance(dtSeconds);
  const snapshot = session.snapshot(); // one per frame: messages are consumed here
  lastSnapshot = snapshot;
  scene.update(snapshot, dtSeconds);
  ui.update(snapshot, dtSeconds);
}

function startSession(mode: GameMode): void {
  currentMode = mode;
  session = createSession(mode);
  lastSnapshot = null;
  ui.bind(session, mode);
  window.__gridsim = {
    session,
    snapshot: () => lastSnapshot ?? session.snapshot(),
    forceTrip: (id) => session.tripUnit(id),
  };
  frame(0);
}

function resize(): void {
  scene.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resize);
resize();

startSession(initialMode);

let last: number | null = null;
function loop(timestamp: number): void {
  const dt = last === null ? 0 : Math.min((timestamp - last) / 1000, MAX_FRAME_DT);
  last = timestamp;
  frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
