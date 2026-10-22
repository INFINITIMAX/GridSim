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
import { tubePieces, tubeSvg } from "../vendor/anatomy/kit/tube.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const AUDIT = process.argv.includes("--audit");

// ---------- Everything you might want to change lives here ----------

const M = 4; // world units per metre
const W = 960;
const HGT = 620;
const AZIMUTH = 38;
const DAM_HEIGHTS = [3, 5, 8]; // m, as in 2d/hydro.ts

// Terrain: a plateau upstream holds the lake; the dam stands on the step down to the valley, where the plant is.
// The river runs along the block's near edge, cut open there like a section, so the water's depth, the dam's
// profile and the drop from the lake to the tail water all show on the near face.
const BLOCK = { x: -190, y: -40, w: 380, d: 130, r: 6 };
const BOTTOM = -28;
const UP_TOP = 28; // plateau, upstream of the dam
const RIVER = { y0: 46, y1: 90, bed: -12 };
const TAIL = RIVER.bed + 1 * M; // tail water: 1 m deep
const DAM_X = -40; // the step, and the dam's upstream face
const DAM_TOP = 6; // dam thickness at the crest
const TERRACE = { x0: BLOCK.x, x1: DAM_X - 40, y0: 18, z: 18 }; // a low meadow beside the lake; an 8 m lake floods it
const PIER = 6;
const DECK_Z = UP_TOP; // the bridge deck over the dam runs level with the plateau
const SPILL_LEVELS = 24;
const SPILL_MAX = 12; // m³/s spilled for the thickest sheet

// The plant, on the valley floor below the step.
const TURB = [64, 4]; // turbine axis
const PED_H = 8;
const HOUSING_R = 14;
const HOUSING = [PED_H, PED_H + 13];
const AXIS_Z = PED_H + 6.5; // volute and penstock centre height
const VOLUTE = { r0: 3, r1: 6.5 };
const PEN_R = 6.5;
const GEN = { z0: 32, z1: 52, r: 15 };
const RUN_Y = 27; // the penstock's straight run, from the portal to the plant
const TAILRACE = { x0: TURB[0] - 8, x1: TURB[0] + 8, y0: TURB[1] + HOUSING_R + 2 };
const HOUSE = { x0: 24, x1: 104, y0: -34, y1: 40, h: 60 }; // the powerhouse walls, cut open towards the viewer
const WALL = 3;
const MARKER_FRAMES = 24;

const crestOf = (height) => TAIL + height * M; // the lake stands at the crest: head = crest - tail water

const P = k.fitProjection(
  [...k.boxCorners(BLOCK, BOTTOM, 0), [BLOCK.x, BLOCK.y, UP_TOP], [DAM_X, BLOCK.y, UP_TOP], [HOUSE.x0, HOUSE.y0, HOUSE.h + 6], [HOUSE.x1, HOUSE.y0, HOUSE.h + 6]],
  W,
  HGT,
  { pad: 22, azimuth: AZIMUTH },
);
const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const UP = [0, 0, 1];
const frameUp = (x, y, z = 0) => G.frameOf([x, y, z], UP, [1, 0, 0], [0, 1, 0]);
const polygon = (points) => "M" + points.map((p) => at(p).map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
const markerAt = (turn) => {
  const a = turn * Math.PI * 2;
  return k.lineOnTop([TURB[0] + Math.cos(a) * 1.6, TURB[1] + Math.sin(a) * 1.6], [TURB[0] + Math.cos(a) * 6, TURB[1] + Math.sin(a) * 6], GEN.z1 + 7.1, P);
};

// ---------- One scene ----------

function scene(height) {
  const crest = crestOf(height);
  const flooded = crest > TERRACE.z;
  const damBase = 6 + 0.7 * (crest - RIVER.bed);
  const DAM_X1 = DAM_X + damBase;
  const R = A.recorder(P);
  const put = (name, centre, svg, shapes = [], bias = 0) =>
    R.put({ piece: "plant", at: centre, bias, svg, move: [0, 0, 0], shapes: shapes.map((shape) => R.solid(shape)), name: R.nameFor(name) });
  const box = (name, plan, z, h, style = {}, { extra = "", steps = 3, bevel = 0.5, bias = 0, meta = {} } = {}) => {
    const shape = A.slab(plan, z, h, { name, ...meta }, steps);
    put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style }) + extra, [shape], bias);
    return shape;
  };
  const span = (name, x0, x1, y0, y1, z0, z1, style = {}, options = {}) => box(name, { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: options.r ?? 0.8 }, z0, z1 - z0, style, options);
  const post = (name, x, y, r, z, h, style = {}, { extra = "", steps = 24, bias = 0 } = {}) => {
    const shape = A.cylinder(x, y, r, z, h, { name });
    put(name, [x, y, z + h / 2], S(k.cylinder(x, y, r, z, h, P, steps), { tone: "mid", ...style }) + extra, [shape], bias);
    return shape;
  };
  const turned = (name, F, profile, style = {}, { extra = "", inner = "", bias = 0, meta = {} } = {}) => {
    const soft = profile.some((point) => point[2]);
    const shape = A.solid(F, profile, { name, curve: soft ? profile : undefined, ...meta });
    const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
    put(name, G.add3(F.o, G.mul3(F.a, mid)), S(G.solidOf(profile, F, P, { smooth: soft ? { rows: 4 } : false }), { tone: "mid", ...style, inner }) + extra, [shape], bias);
    return shape;
  };
  const tube = (name, route, r, { tone = "mid", gaps = [], caps = true, maxLength = 16, touch, ends, rims, breaks = [] } = {}) => {
    R.route(name, route, r, { owner: name, gaps, touch, ends, rims, piece: "plant", move: [0, 0, 0] });
    tubePieces(route, r, P, { maxLength, spacing: 1.3, gaps, caps, breaks }).forEach((part, index) =>
      R.put({ piece: "plant", at: part.mid, svg: tubeSvg(part, { tone }), move: [0, 0, 0], name: `${name}:${index}`, route: name, chunk: index, shapes: [R.solid(A.tube(part.points, part.radii, { name, owner: name }))] }),
    );
  };
  const flange = (name, centre, axis, r, thick, { owner, bolts = 8 } = {}) => {
    const F = G.frameAlong(centre, axis);
    const face = G.dot3(F.a, V) > 0 ? thick / 2 : -thick / 2;
    const dots = Math.abs(G.dot3(F.a, V)) > 0.12 && bolts ? Dots(G.dotsOf(F, face, r * 0.78, bolts, P, { all: true }), { size: 0.42, tone: "mid" }) : "";
    put(name, centre, S(G.disc(-thick / 2, thick / 2, r, F, P), { tone: "mid" }) + dots, [A.disc(F, -thick / 2, thick / 2, r, { name, owner })]);
  };
  const back = [];

  // ----- Terrain -----
  back.push(`<path class="iso-halo" d="${k.haloOf(BLOCK, BOTTOM, 0.1, P)}"/>`);
  const strata = (plan, z0, z1) => [-6, -18, 10].filter((z) => z > z0 + 2 && z < z1 - 2).map((z) => k.sideSeam(plan, z, P, 3)).join("");
  const ground = (name, x0, x1, y0, y1, z1, { grass = true } = {}) => {
    const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 1 };
    const dots = grass && plan.w > 14 && plan.d > 14 ? Dots(k.dotGrid(plan.x + 5, plan.y + 5, Math.floor((plan.w - 6) / 7), Math.floor((plan.d - 6) / 7), 7, z1, P), { size: 0.4, tone: "faint" }) : "";
    return box(name, plan, BOTTOM, z1 - BOTTOM, { tone: "lo", inner: Ln(strata(plan, BOTTOM, z1), { tone: "faint" }) }, { steps: 3, bevel: 0.8, extra: dots, meta: { ground: true } });
  };
  const BX1 = BLOCK.x + BLOCK.w;
  // Upstream plateau, with the meadow terrace beside the lake.
  ground("stand.up-back", BLOCK.x, DAM_X, BLOCK.y, TERRACE.y0, UP_TOP);
  ground("stand.terrace", TERRACE.x0, TERRACE.x1, TERRACE.y0, RIVER.y0, TERRACE.z);
  ground("stand.up-front", TERRACE.x1, DAM_X, TERRACE.y0, RIVER.y0, UP_TOP);
  // Valley floor, cut for the tailrace from the plant to the river.
  ground("stand.down-left", DAM_X, TAILRACE.x0, BLOCK.y, RIVER.y0, 0);
  ground("stand.down-under-plant", TAILRACE.x0, TAILRACE.x1, BLOCK.y, TAILRACE.y0, 0, { grass: false });
  ground("stand.tailrace-floor", TAILRACE.x0, TAILRACE.x1, TAILRACE.y0, RIVER.y0, RIVER.bed, { grass: false });
  ground("stand.down-right", TAILRACE.x1, BX1, BLOCK.y, RIVER.y0, 0);
  ground("stand.bed", BLOCK.x, BX1, RIVER.y0, RIVER.y1, RIVER.bed, { grass: false });

  // ----- Water -----
  const flowLines = (plan, z, count, cls = "flow") => {
    const lines = Array.from({ length: count }, (_, i) => {
      const y = plan.y + (plan.d * (i + 1)) / (count + 1);
      return k.lineOnTop([plan.x, y], [plan.x + plan.w, y], z, P);
    });
    return `<g class="${cls}">${Ln(lines.join(""), { tone: "blue", flow: true })}</g>`;
  };
  const water = (name, plan, z0, z1, flows = 0, cls) => box(name, plan, z0, z1 - z0, { tone: "lo", className: "water", crease: "none" }, { bevel: 0, extra: flows ? flowLines(plan, z1, flows, cls) : "" });
  water("water.lake", { x: BLOCK.x + 0.5, y: RIVER.y0, w: DAM_X - BLOCK.x - 0.5, d: RIVER.y1 - RIVER.y0, r: 0.4 }, RIVER.bed, crest, 3);
  water("water.tail", { x: DAM_X1, y: RIVER.y0, w: BX1 - 0.5 - DAM_X1, d: RIVER.y1 - RIVER.y0, r: 0.4 }, RIVER.bed, TAIL, 3);
  // The tailrace's water runs towards the river, so its lines run across it (along y).
  {
    const plan = { x: TAILRACE.x0 + 0.5, y: TAILRACE.y0, w: TAILRACE.x1 - TAILRACE.x0 - 1, d: RIVER.y0 - TAILRACE.y0, r: 0.4 };
    const lines = [0.33, 0.67].map((f) => k.lineOnTop([plan.x + plan.w * f, plan.y], [plan.x + plan.w * f, plan.y + plan.d], TAIL, P));
    box("water.tailrace", plan, RIVER.bed, TAIL - RIVER.bed, { tone: "lo", className: "water", crease: "none" }, { bevel: 0, extra: `<g class="flow tail">${Ln(lines.join(""), { tone: "blue", flow: true })}</g>` });
  }
  // Meadow: fence and two pines; in an 8 m lake only what is above the water is drawn.
  const tree = (name, x, y, z, s = 1) => {
    const base = flooded ? Math.max(z, crest) : z;
    turned(`${name}.trunk`, frameUp(x, y, base), [[0, 0], [0, 1.4 * s], [z + 9 * s - base, 1.1 * s], [z + 9 * s - base, 0]], { tone: "mid" });
    turned(`${name}.crown-low`, frameUp(x, y, z + 9 * s), [[0, 0], [0, 8 * s], [10 * s, 2.5 * s], [10 * s, 0]], { tone: "hi" });
    turned(`${name}.crown-high`, frameUp(x, y, z + 19 * s), [[0, 0], [0, 6 * s], [10 * s, 0]], { tone: "hi" });
  };
  tree("tree.meadow-1", TERRACE.x0 + 30, RIVER.y0 - 12, TERRACE.z, 0.9);
  tree("tree.meadow-2", TERRACE.x0 + 86, RIVER.y0 - 18, TERRACE.z, 1.05);
  const FENCE_Y = TERRACE.y0 + 3;
  const fenceXs = [];
  for (let x = TERRACE.x0 + 12; x < TERRACE.x1 - 6; x += 14) fenceXs.push(x);
  fenceXs.forEach((x) => box(`fence.post-${x}`, { x: x - 0.8, y: FENCE_Y, w: 1.6, d: 1.6, r: 0.3 }, flooded ? crest : TERRACE.z, TERRACE.z + 7 - (flooded ? crest : TERRACE.z), { tone: "mid" }, { bevel: 0 }));
  {
    const railY = FENCE_Y + 1.6 + 0.3;
    const x0 = fenceXs[0] - 0.8, x1 = fenceXs[fenceXs.length - 1] + 0.8;
    const rails = [TERRACE.z + 5.6, TERRACE.z + 3].filter((z) => !flooded || z > crest + 0.5);
    if (rails.length) put("fence.rails", [(x0 + x1) / 2, railY, TERRACE.z + 5], Ln(rails.map((z) => k.segment([x0, railY, z], [x1, railY, z], P)).join(""), { tone: "mid" }), [A.tube([[x0, railY, rails[0]], [x1, railY, rails[0]]], 0.3, { name: "fence.rails" })], 0.2);
  }
  if (flooded) water("water.meadow", { x: TERRACE.x0 + 0.5, y: TERRACE.y0 + 0.5, w: TERRACE.x1 - TERRACE.x0 - 0.5, d: RIVER.y0 - TERRACE.y0 - 0.5, r: 0.4 }, TERRACE.z, crest, 2);

  // ----- The dam: vertical upstream face on the step, sloping downstream face -----
  const damF = G.frameOf([0, RIVER.y0, 0], [0, 1, 0], [1, 0, 0], UP);
  const damPoly = [[DAM_X, RIVER.bed], [DAM_X1, RIVER.bed], [DAM_X + DAM_TOP, crest], [DAM_X, crest]];
  const lift = k.segment([(DAM_X + DAM_TOP + DAM_X1) / 2, RIVER.y0, (RIVER.bed + crest) / 2], [(DAM_X + DAM_TOP + DAM_X1) / 2, RIVER.y1, (RIVER.bed + crest) / 2], P);
  const joints = [RIVER.y0 + 15, RIVER.y1 - 15].map((y) => k.segment([DAM_X + DAM_TOP, y, crest], [DAM_X1, y, RIVER.bed], P)).join("");
  put("dam.body", [DAM_X + damBase / 2, (RIVER.y0 + RIVER.y1) / 2, (RIVER.bed + crest) / 2], S(G.prismOf(damF, damPoly, 0, RIVER.y1 - RIVER.y0, P), { tone: "hi", inner: Ln(lift + joints, { tone: "faint" }) }), [A.prism(damF, damPoly, 0, RIVER.y1 - RIVER.y0, { name: "dam.body" })]);

  // ----- Piers and the bridge deck, level with the plateau -----
  const deck = { x: DAM_X - 2, y: RIVER.y0 - 8, w: DAM_TOP + 4, d: RIVER.y1 - RIVER.y0 + 8, r: 1 };
  for (const [name, y] of [["pier.far", RIVER.y0], ["pier.near", RIVER.y1 - PIER]]) {
    const plan = { x: DAM_X - 1, y, w: DAM_TOP + 2, d: PIER, r: 0.8 };
    box(name, plan, crest, DECK_Z - crest, { tone: "mid" }, { bevel: 0.5, extra: Ln(k.sideSeam(plan, DECK_Z - 4, P, 3), { tone: "faint" }) });
  }
  span("deck.abutment", DAM_X, deck.x + deck.w, deck.y, RIVER.y0, 0, DECK_Z, { tone: "mid" }, { bevel: 0.4 });
  box("deck", deck, DECK_Z, 2.4, { tone: "mid" }, { bevel: 0.5, extra: Dots([deck.y + 2, deck.y + deck.d - 2].map((y) => at([DAM_X + DAM_TOP / 2, y, DECK_Z + 2.4])), { size: 0.42 }) });
  for (const x of [deck.x + 0.9, deck.x + deck.w - 0.9]) {
    const ys = [deck.y + 1.2, deck.y + deck.d / 2, deck.y + deck.d - 1.2];
    ys.forEach((y, i) => post(`rail.post-${x}-${i}`, x, y, 0.5, DECK_Z + 2.4, 8, { crease: "none" }, { steps: 8 }));
    const bars = [DECK_Z + 10.2, DECK_Z + 6.4].map((z) => k.segment([x, ys[0] - 0.5, z], [x, ys[2] + 0.5, z], P)).join("");
    put(`rail.bars-${x}`, [x, deck.y + deck.d / 2, DECK_Z + 10], Ln(bars, { tone: "mid" }), [A.tube([[x, ys[0], DECK_Z + 10.2], [x, ys[2], DECK_Z + 10.2]], 0.3, { name: `rail.bars-${x}` })], 0.2);
  }

  // ----- The spill over the crest (precomputed sheets, swapped live) -----
  const SPILL_Y = [RIVER.y0 + PIER, RIVER.y1 - PIER];
  const tailS = (crest - TAIL) / (crest - RIVER.bed);
  const along = (s) => [DAM_X + DAM_TOP + (DAM_X1 - DAM_X - DAM_TOP) * s, crest + (RIVER.bed - crest) * s];
  const spillAt = (t) => {
    if (t < 0.01) return "M0 0";
    const thick = 0.6 + 3.2 * t;
    const [y0, y1] = SPILL_Y;
    const pts = [[DAM_X, y0, crest], [DAM_X, y1, crest]];
    for (const s of [0, 0.25, 0.5, 0.75, 1].map((f) => f * tailS)) {
      const [x, z] = along(s);
      pts.push([x + thick * 0.9, y1, z + thick * 0.45]);
    }
    pts.push([DAM_X1 + 2 + 6 * t, y1, TAIL], [DAM_X1 + 2 + 6 * t, y0, TAIL]);
    for (const s of [1, 0.75, 0.5, 0.25, 0].map((f) => f * tailS)) {
      const [x, z] = along(s);
      pts.push([x + thick * 0.9, y0, z + thick * 0.45]);
    }
    return polygon(pts);
  };
  const spills = Array.from({ length: SPILL_LEVELS + 1 }, (_, i) => spillAt(i / SPILL_LEVELS));
  {
    const [toeX] = along(tailS);
    const n = [crest - RIVER.bed, damBase - DAM_TOP];
    const nl = Math.hypot(n[0], n[1]);
    const off = [(n[0] / nl) * 0.6, (n[1] / nl) * 0.6];
    put("water.spill", [DAM_X + damBase / 2, (RIVER.y0 + RIVER.y1) / 2, (crest + TAIL) / 2], `<path data-live="spill" class="spill" d="${spills[3]}"/>`, [
      A.box([DAM_X, SPILL_Y[0], crest], [DAM_X + DAM_TOP, SPILL_Y[1], crest + 0.6], { name: "water.spill" }),
      A.prism(damF, [[DAM_X + DAM_TOP, crest], [toeX, TAIL], [toeX + off[0], TAIL + off[1]], [DAM_X + DAM_TOP + off[0], crest + off[1]]], PIER, RIVER.y1 - RIVER.y0 - PIER, { name: "water.spill" }),
    ], 0.3);
  }

  // ----- Head ruler on the section face below the dam: a tick per metre from the tail water to the lake -----
  {
    const RULER = { x: DAM_X1 + 6, y: RIVER.y1, w: 5, d: 0.8, r: 0.3 };
    const face = RULER.y + RULER.d;
    const ticks = [];
    for (let m = 0; m <= height; m++) ticks.push(k.segment([RULER.x, face, TAIL + m * M], [RULER.x + (m % 5 === 0 ? 3.8 : 2.4), face, TAIL + m * M], P));
    const marks = [crest, TAIL].map((z) => k.segment([RULER.x - 4, face, z], [RULER.x, face, z], P)).join("");
    box("ruler", RULER, RIVER.bed, crest + 2 - RIVER.bed, { tone: "lo" }, { bevel: 0, extra: Ln(ticks.join(""), { tone: "mid" }) + Ln(marks, { tone: "blue", free: "start" }) });
  }

  // ----- Intake: a headwall on the lake's far wall with a trash rack, and the gate house above it on the plateau -----
  const IN = { x0: DAM_X - 36, x1: DAM_X - 14 };
  // Below the water line the lake hides it, so only the part above the water is drawn.
  span("intake.headwall", IN.x0, IN.x1, RIVER.y0, RIVER.y0 + 3, crest, UP_TOP, { tone: "mid" }, { bevel: 0.4 });
  for (let i = 0; i <= 7; i++) {
    const x = IN.x0 + 2 + (i * (IN.x1 - IN.x0 - 4)) / 7;
    post(`intake.rack-${i}`, x, RIVER.y0 + 3.8, 0.6, crest, UP_TOP - 2 - crest, { crease: "none" }, { steps: 8 });
  }
  span("intake.rack-beam", IN.x0, IN.x1, RIVER.y0 + 3, RIVER.y0 + 4.6, UP_TOP - 2, UP_TOP, { tone: "mid" }, { r: 0.4, bevel: 0.2 });
  const GH = { x: IN.x0 + 2, y: RIVER.y0 - 14, w: IN.x1 - IN.x0 - 4, d: 13, r: 1 };
  box("gatehouse.walls", GH, UP_TOP, 11, { tone: "hi" }, { bevel: 0.5, extra: Ln(k.sideSeam(GH, UP_TOP + 4, P, 3), { tone: "faint" }) });
  box("gatehouse.roof", k.insetPlan(GH, -1.2), UP_TOP + 11, 2, { tone: "mid" }, { bevel: 0.4 });
  {
    const door = { x: GH.x + GH.w, y: GH.y + 4, w: 0.6, d: 5, r: 0.2 };
    box("gatehouse.door", door, UP_TOP, 7.5, { tone: "lo", crease: "none" }, { bevel: 0 });
  }

  // ----- Penstock: out of the tunnel portal on the step, along the valley floor, into the volute -----
  const PORTAL = { x: DAM_X, y: RUN_Y - 10.5, w: 6, d: 21, r: 1 };
  box("portal", PORTAL, 0, AXIS_Z + 12, { tone: "mid" }, { bevel: 0.6, extra: Ln(k.sideSeam(PORTAL, AXIS_Z + 8, P, 3), { tone: "faint" }) });
  const SPAN = (Math.PI * 5) / 3;
  const centreR = (t) => HOUSING_R + VOLUTE.r1 - (VOLUTE.r1 - VOLUTE.r0) * t + 0.3;
  const spiralPts = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    const a = Math.PI + SPAN * t;
    return [TURB[0] + centreR(t) * Math.cos(a), TURB[1] + centreR(t) * Math.sin(a), AXIS_Z];
  });
  const LARGE = spiralPts[0];
  const INLET_LEG = 8;
  const INLET = [LARGE[0], LARGE[1] + INLET_LEG, AXIS_Z];
  const ELBOW_R = PEN_R * 1.4;
  const SEAT = Math.sqrt(ELBOW_R ** 2 - PEN_R ** 2);
  const C = [INLET[0], RUN_Y, AXIS_Z];
  const FL = 2.2;
  const runA = [[PORTAL.x + PORTAL.w, RUN_Y, AXIS_Z], [C[0] - SEAT, RUN_Y, AXIS_Z]];
  const runB = [[C[0], C[1] - SEAT, AXIS_Z], INLET];
  put("penstock.elbow", C, S(G.sphereOf(C, ELBOW_R, P, { steps: 48 }), { tone: "mid" }), [A.ball(C, ELBOW_R, { name: "penstock.elbow", owner: "penstock" })]);
  const saddles = [0.3, 0.7].map((f) => {
    const x = runA[0][0] + (runA[1][0] - runA[0][0]) * f;
    return span(`penstock.saddle-${f}`, x - 3, x + 3, RUN_Y - 5.5, RUN_Y + 5.5, 0, AXIS_Z - PEN_R, { tone: "mid" }, { r: 1 });
  });
  [["penstock-a", runA, [true, false]], ["penstock-b", runB, [false, true]]].forEach(([name, ends, flanged]) => {
    const route = Array.from({ length: 9 }, (_, i) => G.lerp3(ends[0], ends[1], i / 8));
    const total = G.pathLength(route);
    const gaps = [flanged[0] ? [0, FL] : null, flanged[1] ? [total - FL, total] : null].filter(Boolean);
    tube(name, route, PEN_R, { gaps, touch: [...saddles.map((s) => s.name), "penstock.elbow", "portal"] });
    const axis = G.unit3(G.sub3(ends[1], ends[0]));
    if (flanged[0]) flange(`${name}.flange-in`, G.add3(ends[0], G.mul3(axis, FL / 2)), axis, PEN_R * 1.3, FL, { owner: name });
    if (flanged[1]) flange(`${name}.flange-out`, G.add3(ends[1], G.mul3(axis, -FL / 2)), axis, PEN_R * 1.3, FL, { owner: name });
  });

  // ----- Turbine: plinth, housing, volute; generator stand, generator, cap -----
  const HF = frameUp(TURB[0], TURB[1], 0);
  turned("turbine.plinth", HF, [[1.2, 0], [1.2, HOUSING_R + 1.5], [PED_H, HOUSING_R + 1.5], [PED_H, 0]], { tone: "mid" }, { extra: Dots(G.dotsOf(HF, PED_H, HOUSING_R - 1, 12, P, { all: true }), { size: 0.4 }) });
  turned("turbine.housing", HF, [[HOUSING[0], 0], [HOUSING[0], HOUSING_R], [HOUSING[1], HOUSING_R], [HOUSING[1], 0]], { tone: "mid" }, {
    inner: Ln(G.arcOf(HF, AXIS_Z, HOUSING_R, P), { tone: "faint" }),
    extra: Dots(G.dotsOf(HF, HOUSING[1], HOUSING_R - 2.2, 16, P, { all: true }), { size: 0.4 }),
  });
  const legPts = Array.from({ length: 5 }, (_, i) => [LARGE[0], LARGE[1] + INLET_LEG - (i * INLET_LEG) / 5, AXIS_Z]);
  const voluteRoute = [...legPts, ...spiralPts];
  const voluteLength = G.pathLength(voluteRoute);
  const voluteR = (t) => {
    const s = t * voluteLength;
    return s <= INLET_LEG ? VOLUTE.r1 : VOLUTE.r1 - (VOLUTE.r1 - VOLUTE.r0) * ((s - INLET_LEG) / (voluteLength - INLET_LEG));
  };
  const toward = k.towardViewer(P);
  const silhouette = (Math.atan2(toward[1], toward[0]) - Math.PI / 2 + Math.PI * 4) % (Math.PI * 2);
  const breaks = [silhouette, silhouette + Math.PI, silhouette + Math.PI * 2]
    .map((a) => (a - Math.PI) / SPAN)
    .filter((t) => t > 0.02 && t < 0.98)
    .map((t) => INLET_LEG + G.pathLength(spiralPts.slice(0, Math.round(t * 40) + 1)));
  flange("volute.flange-in", G.add3(INLET, [0, -FL / 2, 0]), [0, -1, 0], PEN_R * 1.3, FL, { owner: "volute" });
  tube("volute", voluteRoute, voluteR, { gaps: [[0, FL]], caps: [true, false], ends: [true, false], rims: [PEN_R * 1.3, VOLUTE.r0], touch: ["turbine.housing", "turbine.plinth"], maxLength: 12, breaks });
  turned("turbine.head-cover", HF, [[HOUSING[1], 0], [HOUSING[1], 11], [HOUSING[1] + 3, 11], [HOUSING[1] + 3, 0]], { tone: "mid" });
  turned("turbine.stand", HF, [[HOUSING[1] + 3, 0], [HOUSING[1] + 3, 8], [HOUSING[1] + 5, 8], [HOUSING[1] + 5, 5], [GEN.z0 - 2, 5], [GEN.z0 - 2, 9], [GEN.z0, 9], [GEN.z0, 0]], { tone: "mid" });
  const ribs = G.ribsOf(HF, GEN.z0 + 3, GEN.z1 - 3, GEN.r, 36, P, { fade: [0.1, 0.55], seams: true });
  const generator = turned("generator.body", HF, [[GEN.z0, 0], [GEN.z0, GEN.r], [GEN.z1, GEN.r], [GEN.z1, 0]], { tone: "hi" }, { extra: k.fadedSvg(ribs, { tone: "lo" }) });
  turned("generator.top", HF, [[GEN.z1, 0], [GEN.z1, 10], [GEN.z1 + 3, 10], [GEN.z1 + 3, 7], [GEN.z1 + 7, 7], [GEN.z1 + 7, 0]], { tone: "mid" }, { extra: Dots(G.dotsOf(HF, GEN.z1, 12.5, 12, P, { all: true }), { size: 0.4 }) });
  const TB = { x: TURB[0] + GEN.r - 1.2, y: TURB[1] - 4, w: 8, d: 8, r: 1 };
  box("generator.terminal-box", TB, GEN.z0 + 6, 8, {}, { meta: { seated: true, cut: generator }, extra: Dots([at([TB.x + 4.5, TB.y + 2, GEN.z0 + 14]), at([TB.x + 4.5, TB.y + TB.d - 2, GEN.z0 + 14])], { size: 0.4 }) });
  put("generator.marker", [TURB[0], TURB[1], GEN.z1 + 7.2], `<path data-live="marker" class="iso-line" data-tone="lit" data-free="both" d="${markerAt(0)}" style="stroke-width:1.2"/>`, [A.disc(HF, GEN.z1 + 7, GEN.z1 + 7.2, 6.2, { name: "generator.marker" })], 2);

  // ----- Powerhouse: floor, back and left walls full height, front and right walls cut low; partial roof -----
  span("house.floor", HOUSE.x0, HOUSE.x1, HOUSE.y0, TAILRACE.y0 - 0.5, 0, 1.2, { tone: "lo" }, { bevel: 0.3 });
  span("house.floor-front-a", HOUSE.x0, TAILRACE.x0 - 0.5, TAILRACE.y0 - 0.5, HOUSE.y1, 0, 1.2, { tone: "lo" }, { bevel: 0.3 });
  span("house.floor-front-b", TAILRACE.x1 + 0.5, HOUSE.x1, TAILRACE.y0 - 0.5, HOUSE.y1, 0, 1.2, { tone: "lo" }, { bevel: 0.3 });
  const H = HOUSE.h;
  span("house.wall-back", HOUSE.x0, HOUSE.x1, HOUSE.y0, HOUSE.y0 + WALL, 1.2, H, { tone: "hi" }, { extra: Ln(k.sideSeam({ x: HOUSE.x0, y: HOUSE.y0, w: HOUSE.x1 - HOUSE.x0, d: WALL, r: 0.8 }, H - 8, P, 3), { tone: "faint" }) });
    const hole = [RUN_Y - PEN_R - 3.6, RUN_Y + PEN_R + 3.6];
  span("house.wall-left-a", HOUSE.x0, HOUSE.x0 + WALL, HOUSE.y0 + WALL, hole[0], 1.2, H, { tone: "hi" });
  // From the penstock to the front the left wall is cut away, so the pipe runs straight in.
  const LOW = 10;
  span("house.wall-front-a", HOUSE.x0 + WALL, TAILRACE.x0 - 2, HOUSE.y1 - WALL, HOUSE.y1, 1.2, LOW, { tone: "hi" });
  span("house.wall-front-b", TAILRACE.x1 + 2, HOUSE.x1, HOUSE.y1 - WALL, HOUSE.y1, 1.2, LOW, { tone: "hi" });
  span("house.wall-right", HOUSE.x1 - WALL, HOUSE.x1, HOUSE.y0 + WALL, HOUSE.y1 - WALL, 1.2, LOW, { tone: "hi" });
  span("house.roof", HOUSE.x0 - 1, HOUSE.x1 + 1, HOUSE.y0 - 1, HOUSE.y0 + 24, H, H + 3, { tone: "mid" }, { bevel: 0.5 });
  for (let i = 0; i < 3; i++) {
    const x = HOUSE.x0 + 16 + i * 24;
    span(`house.window-${i}`, x, x + 12, HOUSE.y0 + WALL, HOUSE.y0 + WALL + 0.6, H - 26, H - 10, { tone: "lo", crease: "none" }, { bevel: 0, r: 0.3 });
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
const markers = Array.from({ length: MARKER_FRAMES }, (_, i) => markerAt(i / MARKER_FRAMES));

const out = `// Generated by plant/build-figure.mjs. Do not edit by hand.
export const ISO_CSS = ${JSON.stringify(k.ISO_CSS)};
export const FIGURE = ${JSON.stringify({ width: W, height: HGT, scenes, markers, spillMax: SPILL_MAX, spillLevels: SPILL_LEVELS, label: "Our run-of-river hydro plant, drawn as a model on a terrain block: the lake on a plateau, a gravity dam on the step with a bridge deck, an intake and gate house, a penstock down to a Kaplan turbine and generator in a cut-open powerhouse, and the tailrace back to the river." })} as const;
`;
writeFileSync(join(HERE, "figure.generated.ts"), out);
console.log(`wrote figure.generated.ts ${(out.length / 1024).toFixed(0)} KB`);
