// GridSim map page: the Colorfigures map (map/scene.js) with the 2D game's plant panel.
// Click the plant: the camera eases in on it, as in the 2D game, and the panel opens. Escape or a click on the map: back out.

import { stepClog, type DamHeight } from "../2d/hydro";
import { createPanel } from "../2d/panel";

interface GridMapApi {
  mount(hooks: { onPlant(): void; onMap(): void }): unknown;
  focus(on: boolean, panelPx: number): void;
}
const GridMap = (window as unknown as { GridMap: GridMapApi }).GridMap;

/** Meadow tiles the 8 m lake floods, shown in the panel; the map draws the flooding in a later step. */
const FLOODED_TILES: Record<DamHeight, number> = { 3: 0, 5: 0, 8: 6 };

const root = document.createElement("aside");
root.className = "upgrade";
root.setAttribute("aria-label", "Hydro plant upgrade");

let clog = 0;
const panel = createPanel(root, {
  onChange() {},
  onClose: closePlant,
  onCleanNow() {
    clog = 0;
  },
  floodedTiles: (height) => FLOODED_TILES[height],
});

GridMap.mount({ onPlant: openPlant, onMap: closePlant });
// The engine rebuilt the page body; the panel goes in after it.
document.body.append(root);

function openPlant(): void {
  if (panel.isOpen()) return;
  panel.setOpen(true);
  GridMap.focus(true, root.getBoundingClientRect().width);
}

function closePlant(): void {
  if (!panel.isOpen()) return;
  panel.setOpen(false);
  GridMap.focus(false, root.getBoundingClientRect().width);
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePlant();
});

// The intake rack keeps clogging, as in the 2D game.
let last = performance.now();
function tick(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  clog = stepClog(clog, panel.state.riverFlow, panel.state.setup.autoCleaner, dt);
  panel.setClog(clog);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
