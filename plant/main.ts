// GridSim plant page: our hydro plant drawn in the Anatomy style, driven by the same panel and model as the 2D game.
// The figure's scenes are prebuilt by plant/build-figure.mjs; this page shows the one that matches the setup.

import { stepClog, type DamHeight } from "../2d/hydro";
import { createPanel, type PanelState } from "../2d/panel";
import { FIGURE, ISO_CSS } from "./figure.generated";

// ---------- Everything you might want to change lives here ----------

/** Tiles of meadow an 8 m lake floods, shown in the panel (the 2D map counts its own tiles the same way). */
const FLOODED_TILES: Record<DamHeight, number> = { 3: 0, 5: 0, 8: 6 };
/** Surface flow lines: one dash cycle every FLOW_DASH / (FLOW_BASE + river flow) seconds. */
const FLOW_DASH = 4;
const FLOW_BASE = 0.5;

// ---------- Page ----------

const style = document.createElement("style");
style.textContent = ISO_CSS;
document.head.append(style);

const stage = document.querySelector<HTMLElement>("#stage")!;
stage.innerHTML = `
  <figure class="iso-figure">
    <div class="iso-plate">
      <div class="iso-plate-corners" aria-hidden="true">
        <span class="iso-plate-corner" data-corner="fig">Fig 1</span>
        <span class="iso-plate-corner" data-corner="title">Our hydro plant</span>
        <span class="iso-plate-corner" data-corner="hint">Change anything in the panel</span>
        <span class="iso-plate-corner" data-corner="readout" data-readout></span>
      </div>
      <div class="iso-stage">
        <svg class="iso-svg" viewBox="0 0 ${FIGURE.width} ${FIGURE.height}" role="img" aria-label="${FIGURE.label}"></svg>
      </div>
    </div>
  </figure>`;
const svg = stage.querySelector<SVGSVGElement>("svg")!;
const readout = stage.querySelector<HTMLElement>("[data-readout]")!;

let shownDam: DamHeight | null = null;
let clog = 0;

function draw(state: PanelState): void {
  const { setup, op, riverFlow } = state;
  if (setup.damHeight !== shownDam) {
    svg.innerHTML = FIGURE.scenes[setup.damHeight].svg;
    shownDam = setup.damHeight;
  }
  const spills = FIGURE.scenes[setup.damHeight].spills;
  const level = Math.round(Math.min(1, op.spilledFlow / FIGURE.spillMax) * FIGURE.spillLevels);
  svg.querySelector('[data-live="spill"]')?.setAttribute("d", spills[level] ?? spills[0]!);
  stage.style.setProperty("--flow-dur", `${(FLOW_DASH / (FLOW_BASE + riverFlow)).toFixed(2)}s`);
  readout.textContent = `dam ${setup.damHeight} m · river ${riverFlow.toFixed(1)} m³/s · over the dam ${op.spilledFlow.toFixed(1)} m³/s`;
}

const panel = createPanel(document.querySelector<HTMLElement>("#upgrade")!, {
  onChange: draw,
  onClose() {},
  onCleanNow() {
    clog = 0;
  },
  floodedTiles: (height) => FLOODED_TILES[height],
});
draw(panel.state);

// The intake rack keeps clogging while the page is open, as in the 2D game.
let last = performance.now();
function tick(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  clog = stepClog(clog, panel.state.riverFlow, panel.state.setup.autoCleaner, dt);
  panel.setClog(clog);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
