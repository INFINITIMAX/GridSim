// GridSim art, Anatomy style: a bench model of the micro hydro plant, drawn with the Anatomy kit
// (github.com/wheresryan22/anatomy, MIT, local copy in ANATOMY below). Every number on the card
// comes from 2d/hydro.ts, bundled at build time.
//   node art/anatomy/build.mjs [--light] [--audit]
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ANATOMY = "D:/YouTube/_src/anatomy";
const kitUrl = (file) => pathToFileURL(join(ANATOMY, file)).href;
const k = await import(kitUrl("kit/iso-kit.mjs"));
const G = await import(kitUrl("kit/lathe.mjs"));
const { tubePieces, tubeSvg } = await import(kitUrl("kit/tube.mjs"));
const A = await import(kitUrl("kit/audit.mjs"));
const { kitScript } = await import(kitUrl("scripts/inline-kit.mjs"));

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

// ---------- The model: the real hydro physics from the 2D game ----------

const tmp = mkdtempSync(join(tmpdir(), "gridsim-art-"));
await build({ entryPoints: [join(HERE, "../../2d/hydro.ts")], bundle: true, format: "esm", outfile: join(tmp, "hydro.mjs"), logLevel: "silent" });
const H = await import(pathToFileURL(join(tmp, "hydro.mjs")).href);
const SETUP = { technology: "kaplan", size: "medium", count: 1, damHeight: 5, canal: false, gates: true, fishLadder: true, autoCleaner: true };
const FLOW_MAX = 9;
const TABLE = Array.from({ length: 181 }, (_, i) => {
  const flow = (FLOW_MAX * i) / 180;
  const op = H.operate(SETUP, flow, 0);
  return [flow, op.usedFlow, op.spilledFlow, op.ecoFlow, op.efficiency, op.powerKW];
});
const INSTALLED = H.operate(SETUP, 3, 0).installedKW;

// ---------- World, in units of about 1 px ----------

const W = 900;
const HGT = 560;
const AZIMUTH = 40;
const PLATE = { x: -180, y: -82, w: 360, d: 164, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;
const CH = { y0: -72, y1: -30, wall: 5, h: 26, floor: 3 }; // river channel along x
const WEIR_X = -40;
const CREST = 18; // weir crest height
const LEVEL_UP = 20; // water level behind the weir (head water)
const LEVEL_DOWN = 8; // water level after the weir (tail water)
const INTAKE = { x0: -118, x1: -84 }; // opening in the channel's near wall
const FB = { x: -124, y: CH.y1 + CH.wall + 0.8, w: 46, d: 34, r: 2 }; // forebay tank
const FB_H = 34;
const TURB = [44, 34]; // turbine axis
const PED_H = 8; // pedestal under the turbine
const HOUSING_R = 15;
const HOUSING = [PED_H, PED_H + 14];
const AXIS_Z = PED_H + 7; // volute and penstock centre height
const VOLUTE = { r0: 3, r1: 7 }; // tube radius along the spiral
const PEN_R = 7;
const GEN = { z0: 36, z1: 64, r: 18 };
const TAIL = { x0: 52, x1: 68 }; // tailrace from under the turbine back to the river
const TR = { x: 104, y: 18, w: 28, d: 30, r: 2 }; // transformer tank
const TR_H = 30;
const POLE = [156, -6];
const POLE_H = 96;
const DESK = { x: 90, y: 56, w: 48, d: 22, r: 3 }; // control desk with the power meter and the flow knob
const DESK_H = 18;
const DIAL = [105, 67];
const DIAL_R = 10;
const KNOB = [126, 68];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [POLE[0], POLE[1], POLE_H + 6], [TURB[0], TURB[1], GEN.z1 + 10], [FB.x, FB.y, FB_H]],
  W,
  HGT,
  { pad: 30, azimuth: AZIMUTH },
);
const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const UP = [0, 0, 1];
const frameUp = (x, y, z = 0) => G.frameOf([x, y, z], UP, [1, 0, 0], [0, 1, 0]);

// ---------- Recorder: every drawn item records its true shape, then the keys settle from geometry ----------

const R = A.recorder(P);
const back = [];
function put(name, centre, svg, shapes = [], bias = 0) {
  R.put({ piece: "plant", at: centre, bias, svg, move: [0, 0, 0], shapes: shapes.map((shape) => R.solid(shape)), name: R.nameFor(name) });
}
function box(name, plan, z, h, style = {}, { extra = "", steps = 3, bevel = 0.5, bias = 0, meta = {} } = {}) {
  const shape = A.slab(plan, z, h, { name, ...meta }, steps);
  put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style }) + extra, [shape], bias);
  return shape;
}
function post(name, x, y, r, z, h, style = {}, { extra = "", steps = 28, bevel = 0, bias = 0 } = {}) {
  put(name, [x, y, z + h / 2], S(k.cylinder(x, y, r, z, h, P, steps, bevel), { tone: "mid", ...style }) + extra, [A.cylinder(x, y, r, z, h, { name })], bias);
}
function turned(name, F, profile, style = {}, { extra = "", inner = "", bias = 0, smooth } = {}) {
  const soft = smooth ?? profile.some((point) => point[2]);
  const paths = G.solidOf(profile, F, P, { smooth: soft ? { rows: 4 } : false });
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  const shape = A.solid(F, profile, { name, curve: soft ? profile : undefined });
  put(name, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: "mid", ...style, inner }) + extra, [shape], bias);
  return shape;
}
function tube(name, route, r, { tone = "mid", gaps = [], caps = true, maxLength = 18, touch, ends } = {}) {
  R.route(name, route, r, { owner: name, gaps, touch, ends, piece: "plant", move: [0, 0, 0] });
  tubePieces(route, r, P, { maxLength, spacing: 1.4, gaps, caps }).forEach((part, index) =>
    R.put({ piece: "plant", at: part.mid, svg: tubeSvg(part, { tone }), move: [0, 0, 0], name: `${name}:${index}`, route: name, chunk: index, shapes: [R.solid(A.tube(part.points, part.radii, { name, owner: name }))] }),
  );
}
function flange(name, centre, axis, r, thick, { owner, bolts = 8 } = {}) {
  const F = G.frameAlong(centre, axis);
  const face = G.dot3(F.a, V) > 0 ? thick / 2 : -thick / 2;
  const dots = Math.abs(G.dot3(F.a, V)) > 0.12 && bolts ? Dots(G.dotsOf(F, face, r * 0.78, bolts, P, { all: true }), { size: 0.42, tone: "mid" }) : "";
  put(name, centre, S(G.disc(-thick / 2, thick / 2, r, F, P), { tone: "mid" }) + dots, [A.disc(F, -thick / 2, thick / 2, r, { name, owner })]);
}

// ---------- Base plate (static, behind everything) ----------

back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
for (const [x, y] of [...k.corners(PLATE, 24)].sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P))) {
  back.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
R.solid(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate" }));
back.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
const SCREWS = k.corners(PLATE, 11);
back.push(Ln(SCREWS.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }), Dots(SCREWS.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
// Ruler strip along the near edge, and a label plate.
const STRIP = { x: -100, y: PLATE.y + PLATE.d - 14, w: 230, d: 7, r: 1 };
back.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo" }));
const TICKS = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 4, 5, STRIP.y, 0.6, [2, 7], P);
back.push(Ln(TICKS.minor, { tone: "lo" }), Ln(TICKS.major, { tone: "mid" }));
back.push(Dots([at([STRIP.x + 2, STRIP.y + 3.5, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 3.5, 0.6])], { size: 0.45 }));
const LABEL = { x: -166, y: PLATE.y + PLATE.d - 40, w: 54, d: 26, r: 1.5 };
back.push(S(k.slabOf(LABEL, 0, 0.8, P, 3), { tone: "mid" }));
back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 3), { tone: "faint" }));
back.push(k.faceTextSvg(k.topMatrix([LABEL.x + 5, LABEL.y + 9], 0.8, P, "x"), "MICRO HYDRO", { size: 4.4, tone: "lo" }));
back.push(Ln([0, 1, 2].map((row) => k.onTop([[LABEL.x + 5, LABEL.y + 14 + row * 3.4], [LABEL.x + 5 + [38, 30, 22][row], LABEL.y + 14 + row * 3.4]], 0.8, P)).join(""), { tone: "lo", free: true }));
back.push(Dots([at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.8])], { size: 0.45 }));

// ---------- River channel: floor, two walls, end plates; the near wall has the intake and the tailrace outfall ----------

const CH_X = [PLATE.x + 6, PLATE.x + PLATE.w - 6];
box("channel.floor", { x: CH_X[0], y: CH.y0 - CH.wall, w: CH_X[1] - CH_X[0], d: CH.y1 - CH.y0 + 2 * CH.wall, r: 2 }, 0, CH.floor, { tone: "lo" });
box("channel.back-wall", { x: CH_X[0], y: CH.y0 - CH.wall, w: CH_X[1] - CH_X[0], d: CH.wall, r: 1 }, CH.floor, CH.h - CH.floor);
const nearWall = [[CH_X[0], INTAKE.x0], [INTAKE.x1, TAIL.x0], [TAIL.x1, CH_X[1]]];
// Expansion joints: full-height seams on the near face, every 36 units, and a cap seam under the coping.
const JOINT = 36;
nearWall.forEach(([x0, x1], i) => {
  const face = CH.y1 + CH.wall;
  const joints = [];
  for (let x = Math.ceil((x0 + 8) / JOINT) * JOINT; x < x1 - 8; x += JOINT) joints.push(k.segment([x, face, CH.floor], [x, face, CH.h], P));
  box(`channel.near-wall-${i}`, { x: x0, y: CH.y1, w: x1 - x0, d: CH.wall, r: 1 }, CH.floor, CH.h - CH.floor, {}, { extra: Ln(joints.join(""), { tone: "faint" }) });
});
// Coping along the top of both walls, a little proud of each face.
for (const [i, [x0, x1]] of [[0, [CH_X[0], WEIR_X - 6]], [1, [WEIR_X + 6, CH_X[1]]]]) {
  box(`channel.coping-back-${i}`, { x: x0, y: CH.y0 - CH.wall - 0.8, w: x1 - x0, d: CH.wall + 1.6, r: 0.8 }, CH.h, 1.6, { tone: "mid" }, { bevel: 0.3 });
}
for (const [i, [x0, x1]] of [[0, [CH_X[0], INTAKE.x0 - 1]], [1, [INTAKE.x1 + 1, WEIR_X - 6]], [2, [WEIR_X + 6, TAIL.x0]], [3, [TAIL.x1, CH_X[1]]]]) {
  box(`channel.coping-near-${i}`, { x: x0, y: CH.y1 - 0.8, w: x1 - x0, d: CH.wall + 1.6, r: 0.8 }, CH.h, 1.6, { tone: "mid" }, { bevel: 0.3 });
}
// Sills under the two openings: the intake sill is high (the forebay fills over it), the outfall sill is low.
box("channel.intake-sill", { x: INTAKE.x0, y: CH.y1, w: INTAKE.x1 - INTAKE.x0, d: CH.wall, r: 0.6 }, CH.floor, 6);
box("channel.outfall-sill", { x: TAIL.x0, y: CH.y1, w: TAIL.x1 - TAIL.x0, d: CH.wall, r: 0.6 }, CH.floor, 1.5);
for (const x of [CH_X[0], CH_X[1] - 5]) box(`channel.end-${x}`, { x, y: CH.y0, w: 5, d: CH.y1 - CH.y0, r: 1 }, CH.floor, x < 0 ? CH.h - CH.floor : LEVEL_DOWN - CH.floor);

// Water: a pale blue cavity token set (see CSS). High water upstream of the weir, low after it.
const WATER = "water";
// Flow lines on the surface run the length of the water, edge to edge; the live code sets their speed.
const flowLines = (plan, z, count) => {
  if (!count) return "";
  const lines = Array.from({ length: count }, (_, i) => {
    const y = plan.y + (plan.d * (i + 1)) / (count + 1);
    return k.lineOnTop([plan.x, y], [plan.x + plan.w, y], z, P);
  });
  return `<g class="flow">${Ln(lines.join(""), { tone: "blue", flow: true })}</g>`;
};
const waterBox = (name, plan, z0, z1, flows = 0) => box(name, plan, z0, z1 - z0, { tone: "lo", className: WATER, crease: "none" }, { bevel: 0, extra: flowLines(plan, z1, flows) });
waterBox("water.up", { x: CH_X[0] + 5, y: CH.y0, w: WEIR_X - 6 - CH_X[0] - 5, d: CH.y1 - CH.y0, r: 0.5 }, CH.floor, LEVEL_UP, 3);
// Below the weir the fish ladder takes the strip along the back wall, so the water there starts beside it.
const LADDER_END = WEIR_X + 30;
waterBox("water.down-beside", { x: WEIR_X + 6, y: CH.y0 + 8, w: LADDER_END - WEIR_X - 6, d: CH.y1 - CH.y0 - 8, r: 0.5 }, CH.floor, LEVEL_DOWN, 2);
waterBox("water.down", { x: LADDER_END, y: CH.y0, w: CH_X[1] - 5 - LADDER_END, d: CH.y1 - CH.y0, r: 0.5 }, CH.floor, LEVEL_DOWN, 3);

// Weir across the channel, with a lowered spillway crest and a walkway on top.
box("weir.body", { x: WEIR_X - 6, y: CH.y0, w: 12, d: CH.y1 - CH.y0, r: 1 }, CH.floor, CREST - CH.floor, {}, { bevel: 0.6 });
box("weir.pier-back", { x: WEIR_X - 6, y: CH.y0, w: 12, d: 8, r: 1 }, CREST, CH.h + 4 - CREST);
box("weir.pier-near", { x: WEIR_X - 6, y: CH.y1 - 8, w: 12, d: 8, r: 1 }, CREST, CH.h + 4 - CREST);
box("weir.walkway", { x: WEIR_X - 4, y: CH.y0 - CH.wall, w: 8, d: CH.y1 - CH.y0 + 2 * CH.wall, r: 1 }, CH.h + 4, 2.2, {}, { extra: Dots([CH.y0 + 2, CH.y1 - 2].map((y) => at([WEIR_X, y, CH.h + 6.2])), { size: 0.42 }) });

// ---------- Intake, trash rack and forebay ----------

const RACK_Z = [CH.floor + 6, CH.h];
for (let i = 0; i <= 8; i++) {
  const x = INTAKE.x0 + 2 + (i * (INTAKE.x1 - INTAKE.x0 - 4)) / 8;
  post(`rack.bar-${i}`, x, CH.y1 + CH.wall / 2, 0.7, RACK_Z[0], RACK_Z[1] - RACK_Z[0], { tone: "mid", crease: "none" }, { steps: 10 });
}
box("rack.top-beam", { x: INTAKE.x0, y: CH.y1, w: INTAKE.x1 - INTAKE.x0, d: CH.wall, r: 0.6 }, CH.h, 2.4, {}, { extra: Dots([INTAKE.x0 + 3, INTAKE.x1 - 3].map((x) => at([x, CH.y1 + CH.wall / 2, CH.h + 2.4])), { size: 0.4 }) });
// Forebay: an open tank in front of the intake. Water stands at the head-water level.
box("forebay.floor", FB, 0, CH.floor, { tone: "lo" });
box("forebay.wall-left", { x: FB.x, y: FB.y, w: 4, d: FB.d - 4, r: 0.8 }, CH.floor, FB_H - CH.floor);
waterBox("water.forebay", { x: FB.x + 4, y: FB.y, w: FB.w - 8, d: FB.d - 4, r: 0.5 }, CH.floor, LEVEL_UP);
box("forebay.wall-right", { x: FB.x + FB.w - 4, y: FB.y, w: 4, d: FB.d - 4, r: 0.8 }, CH.floor, FB_H - CH.floor);
box("forebay.wall-near", { x: FB.x, y: FB.y + FB.d - 4, w: FB.w, d: 4, r: 0.8 }, CH.floor, FB_H - CH.floor, {}, {
  extra: Ln(k.sideSeam({ x: FB.x, y: FB.y + FB.d - 4, w: FB.w, d: 4, r: 0.8 }, 12, P, 3), { tone: "faint" }),
});
// Head ruler on the forebay's near face: a strip with ticks every 2, a major every 10, up to the water level.
const RULER = { x: FB.x + 6, y: FB.y + FB.d, w: 5, d: 0.8, r: 0.3 };
box("forebay.ruler", RULER, CH.floor, FB_H - CH.floor - 4, { tone: "lo" }, { bevel: 0, extra: (() => {
  // Ticks every 2 units, rooted on the strip's left edge; a major every 10, and a mark at the water level.
  const face = RULER.y + RULER.d;
  const minor = [], major = [];
  for (let z = CH.floor + 2; z <= FB_H - 6; z += 2) ((z - CH.floor) % 10 === 0 ? major : minor).push(k.segment([RULER.x, face, z], [RULER.x + ((z - CH.floor) % 10 === 0 ? 3.6 : 2), face, z], P));
  return Ln(minor.join(""), { tone: "lo" }) + Ln(major.join(""), { tone: "mid" }) + Ln(k.segment([RULER.x, face, LEVEL_UP], [RULER.x + RULER.w - 1, face, LEVEL_UP], P), { tone: "blue", free: "end" });
})() });

// ---------- Fish ladder: a stepped pass beside the weir, behind the back pier ----------

const LADDER = { y0: CH.y0, y1: CH.y0 + 8 };
[[WEIR_X + 6, 15], [WEIR_X + 14, 12], [WEIR_X + 22, 9.5]].forEach(([x, h], i) => {
  box(`ladder.step-${i}`, { x, y: LADDER.y0, w: 8, d: LADDER.y1 - LADDER.y0, r: 0.6 }, CH.floor, h - CH.floor, { tone: "mid" }, { bevel: 0.4 });
  waterBox(`water.ladder-${i}`, { x: x + 1.2, y: LADDER.y0 + 1.2, w: 5.6, d: LADDER.y1 - LADDER.y0 - 2.4, r: 0.4 }, h, h + 1.4);
});

// ---------- Intake gate: a slide gate raised in its guides, a spindle and a handwheel ----------

const GATE_TOP = CH.h + 18;
for (const x of [INTAKE.x0 - 1, INTAKE.x1 - 3]) box(`gate.guide-${x}`, { x, y: CH.y1 + 0.5, w: 4, d: CH.wall - 1, r: 0.6 }, CH.h + 2.4, GATE_TOP - CH.h - 2.4);
box("gate.leaf", { x: INTAKE.x0 + 3, y: CH.y1 + 1.4, w: INTAKE.x1 - INTAKE.x0 - 6, d: 2.2, r: 0.4 }, CH.h + 4, 9, { tone: "hi" }, { extra: Dots([INTAKE.x0 + 6, INTAKE.x1 - 6].map((x) => at([x, CH.y1 + 3.6, CH.h + 11])), { size: 0.4 }) });
box("gate.crosshead", { x: INTAKE.x0 - 2, y: CH.y1, w: INTAKE.x1 - INTAKE.x0 + 4, d: CH.wall, r: 0.8 }, GATE_TOP, 3, {}, { extra: Dots([INTAKE.x0 + 1, INTAKE.x1 - 1].map((x) => at([x, CH.y1 + CH.wall / 2, GATE_TOP + 3])), { size: 0.42 }) });
const SPINDLE = [(INTAKE.x0 + INTAKE.x1) / 2, CH.y1 + CH.wall / 2];
post("gate.spindle", SPINDLE[0], SPINDLE[1], 1, CH.h + 13, GATE_TOP - CH.h - 13, { crease: "none" }, { steps: 12 });
post("gate.spindle-top", SPINDLE[0], SPINDLE[1], 1, GATE_TOP + 3, 4, { crease: "none" }, { steps: 12 });
post("gate.hub", SPINDLE[0], SPINDLE[1], 2.2, GATE_TOP + 7, 2, {}, { steps: 16 });
const spokes = [0, 1, 2].map((i) => {
  const a = (i * Math.PI * 2) / 3 + 0.3;
  return k.lineOnTop([SPINDLE[0] + Math.cos(a) * 2.2, SPINDLE[1] + Math.sin(a) * 2.2], [SPINDLE[0] + Math.cos(a) * 5.4, SPINDLE[1] + Math.sin(a) * 5.4], GATE_TOP + 10.4, P);
});
post("gate.wheel", SPINDLE[0], SPINDLE[1], 7, GATE_TOP + 9, 1.4, { tone: "mid" }, { steps: 40, extra: Ln(k.ring(SPINDLE[0], SPINDLE[1], 5.4, GATE_TOP + 10.4, P, 40), { tone: "lo" }) + Ln(spokes.join("") + k.ring(SPINDLE[0], SPINDLE[1], 2.2, GATE_TOP + 10.4, P, 16), { tone: "lo" }) });

// ---------- Walkway railing over the weir ----------

for (const dx of [-3.4, 3.4]) {
  const ys = [CH.y0 - CH.wall + 1.2, (CH.y0 + CH.y1) / 2, CH.y1 + CH.wall - 1.2];
  ys.forEach((y, i) => post(`rail.post-${dx}-${i}`, WEIR_X + dx, y, 0.55, CH.h + 6.2, 9, { crease: "none" }, { steps: 8 }));
  const bars = [CH.h + 15.2, CH.h + 10.8].map((z) => k.segment([WEIR_X + dx, ys[0] - 0.55, z], [WEIR_X + dx, ys[2] + 0.55, z], P)).join("");
  put(`rail.bar-${dx}`, [WEIR_X + dx, (CH.y0 + CH.y1) / 2, CH.h + 15], Ln(bars, { tone: "mid" }), [A.tube([[WEIR_X + dx, ys[0], CH.h + 15.2], [WEIR_X + dx, ys[2], CH.h + 15.2]], 0.3, { name: `rail.bar-${dx}` })], 0.2);
}

// ---------- Penstock: forebay to the turbine's spiral case ----------

// The volute is written in the water's direction: a straight inlet leg heading -y, then the spiral from its
// large end at angle PI (pointing at -x) once 300° round the housing, narrowing, into the housing.
// The 60° it leaves open is where the inlet leg comes in, clear of the spiral's narrow end.
const SPAN = (Math.PI * 5) / 3;
const centreR = (t) => HOUSING_R + VOLUTE.r1 - (VOLUTE.r1 - VOLUTE.r0) * t + 0.3;
const spiralPts = Array.from({ length: 41 }, (_, i) => {
  const t = i / 40;
  const a = Math.PI + SPAN * t;
  const r = centreR(t);
  return [TURB[0] + r * Math.cos(a), TURB[1] + r * Math.sin(a), AXIS_Z];
});
const LARGE = spiralPts[0];
const INLET_LEG = 12;
const INLET = [LARGE[0], LARGE[1] + INLET_LEG, AXIS_Z];
const legPts = Array.from({ length: 7 }, (_, i) => [LARGE[0], LARGE[1] + INLET_LEG - (i * INLET_LEG) / 7, AXIS_Z]);
const voluteRoute = [...legPts, ...spiralPts];
const voluteLength = G.pathLength(voluteRoute);
const legLength = INLET_LEG;
const voluteR = (t) => {
  const along = t * voluteLength;
  return along <= legLength ? VOLUTE.r1 : VOLUTE.r1 - (VOLUTE.r1 - VOLUTE.r0) * ((along - legLength) / (voluteLength - legLength));
};
// Where the spiral passes behind the housing's silhouette, its chunks must end, so each one sorts cleanly.
const silhouette = (Math.atan2(k.towardViewer(P)[1], k.towardViewer(P)[0]) - Math.PI / 2 + Math.PI * 4) % (Math.PI * 2);
const voluteBreaks = [silhouette, silhouette + Math.PI, silhouette + Math.PI * 2]
  .map((a) => (a - Math.PI) / SPAN)
  .filter((t) => t > 0.02 && t < 0.98)
  .map((t) => legLength + G.pathLength(spiralPts.slice(0, Math.round(t * 40) + 1)));
// The penstock leaves the forebay's near face, runs along the front of the base and turns into the inlet leg.
// A pipe this thick, bent in the floor plane and seen from 30° up, pinches on screen, so it turns inside
// two cast elbows (balls); each straight run ends with its rim on the ball.
const PORT = [FB.x + 22, FB.y + FB.d, AXIS_Z];
const RUN_Y = 58;
const ELBOW_R = PEN_R * 1.4;
const SEAT = Math.sqrt(ELBOW_R ** 2 - PEN_R ** 2); // a run ends this far from the ball's centre
const C1 = [PORT[0], RUN_Y, AXIS_Z];
const C2 = [INLET[0], RUN_Y, AXIS_Z];
const FL = 2.2;
const runs = [
  ["penstock-a", [PORT, [C1[0], C1[1] - SEAT, AXIS_Z]], [true, false]],
  ["penstock-b", [[C1[0] + SEAT, RUN_Y, AXIS_Z], [C2[0] - SEAT, RUN_Y, AXIS_Z]], [false, false]],
  ["penstock-c", [[C2[0], C2[1] - SEAT, AXIS_Z], INLET], [false, true]],
];
for (const centre of [C1, C2]) {
  const name = `penstock.elbow-${centre[0].toFixed(0)}`;
  put(name, centre, S(G.sphereOf(centre, ELBOW_R, P, { steps: 48 }), { tone: "mid" }), [A.ball(centre, ELBOW_R, { name, owner: "penstock" })]);
}
// Saddles under the long straight run.
const runB = runs[1][1];
const saddles = [0.25, 0.7].map((share) => {
  const x = runB[0][0] + (runB[1][0] - runB[0][0]) * share;
  return box(`penstock.saddle-${share}`, { x: x - 3, y: RUN_Y - 6, w: 6, d: 12, r: 1 }, 0, AXIS_Z - PEN_R, { tone: "mid" });
});
// A butterfly valve on the long run: a bulged body across the pipe, a neck, and a gearbox with a handwheel.
const VALVE_AT = runB[0][0] + (runB[1][0] - runB[0][0]) * 0.47;
const VL = PEN_R * 1.5; // half length of the valve body
{
  const F = G.frameOf([VALVE_AT, RUN_Y, AXIS_Z], [1, 0, 0], [0, 1, 0], UP);
  const crown = PEN_R * 1.42;
  const bulge = (x) => PEN_R * 1.2 + (crown - PEN_R * 1.2) * Math.sqrt(Math.max(0, 1 - (x / VL) ** 2));
  const bulgeSlope = (x) => {
    if (Math.abs(x) >= VL - 1e-9) return 0;
    const t = Math.max(-0.995, Math.min(0.995, x / VL));
    return (-(crown - PEN_R * 1.2) * t) / (VL * Math.sqrt(1 - t * t));
  };
  const meridian = [[-VL, 0], [-VL, PEN_R * 1.2], ...Array.from({ length: 13 }, (_, i) => {
    const x = VL * Math.sin(((i - 6) / 6) * (Math.PI / 2));
    return [x, bulge(x), i && i < 12 ? 1 : 0];
  }), [VL, PEN_R * 1.2], [VL, 0]];
  const bolts = [...G.dotsOf(F, -VL, PEN_R * 1.05, 8, P, { all: true }), ...G.dotsOf(F, VL, PEN_R * 1.05, 8, P, { all: true })];
  put("valve.body", [VALVE_AT, RUN_Y, AXIS_Z], S(G.lathe(meridian, F, P, { steps: 40, smooth: { slope: bulgeSlope, rows: 3 } }), { tone: "mid" }) + Dots(bolts, { size: 0.4, tone: "mid" }), [A.body(F, meridian, { name: "valve.body", owner: "penstock-b" })]);
  const top = AXIS_Z + crown - 0.3;
  post("valve.neck", VALVE_AT, RUN_Y, 2.6, top, 4, {}, { steps: 20 });
  const gear = { x: VALVE_AT - 5, y: RUN_Y - 5, w: 10, d: 10, r: 1.2 };
  box("valve.gearbox", gear, top + 4, 6, { tone: "hi" }, { extra: Ln(k.planOutline(k.insetPlan(gear, 1.2), top + 10, P, 3), { tone: "faint" }) + Dots([at([gear.x + 1.6, gear.y + 1.6, top + 10]), at([gear.x + gear.w - 1.6, gear.y + gear.d - 1.6, top + 10])], { size: 0.4 }) });
  post("valve.stem", VALVE_AT, RUN_Y, 0.9, top + 10, 4, { crease: "none" }, { steps: 10 });
  const hub = [VALVE_AT, RUN_Y];
  const spokes = [0, 1, 2].map((i) => {
    const a = (i * Math.PI * 2) / 3 + 0.9;
    return k.lineOnTop([hub[0] + Math.cos(a) * 1.6, hub[1] + Math.sin(a) * 1.6], [hub[0] + Math.cos(a) * 4.6, hub[1] + Math.sin(a) * 4.6], top + 15.2, P);
  });
  post("valve.handwheel", hub[0], hub[1], 6, top + 14, 1.2, { tone: "mid" }, { steps: 36, extra: Ln(k.ring(hub[0], hub[1], 4.6, top + 15.2, P, 36) + spokes.join(""), { tone: "lo" }) + Ln(k.ring(hub[0], hub[1], 1.6, top + 15.2, P, 14), { tone: "lo" }) });
}
for (const [name, ends, flanged] of runs) {
  const route = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => G.lerp3(ends[0], ends[1], i / 8));
  const total = G.pathLength(route);
  const gaps = [flanged[0] ? [0, FL] : null, flanged[1] ? [total - FL, total] : null].filter(Boolean);
  if (name === "penstock-b") gaps.push([VALVE_AT - VL - ends[0][0], VALVE_AT + VL - ends[0][0]]);
  tube(name, route, PEN_R, { gaps, maxLength: 16, touch: [...saddles.map((shape) => shape.name), "penstock.elbow*"] });
  const axis = G.unit3(G.sub3(ends[1], ends[0]));
  if (flanged[0]) flange(`${name}.flange-in`, G.add3(ends[0], G.mul3(axis, FL / 2)), axis, PEN_R * 1.25, FL, { owner: name });
  if (flanged[1]) flange(`${name}.flange-out`, G.add3(ends[1], G.mul3(axis, -FL / 2)), axis, PEN_R * 1.25, FL, { owner: name });
}

// ---------- Turbine: plinth, housing, volute, generator ----------

const HF = frameUp(TURB[0], TURB[1], 0);
turned("turbine.plinth", HF, [[0, 0], [0, HOUSING_R + 1], [PED_H, HOUSING_R + 1], [PED_H, 0]], { tone: "mid" }, {
  extra: Dots(G.dotsOf(HF, PED_H, HOUSING_R - 1, 12, P, { all: true }), { size: 0.4 }),
});
const housing = turned("turbine.housing", HF, [[HOUSING[0], 0], [HOUSING[0], HOUSING_R], [HOUSING[1], HOUSING_R], [HOUSING[1], 0]], { tone: "mid" }, {
  inner: Ln(G.arcOf(HF, AXIS_Z, HOUSING_R, P), { tone: "faint" }),
  extra: Dots(G.dotsOf(HF, HOUSING[1], HOUSING_R - 2.4, 16, P, { all: true }), { size: 0.4 }),
});
// Two flanges, one joint: the volute's own inlet flange meets the penstock's face to face.
flange("volute.flange-in", G.add3(INLET, [0, -FL / 2, 0]), [0, -1, 0], PEN_R * 1.25, FL, { owner: "volute" });
R.route("volute", voluteRoute, voluteR, { owner: "volute", gaps: [[0, FL]], touch: ["turbine.housing", "turbine.plinth"], piece: "plant", move: [0, 0, 0], ends: [true, false], rims: [PEN_R * 1.25, VOLUTE.r0] });
tubePieces(voluteRoute, voluteR, P, { maxLength: 14, spacing: 1.2, gaps: [[0, FL]], caps: [true, false], breaks: voluteBreaks }).forEach((part, index) =>
  R.put({ piece: "plant", at: part.mid, svg: tubeSvg(part, { tone: "mid" }), move: [0, 0, 0], name: `volute:${index}`, route: "volute", chunk: index, shapes: [R.solid(A.tube(part.points, part.radii, { name: "volute", owner: "volute" }))] }),
);
// Head cover and the generator stand (a spool), then the generator, exciter and its turning marker.
turned("turbine.head-cover", HF, [[HOUSING[1], 0], [HOUSING[1], 12], [HOUSING[1] + 3, 12], [HOUSING[1] + 3, 0]], { tone: "mid" });
const STAND = [[HOUSING[1] + 3, 0], [HOUSING[1] + 3, 9], [HOUSING[1] + 5, 9], [HOUSING[1] + 5, 6], [GEN.z0 - 2, 6], [GEN.z0 - 2, 10], [GEN.z0, 10], [GEN.z0, 0]];
turned("turbine.stand", HF, STAND, { tone: "mid" });
const ribs = G.ribsOf(HF, GEN.z0 + 4, GEN.z1 - 4, GEN.r, 40, P, { fade: [0.1, 0.55], seams: true });
const generator = turned("generator.body", HF, [[GEN.z0, 0], [GEN.z0, GEN.r], [GEN.z1, GEN.r], [GEN.z1, 0]], { tone: "hi" }, { extra: k.fadedSvg(ribs, { tone: "lo" }) });
turned("generator.top", HF, [[GEN.z1, 0], [GEN.z1, 12], [GEN.z1 + 3, 12], [GEN.z1 + 3, 8], [GEN.z1 + 7, 8], [GEN.z1 + 7, 0]], { tone: "mid" }, {
  extra: Dots(G.dotsOf(HF, GEN.z1, 15, 12, P, { all: true }), { size: 0.4 }),
});
// Terminal box on the generator's +x side, where the cables leave.
// Its flat back is cut to the generator's round side (a saddle), so it sits on the body instead of floating off it.
const TB = { x: TURB[0] + GEN.r - 1.2, y: TURB[1] - 5, w: 9.2, d: 10, r: 1 };
box("generator.terminal-box", TB, 46, 10, {}, { meta: { seated: true, cut: generator }, extra: Dots([at([TB.x + 5, TB.y + 2, 56]), at([TB.x + 5, TB.y + TB.d - 2, 56])], { size: 0.4 }) });

// Tailrace: an open channel from the draft tube under the plinth back into the river.
const TAIL_Y1 = TURB[1] - HOUSING_R - 1;
box("tailrace.floor", { x: TAIL.x0 - 3, y: CH.y1 + CH.wall, w: TAIL.x1 - TAIL.x0 + 6, d: TAIL_Y1 - CH.y1 - CH.wall, r: 1 }, 0, 1.5, { tone: "lo" });
waterBox("water.tailrace", { x: TAIL.x0, y: CH.y1 + CH.wall, w: TAIL.x1 - TAIL.x0, d: TAIL_Y1 - CH.y1 - CH.wall, r: 0.5 }, 1.5, LEVEL_DOWN - 3);
for (const x of [TAIL.x0 - 3, TAIL.x1]) box(`tailrace.wall-${x}`, { x, y: CH.y1 + CH.wall, w: 3, d: TAIL_Y1 - CH.y1 - CH.wall, r: 0.6 }, 1.5, 4);

// ---------- Transformer, cables, pole ----------

box("transformer.skid", k.insetPlan(TR, -3), 0, 3, { tone: "lo" });
box("transformer.tank", TR, 3, TR_H - 3, { tone: "hi" }, {
  bevel: 0.6,
  extra: Ln(k.sideSeam(TR, 10, P, 3) + k.sideSeam(TR, TR_H - 6, P, 3), { tone: "faint" }),
});
for (let i = 0; i < 5; i++) box(`transformer.fin-${i}`, { x: TR.x + 4 + i * 5, y: TR.y + TR.d, w: 2, d: 5, r: 0.4 }, 6, TR_H - 12, { tone: "mid" });
const CF = G.frameOf([TR.x + TR.w / 2 - 12, TR.y + 6, TR_H + 9], [1, 0, 0], [0, 1, 0], UP);
turned("transformer.conservator", CF, [[0, 0], [0, 4.2, 0], [24, 4.2], [24, 0]], { tone: "mid" });
box("transformer.conservator-leg", { x: TR.x + TR.w / 2 - 1.5, y: TR.y + 4.5, w: 3, d: 3, r: 0.5 }, TR_H, 5);
const HV = [0, 1, 2].map((i) => [TR.x + 7 + i * 7, TR.y + TR.d - 9]);
HV.forEach(([x, y], i) => {
  const F = frameUp(x, y, TR_H);
  const prof = [[0, 0], [0, 2.6], [2, 2.6], [2, 1.4], [3, 3.0, 1], [4, 1.4], [6, 1.4], [7, 3.0, 1], [8, 1.4], [10, 1.4], [11, 3.0, 1], [12, 1.4], [14, 1.4], [14, 0]];
  turned(`transformer.bushing-${i}`, F, prof, { tone: "hi" }, { smooth: false });
});
const LVBOX = { x: TR.x - 6, y: TR.y + 8, w: 6, d: 14, r: 1 };
box("transformer.lv-box", LVBOX, 10, 12);
// Three generator cables: terminal box down and across into the transformer's low-voltage box.
[-3, 0, 3].forEach((dy, i) => {
  const start = [TB.x + TB.w, TB.y + TB.d / 2 + dy, 51];
  const end = [LVBOX.x, LVBOX.y + LVBOX.d / 2 + dy, 16];
  const mid = (TB.x + TB.w + LVBOX.x) / 2 + (i - 1) * 2.2;
  const route = G.fillet([start, [mid, start[1], 51], [mid, end[1], 16], end], 4, 8, { P, tube: 0.9 });
  tube(`cable-${i}`, route, 0.9, { tone: "lo", maxLength: 40 });
});
// Pole with a cross-arm and insulators.
box("pole.foot", { x: POLE[0] - 7, y: POLE[1] - 7, w: 14, d: 14, r: 2 }, 0, 4, {}, { extra: Dots(k.corners({ x: POLE[0] - 7, y: POLE[1] - 7, w: 14, d: 14, r: 2 }, 2.6).map(([x, y]) => at([x, y, 4])), { size: 0.42 }) });
post("pole.post", POLE[0], POLE[1], 3, 4, POLE_H - 12, { crease: "none" }, { steps: 20 });
box("pole.arm", { x: POLE[0] - 2, y: POLE[1] - 22, w: 4, d: 44, r: 1 }, POLE_H - 8, 3.4);
const INSUL = [-18, 0, 18].map((dy) => [POLE[0], POLE[1] + dy]);
INSUL.forEach(([x, y], i) => turned(`pole.insulator-${i}`, frameUp(x, y, POLE_H - 4.6), [[0, 0], [0, 1.6], [1.4, 1.6], [2, 2.8, 1], [3, 1.6], [4.4, 1.6], [5, 2.8, 1], [6, 1.4], [6, 0]], { tone: "hi" }, { smooth: false }));

// ---------- Control desk: the power meter and the river-flow knob ----------

box("desk.body", DESK, 0, DESK_H, {}, { bevel: 0.8, steps: 4 });
box("desk.top", k.insetPlan(DESK, -1.2), DESK_H, 2, { tone: "mid" }, { extra: Ln(k.planOutline(k.insetPlan(DESK, 2.4), DESK_H + 2, P, 3), { tone: "faint" }) });
const DTOP = DESK_H + 2;
post("meter.bezel", DIAL[0], DIAL[1], DIAL_R, DTOP, 4, { tone: "hi", crease: "lo" }, { steps: 64, bevel: 0.6, extra: (() => {
  const t = k.radialTicks(DIAL[0], DIAL[1], DIAL_R - 2.4, 40, 5, DTOP + 4, [1.2, 2.4], P, -Math.PI * 0.75, Math.PI * 1.5);
  return Ln(k.ring(DIAL[0], DIAL[1], DIAL_R - 1.6, DTOP + 4, P, 64), { tone: "lo" }) + Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" });
})() });
post("knob", KNOB[0], KNOB[1], 6, DTOP, 5, { tone: "mid" }, { steps: 32, extra: Ln(k.knurl(KNOB[0], KNOB[1], 6, DTOP, DTOP + 5, 36, P), { tone: "lo" }) });
// Two indicator lamps on the desk: running (green) and grid connected (red).
[["green", DESK.x + DESK.w - 3.4, DESK.y + 5], ["red", DESK.x + DESK.w - 3.4, DESK.y + 17]].forEach(([tone, x, y]) =>
  post(`desk.lamp-${tone}`, x, y, 1.6, DTOP, 1.6, { tone: "mid" }, { steps: 16, extra: Ln(k.ring(x, y, 1, DTOP + 1.6, P, 14), { tone }) }),
);
// Name plate on the transformer's +x face, with three rule lines standing for printed text.
{
  const x = TR.x + TR.w;
  box("transformer.nameplate", { x, y: TR.y + 9, w: 0.8, d: 12, r: 0.2 }, 13, 8, { tone: "mid", crease: "none" }, { bevel: 0, extra: Ln([0, 1, 2].map((row) => k.segment([x + 0.8, TR.y + 11, 19 - row * 2], [x + 0.8, TR.y + 11 + [8, 6, 7][row], 19 - row * 2], P)).join(""), { tone: "lo", free: true }) });
}

// ---------- Live parts (outside the sorted layer, drawn last) ----------

const needleAt = (kW) => {
  const share = Math.max(0, Math.min(1, kW / 100));
  const angle = -Math.PI * 0.75 + share * Math.PI * 1.5;
  return k.lineOnTop([DIAL[0] - Math.sin(angle) * 2, DIAL[1] + Math.cos(angle) * 2], [DIAL[0] + Math.sin(angle) * (DIAL_R - 3), DIAL[1] - Math.cos(angle) * (DIAL_R - 3)], DTOP + 4.2, P);
};
const knobAt = (flow) => {
  const angle = -Math.PI * 0.75 + (flow / FLOW_MAX) * Math.PI * 1.5;
  return k.lineOnTop([KNOB[0], KNOB[1]], [KNOB[0] + Math.sin(angle) * 5, KNOB[1] - Math.cos(angle) * 5], DTOP + 5.1, P);
};
const markerAt = (turn) => {
  const a = turn * Math.PI * 2;
  return k.lineOnTop([TURB[0] + Math.cos(a) * 2, TURB[1] + Math.sin(a) * 2], [TURB[0] + Math.cos(a) * 7, TURB[1] + Math.sin(a) * 7], GEN.z1 + 7.1, P);
};
// Spill: the water over the weir crest, a curtain on the weir's downstream face between the piers,
// thicker with more spilled flow. It sits in the sorted layer; the live code rewrites its path.
const SPILL_Y = [CH.y0 + 8, CH.y1 - 8];
const spillAt = (spilled) => {
  const t = Math.min(1, spilled / 6);
  if (t < 0.01) return "M0 0";
  const x0 = WEIR_X + 6.2;
  const top = CREST + 0.8 + 2.6 * t;
  const reach = 3 + 9 * t;
  const [y0, y1] = SPILL_Y;
  const pts = [[WEIR_X - 6, y0, LEVEL_UP], [WEIR_X - 6, y1, LEVEL_UP], [x0, y1, top], [x0 + reach * 0.45, y1, (top + LEVEL_DOWN) / 2 + 1], [x0 + reach, y1, LEVEL_DOWN], [x0 + reach, y0, LEVEL_DOWN], [x0 + reach * 0.45, y0, (top + LEVEL_DOWN) / 2 + 1], [x0, y0, top]];
  return "M" + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
};
put("water.spill", [WEIR_X + 4, (SPILL_Y[0] + SPILL_Y[1]) / 2, (CREST + LEVEL_DOWN) / 2], `<path data-part="spill" class="spill" d="${spillAt(H.operate(SETUP, 3, 0).spilledFlow)}"/>`, [A.box([WEIR_X - 6, SPILL_Y[0], CREST], [WEIR_X + 6, SPILL_Y[1], CREST + 3.4], { name: "water.spill" }), A.box([WEIR_X + 6, SPILL_Y[0], LEVEL_DOWN], [WEIR_X + 18, SPILL_Y[1], CREST + 3.4], { name: "water.spill" })], 0.5);

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const op0 = H.operate(SETUP, 3, 0);
const front = R.items.map((item) => item.svg).join("");
const live = [
  `<path data-part="needle" class="iso-line" data-tone="hi" data-free="start" d="${needleAt(op0.powerKW)}" style="stroke-width:1.1"/>`,
  `<path data-part="knob" class="iso-line" data-tone="hi" data-free="end" d="${knobAt(3)}" style="stroke-width:1"/>`,
  `<path data-part="marker" class="iso-line" data-tone="lit" data-free="both" d="${markerAt(0)}" style="stroke-width:1.2"/>`,
  // Overhead lines from the bushings to the pole's insulators.
  ...HV.map(([x, y], i) => k.wireSvg(at([x, y, TR_H + 14]), at([INSUL[i][0], INSUL[i][1], POLE_H + 1.4]), { tone: "mid", via: [at([(x + INSUL[i][0]) / 2, (y + INSUL[i][1]) / 2, (TR_H + 14 + POLE_H) / 2 - 6])] })),
].join("");

const svg = k.figureSvg({
  width: W,
  height: HGT,
  label: "A bench model of a run-of-river micro hydro plant. A river channel crosses the base; a weir holds the water back and the surplus spills over its crest. Through a trash rack the water fills a forebay, falls through a penstock into the spiral case of a Kaplan turbine and leaves by a tailrace. The generator above it feeds a transformer and a pole; a desk carries the power meter and the river-flow knob.",
  body: [...back, front, live],
});

const CSS = `
.water{--anatomy-paper:#16263a;--anatomy-face:#1d3350;--anatomy-top:#24426a;--anatomy-shade-0:#13233a;--anatomy-shade-1:#162a44;--anatomy-shade-2:#19304e;--anatomy-shade-3:#1c3658}
.iso[data-theme="light"] .water{--anatomy-paper:#dbe8f5;--anatomy-face:#e8f1fa;--anatomy-top:#cfe1f3;--anatomy-shade-0:#bcd3ec;--anatomy-shade-1:#c6daef;--anatomy-shade-2:#d0e0f2;--anatomy-shade-3:#d8e6f4}
.spill{fill:#2a4f7e;opacity:.85;stroke:var(--anatomy-blue);stroke-width:var(--anatomy-weight);stroke-linejoin:round}
.flow .iso-line[data-flow]{animation:flow var(--flow-dur,2s) linear infinite;opacity:.55}
@keyframes flow{to{stroke-dashoffset:-16}}
@media (prefers-reduced-motion:reduce){.flow .iso-line[data-flow]{animation:none}}
.iso[data-theme="light"] .spill{fill:#b9d3ee;opacity:.95}
`;

const LIVE = `
const TABLE = ${JSON.stringify(TABLE.map((row) => row.map((v) => +v.toFixed(4))))};
const FLOW_MAX = ${FLOW_MAX}, INSTALLED = ${INSTALLED.toFixed(2)};
const P = ${JSON.stringify(P)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const parts = Object.fromEntries([...svg.querySelectorAll("[data-part]")].map((el) => [el.dataset.part, el]));
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const needleAt = ${needleAt.toString().replaceAll("k.lineOnTop", "lineOnTop")};
const knobAt = ${knobAt.toString().replaceAll("k.lineOnTop", "lineOnTop")};
const markerAt = ${markerAt.toString().replaceAll("k.lineOnTop", "lineOnTop")};
const at = (point) => iso(point, P);
const spillAt = ${spillAt.toString()};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DTOP = ${DTOP}, KNOB = ${JSON.stringify(KNOB)}, TURB = ${JSON.stringify(TURB)}, GEN = ${JSON.stringify(GEN)};
const WEIR_X = ${WEIR_X}, CREST = ${CREST}, LEVEL_UP = ${LEVEL_UP}, LEVEL_DOWN = ${LEVEL_DOWN}, CH = ${JSON.stringify(CH)}, SPILL_Y = ${JSON.stringify(SPILL_Y)};
const lookup = (flow) => {
  const x = Math.max(0, Math.min(FLOW_MAX, flow)) / FLOW_MAX * (TABLE.length - 1);
  const i = Math.min(TABLE.length - 2, Math.floor(x)), f = x - i;
  return TABLE[i].map((v, j) => v + (TABLE[i + 1][j] - v) * f);
};
let flow = 3, target = 3, needle = lookup(3)[5], turn = 0, last = 0, frame = 0, visible = false, touring = true, clock = 0, idle = 0;
const TOUR = [3, 0.9, 3, 6.5, 9, 3];
function draw() {
  const [f, used, spilled, eco, eta, kW] = lookup(flow);
  parts.needle.setAttribute("d", needleAt(needle));
  parts.knob.setAttribute("d", knobAt(flow));
  parts.marker.setAttribute("d", markerAt(turn));
  parts.spill.setAttribute("d", spillAt(spilled));
  // Surface speed grows with the river: a full dash cycle every 4 s at a trickle, every 0.5 s in a flood.
  const dur = (4 / (0.5 + f)).toFixed(2) + "s";
  if (stage.style.getPropertyValue("--flow-dur") !== dur) stage.style.setProperty("--flow-dur", dur);
  const text = "river " + f.toFixed(1) + " m³/s · turbine " + used.toFixed(1) + " · " + (eta * 100).toFixed(0) + "% · " + kW.toFixed(0) + " kW";
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = TOUR[Math.floor(clock / 2.6) % TOUR.length]; }
  flow += (target - flow) * (1 - Math.exp(-dt / 0.6));
  needle += (lookup(flow)[5] - needle) * (1 - Math.exp(-dt / 0.35));
  turn = (turn + dt * 0.35) % 1; // the generator runs at a steady synchronous speed, shown slowed down
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  touring = false; clearTimeout(idle);
  target = Math.max(0, Math.min(1, ((event.clientX - box.left) / box.width - 0.15) / 0.7)) * FLOW_MAX;
  idle = setTimeout(() => { touring = true; clock = 0; run(); }, 4000);
  run();
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Micro hydro",
  hint: "Hover left to right to change the river",
  readout: "river 3.0 m³/s",
  keys: [
    { mark: "raised", label: "Kaplan turbine and generator: 5 m of head, design flow 2 m³/s" },
    { mark: "lit", label: "Generator marker: it turns at a steady speed; the power follows the water" },
  ],
  caption: `Water held back by the weir falls 5 m through the penstock into a Kaplan turbine (efficiency curve from RETScreen, generator 95%, transformer 1% loss). The turbine takes at most 2 m³/s; the rest spills over the weir, and 0.3 m³/s always passes the fish ladder. Installed power ${INSTALLED.toFixed(0)} kW.`,
  body: `<style>${CSS}</style><div class="iso-stage" tabindex="0" aria-label="Micro hydro bench model">${svg}</div>`,
});
const page = k.pageHtml({ title: "GridSim · Micro hydro", theme: THEME, body, script: kitScript() + LIVE, width: 980 });
const name = THEME === "light" ? "micro-hydro-light.html" : "micro-hydro.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`);
A.auditOrExit(R, P, {});
