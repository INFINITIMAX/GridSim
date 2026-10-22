// GridSim art: a toon-shaded diorama of the micro hydro plant, for posting on X.
// Two palettes to choose from: open /art/?palette=a or /art/?palette=b.
// The numbers on the cards come from the real model in 2d/hydro.ts.

import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { GENERATOR_EFFICIENCY, TRANSFORMER_LOSS, operate, type PlantSetup } from "../2d/hydro";

// ---------- Everything you might want to change lives here ----------

interface Palette {
  bg: string;
  line: string;
  ink: string;
  muted: string;
  card: string;
  accent: string;
  grass: string;
  grassDark: string;
  earth: string;
  earthDeep: string;
  water: string;
  waterLight: string;
  foam: string;
  concrete: string;
  wall: string;
  roof: string;
  steel: string;
  runner: string;
  generator: string;
  trunk: string;
  rock: string;
}

const PALETTES: Record<"a" | "b", Palette> = {
  // A: our own. Cool paper, graphite ink, river blue as the hero, amber for energy.
  a: {
    bg: "#e6eae8", line: "#d3d9d6", ink: "#1d2329", muted: "#59646c", card: "#f5f7f6", accent: "#e3a23b",
    grass: "#9db884", grassDark: "#6f9566", earth: "#a08a72", earthDeep: "#7d6a58",
    water: "#3f86c4", waterLight: "#8fc0e6", foam: "#f2f7fb",
    concrete: "#cfd3cf", wall: "#e9e7e1", roof: "#4a5662", steel: "#8d99a3", runner: "#e3a23b", generator: "#2f6f9f",
    trunk: "#7a5c45", rock: "#a3a9a6",
  },
  // B: close to learn-arduino. Cream paper, navy ink, teal accent.
  b: {
    bg: "#f3ead8", line: "#e6d9c0", ink: "#1f2a44", muted: "#5d6478", card: "#fbf6ec", accent: "#2bb3a3",
    grass: "#a9bd7f", grassDark: "#7b9a63", earth: "#b39573", earthDeep: "#8c7258",
    water: "#3b5fae", waterLight: "#8ea6dd", foam: "#f7f3ea",
    concrete: "#ddd5c4", wall: "#efe7d6", roof: "#2c3a5c", steel: "#9aa0ad", runner: "#f08a3c", generator: "#3b5fae",
    trunk: "#7a5a40", rock: "#b3ab9c",
  },
};

/** The plant on the cards: the 2D game's starting plant, normal river. */
const SETUP: PlantSetup = { technology: "kaplan", size: "medium", count: 1, damHeight: 5, canal: false, gates: true, fishLadder: false, autoCleaner: true };
const RIVER_FLOW = 3;

const OUTLINE = 0.028; // world units, the ink line around every part
const VIEW_HEIGHT = 11.2; // world units visible vertically
const CAMERA_TARGET = new THREE.Vector3(0.9, -0.2, 0.2);

// ---------- Setup ----------

const paletteId = new URLSearchParams(location.search).get("palette") === "b" ? "b" : "a";
const P = PALETTES[paletteId];
for (const [k, v] of Object.entries({ bg: P.bg, line: P.line, ink: P.ink, muted: P.muted, card: P.card, accent: P.accent })) {
  document.documentElement.style.setProperty(`--${k}`, v);
}

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
camera.position.copy(CAMERA_TARGET).add(new THREE.Vector3(10, 8.2, 10));
camera.lookAt(CAMERA_TARGET);

scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c0c8, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(-4, 10, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -9;
sun.shadow.camera.right = 9;
sun.shadow.camera.top = 9;
sun.shadow.camera.bottom = -9;
sun.shadow.radius = 4;
sun.shadow.bias = -0.0008;
scene.add(sun);

// Three flat tones per surface: shade, mid, light. This is what makes it read as an illustration.
const toneData = new Uint8Array([150, 205, 255]);
const tones = new THREE.DataTexture(toneData, 3, 1, THREE.RedFormat);
tones.minFilter = tones.magFilter = THREE.NearestFilter;
tones.needsUpdate = true;

const materials = new Map<string, THREE.MeshToonMaterial>();
function mat(color: string): THREE.MeshToonMaterial {
  let m = materials.get(color);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: tones });
    materials.set(color, m);
  }
  return m;
}

const inkMaterial = new THREE.MeshBasicMaterial({ color: P.ink, side: THREE.BackSide });
inkMaterial.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace(
    "#include <begin_vertex>",
    `vec3 transformed = position + normal * ${OUTLINE.toFixed(4)};`,
  );
};

/** A part: toon-shaded mesh plus an ink outline (inverted hull on smoothed normals, so hard edges close up). */
function part(geometry: THREE.BufferGeometry, color: string, outline = true): THREE.Group {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, mat(color));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  if (outline) {
    const hullGeo = mergeVertices(geometry.clone().deleteAttribute("normal").deleteAttribute("uv"), 1e-4);
    hullGeo.computeVertexNormals();
    g.add(new THREE.Mesh(hullGeo, inkMaterial));
  }
  return g;
}

function box(w: number, h: number, d: number, color: string, at: [number, number, number], radius = 0.06): THREE.Group {
  const g = part(new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 2, h / 2, d / 2) * 0.999), color);
  g.position.set(...at);
  scene.add(g);
  return g;
}

function cylinder(r: number, h: number, color: string, at: [number, number, number], segments = 28): THREE.Group {
  const g = part(new THREE.CylinderGeometry(r, r, h, segments), color);
  g.position.set(...at);
  scene.add(g);
  return g;
}

// ---------- The diorama ----------
// x runs downstream (left-back to right-front on screen), z towards the viewer, y up. Ground top is y = 0.

const GRASS = 0.28;
const SLAB_BOTTOM = -1.5;
const CHANNEL = { z0: -0.85, z1: 0.85, bed: -0.75 };
const DAM_X = -2.6;
const WATER_UP = -0.08;
const WATER_DOWN = -0.42;

// Banks: grass on earth, like a slice of land.
for (const [z0, z1] of [[-4.2, CHANNEL.z0], [CHANNEL.z1, 4.2]] as const) {
  const d = z1 - z0;
  const zc = (z0 + z1) / 2;
  box(12.4, -SLAB_BOTTOM - GRASS, d, P.earth, [0, (SLAB_BOTTOM - GRASS) / 2, zc], 0.12);
  box(12.4, GRASS, d, P.grass, [0, -GRASS / 2, zc], 0.1);
}
// River bed under the channel.
box(12.4, CHANNEL.bed - SLAB_BOTTOM, CHANNEL.z1 - CHANNEL.z0, P.earthDeep, [0, (SLAB_BOTTOM + CHANNEL.bed) / 2, 0], 0.08);

// Water: high behind the dam, low after it. No outline on water, it reads softer.
function water(x0: number, x1: number, y: number): void {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y - CHANNEL.bed, CHANNEL.z1 - CHANNEL.z0 - 0.02), mat(P.water));
  m.position.set((x0 + x1) / 2, (y + CHANNEL.bed) / 2, 0);
  m.receiveShadow = true;
  scene.add(m);
}
water(-6.2, DAM_X, WATER_UP);
water(DAM_X, 6.2, WATER_DOWN);

// Flow streaks on the water.
const streaks: [number, number, number, number][] = [
  [-5.4, -0.45, 0.9, WATER_UP], [-4.1, 0.3, 1.2, WATER_UP], [-2.9, -0.2, 0.8, WATER_UP],
  [0.2, 0.35, 1.0, WATER_DOWN], [1.6, -0.4, 1.3, WATER_DOWN], [3.2, 0.15, 0.9, WATER_DOWN], [4.7, -0.3, 1.1, WATER_DOWN],
];
for (const [x, z, len, y] of streaks) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(len, 0.01, 0.06), mat(P.waterLight));
  s.position.set(x, y + 0.006, z);
  scene.add(s);
}

// Dam: a concrete wall across the river, with a lowered spillway where water pours over.
box(0.55, 1.15, 2.3, P.concrete, [DAM_X, (CHANNEL.bed + 0.4) / 2, 0], 0.05);
box(0.75, 0.16, 2.5, P.concrete, [DAM_X, 0.42, 0], 0.04);
// Spillway sheet and foam at the foot.
const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.06, WATER_UP - WATER_DOWN + 0.05, 0.9), mat(P.waterLight));
sheet.position.set(DAM_X + 0.3, (WATER_UP + WATER_DOWN) / 2, -0.25);
scene.add(sheet);
for (const [dz, r] of [[-0.6, 0.12], [-0.4, 0.15], [-0.15, 0.13], [0.05, 0.1]] as const) {
  const foam = part(new THREE.SphereGeometry(r, 14, 10), P.foam, false);
  foam.scale.y = 0.45;
  foam.position.set(DAM_X + 0.45, WATER_DOWN + 0.02, dz);
  scene.add(foam);
}

// Penstock: the pipe from the dam intake to the turbine.
const penstockPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(DAM_X + 0.2, 0.15, 1.15),
  new THREE.Vector3(-1.2, 0.2, 1.3),
  new THREE.Vector3(0.2, 0.22, 1.6),
  new THREE.Vector3(0.95, 0.22, 1.85),
]);
const penstock = part(new THREE.TubeGeometry(penstockPath, 48, 0.17, 20), P.steel);
scene.add(penstock);
for (const t of [0.25, 0.55, 0.85]) {
  const p = penstockPath.getPoint(t);
  box(0.16, 0.24, 0.42, P.concrete, [p.x, 0.07, p.z], 0.03);
}

// Powerhouse, cut open towards the viewer so the turbine and generator show.
const PH = { x0: 1.0, x1: 3.0, z0: 1.15, z1: 3.05, h: 1.55 };
const phx = (PH.x0 + PH.x1) / 2;
const phz = (PH.z0 + PH.z1) / 2;
box(PH.x1 - PH.x0 + 0.2, 0.14, PH.z1 - PH.z0 + 0.2, P.concrete, [phx, 0.07, phz], 0.04); // floor
box(PH.x1 - PH.x0, PH.h, 0.14, P.wall, [phx, PH.h / 2 + 0.14, PH.z0], 0.04); // back wall
box(0.14, PH.h, PH.z1 - PH.z0, P.wall, [PH.x0, PH.h / 2 + 0.14, phz], 0.04); // left wall
box(PH.x1 - PH.x0, 0.42, 0.14, P.wall, [phx, 0.35, PH.z1], 0.03); // low front wall, cut
box(0.14, 0.42, PH.z1 - PH.z0, P.wall, [PH.x1, 0.35, phz], 0.03); // low right wall, cut
// Roof over the back half only, like a section drawing.
box(PH.x1 - PH.x0 + 0.3, 0.16, 0.95, P.roof, [phx, PH.h + 0.22, PH.z0 + 0.35], 0.05);
// Windows on the back wall.
for (const dx of [-0.55, 0, 0.55]) box(0.3, 0.42, 0.04, P.waterLight, [phx + dx, 1.05, PH.z0 + 0.08], 0.02);

// Turbine pit, runner and generator on one shaft.
const TX = 2.05;
const TZ = 2.15;
cylinder(0.5, 0.12, P.steel, [TX, 0.2, TZ]); // pit ring
cylinder(0.08, 1.0, P.steel, [TX, 0.65, TZ], 16); // shaft
const hub = part(new THREE.ConeGeometry(0.14, 0.3, 20).rotateX(Math.PI), P.runner);
hub.position.set(TX, 0.36, TZ);
scene.add(hub);
for (let i = 0; i < 4; i++) {
  const blade = part(new RoundedBoxGeometry(0.42, 0.04, 0.2, 2, 0.015), P.runner);
  const a = (i * Math.PI) / 2;
  blade.position.set(TX + Math.cos(a) * 0.27, 0.42, TZ + Math.sin(a) * 0.27);
  blade.rotation.set(0, -a, 0.45);
  scene.add(blade);
}
cylinder(0.42, 0.55, P.generator, [TX, 1.05, TZ]); // generator
cylinder(0.3, 0.1, P.steel, [TX, 1.38, TZ]); // generator cap
box(0.36, 0.7, 0.24, P.roof, [1.35, 0.5, 2.7], 0.04); // control cabinet
box(0.28, 0.1, 0.02, P.accent, [1.35, 0.7, 2.83], 0.01); // its indicator

// Tailrace: water leaves the powerhouse back to the river.
box(0.5, 0.1, 0.5, P.concrete, [1.7, -0.05, 1.0], 0.03);

// Transformer: a box with cooling fins and three insulators.
const TR = { x: 4.0, z: 2.4 };
box(0.8, 0.12, 0.8, P.concrete, [TR.x, 0.06, TR.z], 0.03);
box(0.55, 0.6, 0.5, P.steel, [TR.x, 0.42, TR.z], 0.04);
for (const dz of [-0.18, -0.06, 0.06, 0.18]) box(0.05, 0.42, 0.06, P.steel, [TR.x + 0.32, 0.4, TR.z + dz], 0.015);
const bushings: THREE.Vector3[] = [];
for (const dx of [-0.17, 0, 0.17]) {
  cylinder(0.045, 0.26, P.foam, [TR.x + dx, 0.85, TR.z], 12);
  bushings.push(new THREE.Vector3(TR.x + dx, 0.98, TR.z));
}

// Pylon: four leaning legs, braces and a cross-arm.
const PY = { x: 6.0, z: 1.35, h: 2.6 };
for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
  const bottom = new THREE.Vector3(PY.x + sx * 0.32, 0, PY.z + sz * 0.32);
  const top = new THREE.Vector3(PY.x + sx * 0.07, PY.h, PY.z + sz * 0.07);
  const leg = part(new THREE.CylinderGeometry(0.035, 0.035, bottom.distanceTo(top), 8), P.ink, false);
  leg.position.copy(bottom).lerp(top, 0.5);
  leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bottom).normalize());
  scene.add(leg);
}
for (const y of [0.7, 1.4, 2.0]) {
  const w = 0.64 - (y / PY.h) * 0.5;
  box(w, 0.04, 0.04, P.ink, [PY.x, y, PY.z - w / 2], 0.01);
  box(w, 0.04, 0.04, P.ink, [PY.x, y, PY.z + w / 2], 0.01);
}
box(0.07, 0.07, 1.3, P.ink, [PY.x, PY.h - 0.15, PY.z], 0.02);
const armEnds = [-0.55, 0, 0.55].map((dz) => new THREE.Vector3(PY.x, PY.h - 0.2, PY.z + dz));

// Wires: transformer to pylon, then off the edge of the land.
const wireMat = new THREE.MeshBasicMaterial({ color: P.ink });
function wire(a: THREE.Vector3, b: THREE.Vector3, sag: number): void {
  const mid = a.clone().lerp(b, 0.5);
  mid.y -= sag;
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.012, 6), wireMat);
  scene.add(tube);
}
armEnds.forEach((end, i) => {
  wire(bushings[i]!, end, 0.12);
  wire(end, new THREE.Vector3(end.x + 1.6, end.y - 0.35, end.z), 0.18);
});

// Trees and rocks.
function tree(x: number, z: number, s = 1): void {
  const trunk = part(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.35 * s, 8), P.trunk);
  trunk.position.set(x, 0.17 * s, z);
  scene.add(trunk);
  const crown = part(new THREE.IcosahedronGeometry(0.34 * s, 0), P.grassDark);
  crown.position.set(x, 0.62 * s, z);
  crown.rotation.set(0.3 * x, 0.5 * z, 0);
  scene.add(crown);
}
for (const [x, z, s] of [
  [-5.3, -3.4, 1.1], [-4.4, -2.6, 0.9], [-3.0, -3.5, 1.2], [-1.6, -2.9, 0.8], [0.4, -3.4, 1.0], [2.2, -2.5, 0.9], [5.2, 3.4, 0.9], [3.6, 3.7, 0.75],
  [3.8, -3.3, 1.15], [5.4, -2.2, 0.85], [-5.1, 2.6, 1.0], [-3.9, 3.4, 1.2], [-1.4, 3.1, 0.8], [-0.2, 3.6, 0.9],
] as const) tree(x, z, s);
for (const [x, z, s] of [[-1.9, -1.3, 0.22], [1.1, -1.2, 0.16], [3.4, 1.15, 0.18], [-4.6, 1.25, 0.2]] as const) {
  const rock = part(new THREE.DodecahedronGeometry(s, 0), P.rock);
  rock.position.set(x, s * 0.5, z);
  rock.rotation.set(x, z, 0);
  scene.add(rock);
}

// ---------- Cards, from the real model ----------

const op = operate(SETUP, RIVER_FLOW, 0);
const pct = (v: number): string => `${(v * 100).toFixed(0)}%`;
interface Card {
  anchor: THREE.Vector3;
  /** Card position relative to the anchor on screen, px. */
  dx: number;
  dy: number;
  title: string;
  text: string;
  value: string;
}
const cards: Card[] = [
  { anchor: new THREE.Vector3(-4.2, WATER_UP, 0.2), dx: -230, dy: 40, title: "River", text: "Water arriving every second.", value: `${RIVER_FLOW.toFixed(1)} m³/s` },
  { anchor: new THREE.Vector3(DAM_X, 0.5, -0.9), dx: -60, dy: -240, title: "Dam", text: "Raises the water. The drop is the head.", value: `${op.grossHead.toFixed(1)} m head` },
  { anchor: penstockPath.getPoint(0.45), dx: -330, dy: 70, title: "Penstock", text: "Carries water down to the turbine.", value: `${op.usedFlow.toFixed(1)} m³/s` },
  { anchor: new THREE.Vector3(TX, 0.42, TZ + 0.3), dx: -150, dy: 150, title: "Turbine", text: "Kaplan runner. Falling water turns it.", value: `${pct(op.efficiency)} efficient` },
  { anchor: new THREE.Vector3(TX + 0.3, 1.1, TZ + 0.3), dx: 60, dy: -300, title: "Generator", text: "Turns rotation into electricity.", value: `${pct(GENERATOR_EFFICIENCY)} efficient` },
  { anchor: new THREE.Vector3(TR.x, 0.75, TR.z + 0.25), dx: 40, dy: 120, title: "Transformer", text: "Steps the voltage up for the line.", value: `${pct(TRANSFORMER_LOSS)} lost` },
  { anchor: new THREE.Vector3(PY.x, PY.h, PY.z), dx: 50, dy: -150, title: "To the grid", text: "What the town receives.", value: `${op.powerKW.toFixed(0)} kW` },
];

const labels = document.querySelector<HTMLDivElement>("#labels")!;
const leaders = document.querySelector<SVGSVGElement>("#leaders")!;
const cardEls = cards.map((c) => {
  const el = document.createElement("div");
  el.className = "card";
  const h = document.createElement("h2");
  h.textContent = c.title;
  const p = document.createElement("p");
  p.textContent = c.text;
  const v = document.createElement("strong");
  v.textContent = c.value;
  el.append(h, p, v);
  labels.append(el);
  return el;
});

document.querySelector("#formula")!.innerHTML =
  `P = 9.81 × ${op.usedFlow.toFixed(2)} m³/s × ${op.netHead.toFixed(2)} m × ${op.efficiency.toFixed(3)} × ${GENERATOR_EFFICIENCY} × ${(1 - TRANSFORMER_LOSS).toFixed(2)} = <b>${op.powerKW.toFixed(1)} kW</b>`;

// ---------- Background: faint contour lines, like a survey map ----------

function drawBackdrop(w: number, h: number): void {
  const svg = document.querySelector<SVGSVGElement>("#backdrop")!;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.replaceChildren();
  const centres = [[0.12, 0.85], [0.9, 0.2], [0.85, 0.92]];
  for (const [cx, cy] of centres) {
    for (let ring = 1; ring <= 9; ring++) {
      const r = ring * 46;
      const pts: string[] = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const wobble = 1 + 0.12 * Math.sin(3 * a + ring * 0.7 + cx! * 9) + 0.06 * Math.sin(7 * a + cy! * 5);
        pts.push(`${(cx! * w + Math.cos(a) * r * wobble * 1.3).toFixed(1)},${(cy! * h + Math.sin(a) * r * wobble).toFixed(1)}`);
      }
      const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      path.setAttribute("points", pts.join(" "));
      path.setAttribute("class", "contour");
      svg.append(path);
    }
  }
}

// ---------- Layout and render ----------

function layout(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  camera.top = VIEW_HEIGHT / 2;
  camera.bottom = -VIEW_HEIGHT / 2;
  camera.left = (-VIEW_HEIGHT * aspect) / 2;
  camera.right = (VIEW_HEIGHT * aspect) / 2;
  camera.updateProjectionMatrix();
  drawBackdrop(w, h);
  renderer.render(scene, camera);

  leaders.setAttribute("viewBox", `0 0 ${w} ${h}`);
  leaders.replaceChildren();
  cards.forEach((c, i) => {
    const p = c.anchor.clone().project(camera);
    const ax = ((p.x + 1) / 2) * w;
    const ay = ((1 - p.y) / 2) * h;
    const el = cardEls[i]!;
    const cx = ax + c.dx;
    const cy = ay + c.dy;
    el.style.left = `${cx}px`;
    el.style.top = `${cy}px`;
    // Leader from the anchor to the nearest point on the card's edge.
    const r = { x0: cx, y0: cy, x1: cx + el.offsetWidth, y1: cy + el.offsetHeight };
    const ex = Math.min(Math.max(ax, r.x0), r.x1);
    const ey = Math.min(Math.max(ay, r.y0), r.y1);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", `M${ax},${ay} L${ex},${ey}`);
    line.setAttribute("class", "leader");
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(ax));
    dot.setAttribute("cy", String(ay));
    dot.setAttribute("r", "5");
    dot.setAttribute("class", "leader-dot");
    leaders.append(line, dot);
  });
}

window.addEventListener("resize", layout);
document.fonts.ready.then(layout);
layout();
