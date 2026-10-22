// GridSim plant page: builds the Anatomy figure of our hydro plant, one complete scene per variant, into
// plant/figure.generated.ts. The page shows the scene that matches the panel's setup.
//   node plant/build-figure.mjs            write the scenes
//   node plant/build-figure.mjs --audit    also prove every scene's geometry (Anatomy audit)
// Kit: vendor/anatomy (github.com/wheresryan22/anatomy, MIT).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../vendor/anatomy/kit/lathe.mjs";
import * as A from "../vendor/anatomy/kit/audit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const AUDIT = process.argv.includes("--audit");

// ---------- Everything you might want to change lives here ----------

const M = 4; // world units per metre
const W = 900;
const HGT = 600;
const AZIMUTH = 38;
const DAM_HEIGHTS = [3, 5, 8]; // m, as in 2d/hydro.ts
const BLOCK = { x: -190, y: -30, w: 380, d: 120, r: 6 }; // the terrain block
const BOTTOM = -56; // block underside
// The river runs along the block's near edge, cut open there like a section: the water's depth, the dam's
// profile and the drop from the lake to the tail water all show on the near face.
const RIVER = { y0: 46, y1: 90, bed: -40 };
const TAIL = RIVER.bed + 1 * M; // tail water surface: 1 m deep below the dam
const DAM_X = -20; // upstream face of the dam
const DAM_BASE = 18; // dam thickness at the bed
const DAM_TOP = 6; // dam thickness at the crest
const TERRACE = { x0: BLOCK.x, x1: DAM_X - 12, y0: 14, z: -8 }; // a low meadow upstream beside the river; an 8 m lake floods it
const PIER = 6; // pier thickness across the river
const DECK_Z = 2; // underside of the bridge deck over the dam
const SPILL_LEVELS = 24; // precomputed thicknesses of the water over the crest
const SPILL_MAX = 12; // m³/s of spilled water for the thickest sheet

const crestOf = (height) => TAIL + height * M; // the lake stands at the crest: head = crest - tail water

const P = k.fitProjection(
  [...k.boxCorners(BLOCK, BOTTOM, 0), [DAM_X, RIVER.y0, DECK_Z + 12], [DAM_X, RIVER.y1, DECK_Z + 12]],
  W,
  HGT,
  { pad: 26, azimuth: AZIMUTH },
);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const UP = [0, 0, 1];
const frameUp = (x, y, z = 0) => G.frameOf([x, y, z], UP, [1, 0, 0], [0, 1, 0]);
const polygon = (points) => "M" + points.map((p) => at(p).map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";

// ---------- One scene ----------

function scene(height) {
  const crest = crestOf(height);
  const flooded = crest > TERRACE.z;
  const R = A.recorder(P);
  const put = (name, centre, svg, shapes = [], bias = 0) =>
    R.put({ piece: "plant", at: centre, bias, svg, move: [0, 0, 0], shapes: shapes.map((shape) => R.solid(shape)), name: R.nameFor(name) });
  const box = (name, plan, z, h, style = {}, { extra = "", steps = 3, bevel = 0.5, bias = 0, meta = {} } = {}) => {
    const shape = A.slab(plan, z, h, { name, ...meta }, steps);
    put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style }) + extra, [shape], bias);
    return shape;
  };
  const turned = (name, F, profile, style = {}, { extra = "", bias = 0, meta = {} } = {}) => {
    const soft = profile.some((point) => point[2]);
    const shape = A.solid(F, profile, { name, curve: soft ? profile : undefined, ...meta });
    const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
    put(name, G.add3(F.o, G.mul3(F.a, mid)), S(G.solidOf(profile, F, P, { smooth: soft ? { rows: 4 } : false }), { tone: "mid", ...style }) + extra, [shape], bias);
    return shape;
  };
  const back = [];

  // ----- Terrain: two banks and the river bed, cut as a block; strata seams on the cut faces -----
  back.push(`<path class="iso-halo" d="${k.haloOf(BLOCK, BOTTOM, 0.1, P)}"/>`);
  const strata = (plan, z0, z1) => [-14, -30, -46].filter((z) => z > z0 + 2 && z < z1 - 2).map((z) => k.sideSeam(plan, z, P, 3)).join("");
  const ground = (name, plan, z0, z1) => {
    const grass = z1 >= -8 ? Dots(k.dotGrid(plan.x + 5, plan.y + 5, Math.floor((plan.w - 6) / 7), Math.floor((plan.d - 6) / 7), 7, z1, P), { size: 0.4, tone: "faint" }) : "";
    return box(name, plan, z0, z1 - z0, { tone: "lo", inner: Ln(strata(plan, z0, z1), { tone: "faint" }) }, { steps: 3, bevel: 0.8, extra: grass, meta: { ground: true } });
  };
  ground("stand.bank-back", { x: BLOCK.x, y: BLOCK.y, w: BLOCK.w, d: TERRACE.y0 - BLOCK.y, r: 2 }, BOTTOM, 0);
  ground("stand.terrace", { x: TERRACE.x0, y: TERRACE.y0, w: TERRACE.x1 - TERRACE.x0, d: RIVER.y0 - TERRACE.y0, r: 1 }, BOTTOM, TERRACE.z);
  ground("stand.bank-front", { x: TERRACE.x1, y: TERRACE.y0, w: BLOCK.x + BLOCK.w - TERRACE.x1, d: RIVER.y0 - TERRACE.y0, r: 1 }, BOTTOM, 0);
  ground("stand.bed", { x: BLOCK.x, y: RIVER.y0, w: BLOCK.w, d: RIVER.y1 - RIVER.y0, r: 1 }, BOTTOM, RIVER.bed);

  // ----- Water: the lake behind the dam (at the crest), the tail water below it, and the flooded meadow -----
  const flowLines = (plan, z, count) => {
    const lines = Array.from({ length: count }, (_, i) => {
      const y = plan.y + (plan.d * (i + 1)) / (count + 1);
      return k.lineOnTop([plan.x, y], [plan.x + plan.w, y], z, P);
    });
    return `<g class="flow">${Ln(lines.join(""), { tone: "blue", flow: true })}</g>`;
  };
  const water = (name, plan, z0, z1, flows = 0, meta = {}) => box(name, plan, z0, z1 - z0, { tone: "lo", className: "water", crease: "none" }, { bevel: 0, extra: flows ? flowLines(plan, z1, flows) : "", meta });
  const DAM_X1 = DAM_X + DAM_BASE;
  water("water.lake", { x: BLOCK.x + 0.5, y: RIVER.y0, w: DAM_X - BLOCK.x - 0.5, d: RIVER.y1 - RIVER.y0, r: 0.4 }, RIVER.bed, crest, 3);
  water("water.tail", { x: DAM_X1, y: RIVER.y0, w: BLOCK.x + BLOCK.w - 0.5 - DAM_X1, d: RIVER.y1 - RIVER.y0, r: 0.4 }, RIVER.bed, TAIL, 3);
  // Fence posts and two trees on the meadow; in an 8 m lake they stand in the water.
  const trees = [];
  const tree = (name, x, y, z, s = 1) => {
    // Standing in the lake, only what is above the water is drawn: the water hides the rest.
    const base = flooded ? Math.max(z, crest) : z;
    const trunk = turned(`${name}.trunk`, frameUp(x, y, base), [[0, 0], [0, 1.4 * s], [z + 7 * s - base, 1.1 * s], [z + 7 * s - base, 0]], { tone: "mid" });
    // A pine: two stacked cones, straight-sided, so the shading needs no smoothing.
    turned(`${name}.crown-low`, frameUp(x, y, z + 7 * s), [[0, 0], [0, 8 * s], [10 * s, 2.5 * s], [10 * s, 0]], { tone: "hi" });
    const crown = turned(`${name}.crown-high`, frameUp(x, y, z + 17 * s), [[0, 0], [0, 6 * s], [10 * s, 0]], { tone: "hi" });
    trees.push(trunk);
    return crown;
  };
  tree("tree.meadow-1", TERRACE.x0 + 40, RIVER.y0 - 14, TERRACE.z, 0.9);
  tree("tree.meadow-2", TERRACE.x0 + 104, RIVER.y0 - 22, TERRACE.z, 1.05);
  const posts = [];
  for (let x = TERRACE.x0 + 14; x < TERRACE.x1 - 6; x += 16) posts.push(box(`fence.post-${x}`, { x: x - 0.8, y: TERRACE.y0 + 3, w: 1.6, d: 1.6, r: 0.3 }, flooded ? crest : TERRACE.z, TERRACE.z + 7 - (flooded ? crest : TERRACE.z), { tone: "mid" }, { bevel: 0 }));
  const fenceX = [TERRACE.x0 + 14 - 0.8, TERRACE.x0 + 14 + 16 * Math.floor((TERRACE.x1 - 6 - TERRACE.x0 - 14 - 1) / 16) + 0.8];
  // The rails are nailed to the posts' near faces.
  const RAIL_Y = TERRACE.y0 + 4.6 + 0.3;
  put("fence.rails", [(fenceX[0] + fenceX[1]) / 2, RAIL_Y, TERRACE.z + 5], Ln([TERRACE.z + 5.6, TERRACE.z + 3].filter((z) => !flooded || z > crest + 0.5).map((z) => k.segment([fenceX[0], RAIL_Y, z], [fenceX[1], RAIL_Y, z], P)).join(""), { tone: "mid" }), [A.tube([[fenceX[0], RAIL_Y, TERRACE.z + 5.6], [fenceX[1], RAIL_Y, TERRACE.z + 5.6]], 0.3, { name: "fence.rails" })], 0.2);
  if (flooded) water("water.meadow", { x: TERRACE.x0 + 0.5, y: TERRACE.y0 + 0.5, w: TERRACE.x1 - TERRACE.x0 - 0.5, d: RIVER.y0 - TERRACE.y0 - 0.5, r: 0.4 }, TERRACE.z, crest, 2);

  // ----- The dam: vertical upstream face, sloping downstream face, keyed into both banks -----
  const prof = [[DAM_X, RIVER.bed], [DAM_X1, RIVER.bed], [DAM_X + DAM_TOP, crest], [DAM_X, crest]];
  const bm = [];
  const front = prof.map(([x, z]) => [x, RIVER.y1, z]);
  const backFace = prof.map(([x, z]) => [x, RIVER.y0, z]);
  // Drawn as a prism along y: its visible faces are the downstream slope, the crest and the near (y1) end.
  const damF = G.frameOf([0, RIVER.y0, 0], [0, 1, 0], [1, 0, 0], UP);
  const damPoly = prof.map(([x, z]) => [x, z]);
  const damPaths = G.prismOf(damF, damPoly, 0, RIVER.y1 - RIVER.y0, P);
  const lift = k.segment([DAM_X + DAM_TOP + (DAM_BASE - DAM_TOP) * 0.5, RIVER.y0, (RIVER.bed + crest) / 2], [DAM_X + DAM_TOP + (DAM_BASE - DAM_TOP) * 0.5, RIVER.y1, (RIVER.bed + crest) / 2], P);
  const joints = [RIVER.y0 + 15, RIVER.y1 - 15].map((dy) => k.segment([DAM_X + DAM_TOP, dy, crest], [DAM_X1, dy, RIVER.bed], P)).join("");
  put("dam.body", [DAM_X + DAM_BASE / 2, (RIVER.y0 + RIVER.y1) / 2, (RIVER.bed + crest) / 2], S(damPaths, { tone: "hi", inner: Ln(lift + joints, { tone: "faint" }) }), [A.prism(damF, damPoly, 0, RIVER.y1 - RIVER.y0, { name: "dam.body" })]);
  void bm; void front; void backFace;

  // ----- Piers on both banks and a bridge deck over the dam, with a railing -----
  const deckPlan = { x: DAM_X - 2, y: RIVER.y0 - 8, w: DAM_TOP + 4, d: RIVER.y1 - RIVER.y0 + 8, r: 1 };
  for (const [name, y] of [["pier.far", RIVER.y0], ["pier.near", RIVER.y1 - PIER]]) {
    const plan = { x: DAM_X - 1, y, w: DAM_TOP + 2, d: PIER, r: 0.8 };
    box(name, plan, crest, DECK_Z - crest, { tone: "mid" }, { bevel: 0.5, extra: Ln(k.sideSeam(plan, DECK_Z - 4, P, 3), { tone: "faint" }) });
  }
  box("deck.abutment", { x: deckPlan.x, y: deckPlan.y, w: deckPlan.w, d: RIVER.y0 - deckPlan.y, r: 0.8 }, 0, DECK_Z, { tone: "mid" }, { bevel: 0.4 });
  box("deck", deckPlan, DECK_Z, 2.4, { tone: "mid" }, { bevel: 0.5, extra: Dots([deckPlan.y + 2, deckPlan.y + deckPlan.d - 2].map((y) => at([DAM_X + DAM_TOP / 2, y, DECK_Z + 2.4])), { size: 0.42 }) });
  const railX = [deckPlan.x + 0.9, deckPlan.x + deckPlan.w - 0.9];
  for (const x of railX) {
    const ys = [deckPlan.y + 1.2, (deckPlan.y + deckPlan.y + deckPlan.d) / 2, deckPlan.y + deckPlan.d - 1.2];
    ys.forEach((y, i) => put(`rail.post-${x}-${i}`, [x, y, DECK_Z + 6.6], S(k.cylinder(x, y, 0.5, DECK_Z + 2.4, 8, P, 8), { tone: "mid", crease: "none" }), [A.cylinder(x, y, 0.5, DECK_Z + 2.4, 8, { name: `rail.post-${x}-${i}` })]));
    const bars = [DECK_Z + 10.2, DECK_Z + 6.4].map((z) => k.segment([x, ys[0] - 0.5, z], [x, ys[2] + 0.5, z], P)).join("");
    put(`rail.bars-${x}`, [x, (RIVER.y0 + RIVER.y1) / 2, DECK_Z + 10], Ln(bars, { tone: "mid" }), [A.tube([[x, ys[0], DECK_Z + 10.2], [x, ys[2], DECK_Z + 10.2]], 0.3, { name: `rail.bars-${x}` })], 0.2);
  }

  // ----- The spill: water over the crest and down the downstream face (precomputed sheets, swapped live) -----
  const SPILL_Y = [RIVER.y0 + PIER, RIVER.y1 - PIER];
  const spillAt = (t) => {
    if (t < 0.01) return "M0 0";
    const thick = 0.6 + 3.2 * t;
    const [y0, y1] = SPILL_Y;
    const slope = [DAM_X + DAM_TOP, crest, DAM_X1, RIVER.bed];
    const along = (s) => [slope[0] + (slope[2] - slope[0]) * s, slope[1] + (slope[3] - slope[1]) * s];
    const tailS = (crest - TAIL) / (crest - RIVER.bed);
    const pts = [[DAM_X, y0, crest], [DAM_X, y1, crest]];
    for (const s of [0, 0.25, 0.5, 0.75, tailS]) {
      const [x, z] = along(Math.min(s, tailS));
      pts.push([x + thick * 0.9, y1, z + thick * 0.45]);
    }
    pts.push([DAM_X1 + 2 + 6 * t, y1, TAIL], [DAM_X1 + 2 + 6 * t, y0, TAIL]);
    for (const s of [tailS, 0.75, 0.5, 0.25, 0]) {
      const [x, z] = along(Math.min(s, tailS));
      pts.push([x + thick * 0.9, y0, z + thick * 0.45]);
    }
    return polygon(pts);
  };
  const spills = Array.from({ length: SPILL_LEVELS + 1 }, (_, i) => spillAt(i / SPILL_LEVELS));
  // Recorded as the thinnest sheet: a strip on the crest and a strip lying on the slope, down to the tail water.
  const tailS = (crest - TAIL) / (crest - RIVER.bed);
  const toeX = DAM_X + DAM_TOP + (DAM_BASE - DAM_TOP) * tailS;
  const n = [crest - RIVER.bed, DAM_BASE - DAM_TOP];
  const nl = Math.hypot(n[0], n[1]);
  const off = [(n[0] / nl) * 0.6, (n[1] / nl) * 0.6];
  put("water.spill", [DAM_X + DAM_BASE / 2, (RIVER.y0 + RIVER.y1) / 2, (crest + TAIL) / 2], `<path data-live="spill" class="spill" d="${spills[Math.round(SPILL_LEVELS * 0.15)]}"/>`, [
    A.box([DAM_X, RIVER.y0 + PIER, crest], [DAM_X + DAM_TOP, RIVER.y1 - PIER, crest + 0.6], { name: "water.spill" }),
    A.prism(damF, [[DAM_X + DAM_TOP, crest], [toeX, TAIL], [toeX + off[0], TAIL + off[1]], [DAM_X + DAM_TOP + off[0], crest + off[1]]], PIER, RIVER.y1 - RIVER.y0 - PIER, { name: "water.spill" }),
  ], 0.3);

  // ----- Head ruler on the section face, just below the dam: a tick per metre from the tail water to the lake -----
  const RULER = { x: DAM_X1 + 6, y: RIVER.y1, w: 5, d: 0.8, r: 0.3 };
  {
    const face = RULER.y + RULER.d;
    const ticks = [];
    for (let m = 0; m <= height; m++) ticks.push(k.segment([RULER.x, face, TAIL + m * M], [RULER.x + (m % 5 === 0 ? 5 : 2.6), face, TAIL + m * M], P));
    const marks = [crest, TAIL].map((z) => k.segment([RULER.x - 4, face, z], [RULER.x, face, z], P)).join("");
    box("ruler", RULER, RIVER.bed, crest + 2 - RIVER.bed, { tone: "lo" }, { bevel: 0, extra: Ln(ticks.join(""), { tone: "mid" }) + Ln(marks, { tone: "blue", free: "start" }) });
  }

  A.settle(R, P);
  R.items.sort((a, b) => a.key - b.key);
  if (AUDIT) console.log(`\n=== dam ${height} m ===`);
  A.auditOrExit(R, P, {});
  return { svg: back.join("") + R.items.map((item) => item.svg).join(""), spills };
}

// ---------- All variants ----------

const scenes = {};
for (const height of DAM_HEIGHTS) scenes[height] = scene(height);

const out = `// Generated by plant/build-figure.mjs. Do not edit by hand.
export const ISO_CSS = ${JSON.stringify(k.ISO_CSS)};
export const FIGURE = ${JSON.stringify({ width: W, height: HGT, scenes, spillMax: SPILL_MAX, spillLevels: SPILL_LEVELS, label: "Our run-of-river hydro plant, drawn as a model on a terrain block: a river in a gorge, a gravity dam with a bridge deck, the lake behind it and the tail water below." })} as const;
`;
writeFileSync(join(HERE, "figure.generated.ts"), out);
console.log(`wrote figure.generated.ts ${(out.length / 1024).toFixed(0)} KB`);
