// GridSim 2D, step 1: a green work area, a flowing river, one tiny hydro plant.
// Everything is drawn in tile space (1 unit = 1 tile); the view only changes the transform.

// ---------- Everything you might want to change lives here ----------

const MAP = { cols: 32, rows: 20 };

const COLORS = {
  grass: "#9dbb7d",
  grassAlt: "#98b678",
  soil: "#8a7357",
  soilDark: "#6f5c45",
  water: "#5b93bf",
  pond: "#4f86b3",
  streak: "#d9eef8",
  gridLine: "rgba(31, 42, 51, 0.12)",
  hover: "rgba(255, 255, 255, 0.35)",
  concreteTop: "#d4cfc3",
  concreteSide: "#aaa497",
  concreteFront: "#bdb7aa",
  wallSide: "#e2dccd",
  wallFront: "#efe9db",
  roof: "#6f7f8c",
  rotor: "#2b3640",
  shadow: "rgba(31, 42, 51, 0.18)",
};

/**
 * River centre line, in tiles. Straight runs along the grid, turning at right angles.
 * Points sit on tile edges so a width of 2 covers exactly two tiles. It may start and end outside the map.
 */
const RIVER = {
  width: 2,
  points: [
    [-1, 6],
    [9, 6],
    [9, 10],
    [20, 10],
    [20, 13],
    [33, 13],
  ] as [number, number][],
  /** Tiles per second. */
  flowSpeed: 1.6,
  streaks: 70,
};

const HYDRO = {
  name: "Micro hydro",
  /** Where the dam sits; it snaps to the nearest point on the river. Keep it on a straight run. */
  at: { x: 15, y: 10 },
  damThickness: 0.6,
  damHeight: 0.35,
  /** The powerhouse stands on this bank: 1 = left of the flow, -1 = right. */
  bank: 1,
  house: { length: 1.8, depth: 1.4, height: 1.0 },
  /** Turbine turns per second. */
  rotorSpeed: 1.2,
};

// ---------- Geometry helpers ----------

type Vec = { x: number; y: number };

interface Segment {
  a: Vec;
  b: Vec;
  start: number;
  length: number;
}

const segments: Segment[] = [];
let riverLength = 0;
for (let i = 0; i < RIVER.points.length - 1; i++) {
  const [ax, ay] = RIVER.points[i]!;
  const [bx, by] = RIVER.points[i + 1]!;
  const length = Math.hypot(bx - ax, by - ay);
  segments.push({ a: { x: ax, y: ay }, b: { x: bx, y: by }, start: riverLength, length });
  riverLength += length;
}

/** Point, flow direction and left normal at distance `s` along the river. */
function riverAt(s: number): { p: Vec; t: Vec; n: Vec } {
  const clamped = Math.min(Math.max(s, 0), riverLength);
  const seg = segments.find((q) => clamped <= q.start + q.length) ?? segments[segments.length - 1]!;
  const k = (clamped - seg.start) / seg.length;
  const t = { x: (seg.b.x - seg.a.x) / seg.length, y: (seg.b.y - seg.a.y) / seg.length };
  return {
    p: { x: seg.a.x + (seg.b.x - seg.a.x) * k, y: seg.a.y + (seg.b.y - seg.a.y) * k },
    t,
    n: { x: t.y, y: -t.x },
  };
}

/** Distance from a point to the river centre line, and how far along the river the closest point is. */
function nearestOnRiver(x: number, y: number): { dist: number; s: number } {
  let best = { dist: Infinity, s: 0 };
  for (const seg of segments) {
    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    const k = Math.min(Math.max(((x - seg.a.x) * dx + (y - seg.a.y) * dy) / (seg.length * seg.length), 0), 1);
    const dist = Math.hypot(x - (seg.a.x + dx * k), y - (seg.a.y + dy * k));
    if (dist < best.dist) best = { dist, s: seg.start + seg.length * k };
  }
  return best;
}

// ---------- The map: one tile type per cell ----------

type Tile = "grass" | "water";
const tiles: Tile[][] = [];
const tileAlong: number[][] = [];
for (let row = 0; row < MAP.rows; row++) {
  tiles.push([]);
  tileAlong.push([]);
  for (let col = 0; col < MAP.cols; col++) {
    const near = nearestOnRiver(col + 0.5, row + 0.5);
    tiles[row]!.push(near.dist <= RIVER.width / 2 ? "water" : "grass");
    tileAlong[row]!.push(near.s);
  }
}

const damS = nearestOnRiver(HYDRO.at.x, HYDRO.at.y).s;
const dam = riverAt(damS);

// ---------- View: top-down or isometric ----------

type View = "top" | "iso";
let view: View = "iso";
let showGrid = false;

const canvas = document.getElementById("world") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let cssW = 1;
let cssH = 1;
let dpr = 1;
/** Pixels per tile (top) or half tile width (iso). */
let unit = 1;
let originX = 0;
let originY = 0;

function fit(): void {
  dpr = window.devicePixelRatio || 1;
  cssW = window.innerWidth;
  cssH = window.innerHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const { cols, rows } = MAP;
  if (view === "top") {
    unit = Math.min((cssW * 0.9) / cols, (cssH * 0.8) / rows);
    originX = cssW / 2 - (cols / 2) * unit;
    originY = cssH / 2 - (rows / 2) * unit;
  } else {
    unit = Math.min((cssW * 0.9) / (cols + rows), (cssH * 0.8) / ((cols + rows) / 2));
    originX = cssW / 2 - ((cols - rows) / 2) * unit;
    originY = cssH / 2 - ((cols + rows) / 4) * unit;
  }
}

/** Tile space to screen (CSS px). `lift` raises a point by that many tiles. */
function toScreen(x: number, y: number, lift = 0): Vec {
  if (view === "top") return { x: originX + x * unit, y: originY + y * unit };
  return { x: originX + (x - y) * unit, y: originY + ((x + y) * unit) / 2 - lift * unit };
}

function toTile(sx: number, sy: number): Vec {
  if (view === "top") return { x: (sx - originX) / unit, y: (sy - originY) / unit };
  const a = (sx - originX) / unit;
  const b = (2 * (sy - originY)) / unit;
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** Make later drawing calls take tile coordinates directly. */
function useTileTransform(): void {
  if (view === "top") ctx.setTransform(unit * dpr, 0, 0, unit * dpr, originX * dpr, originY * dpr);
  else ctx.setTransform(unit * dpr, (unit / 2) * dpr, -unit * dpr, (unit / 2) * dpr, originX * dpr, originY * dpr);
}

function useScreenTransform(): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ---------- Drawing ----------

function polygon(points: Vec[], fill: string): void {
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** A box standing on the ground. `base` is its footprint in tile space, any rotation. */
function prism(base: Vec[], height: number, top: string, side: string, front: string): void {
  useScreenTransform();
  if (view === "top") {
    polygon(base.map((p) => toScreen(p.x + 0.12, p.y + 0.12)), COLORS.shadow);
    polygon(base.map((p) => toScreen(p.x, p.y)), top);
    return;
  }
  // Paint the walls back to front, then the roof covers the hidden ones.
  const faces = base.map((a, i) => {
    const b = base[(i + 1) % base.length]!;
    return { a, b, depth: a.x + a.y + b.x + b.y, eastish: b.y - a.y > 0 !== b.x - a.x > 0 };
  });
  faces.sort((p, q) => p.depth - q.depth);
  for (const f of faces) {
    polygon([toScreen(f.a.x, f.a.y), toScreen(f.b.x, f.b.y), toScreen(f.b.x, f.b.y, height), toScreen(f.a.x, f.a.y, height)], f.eastish ? side : front);
  }
  polygon(base.map((p) => toScreen(p.x, p.y, height)), top);
}

/** Footprint of a rectangle centred on `c`, aligned with the river direction `t` / normal `n`. */
function orientedRect(c: Vec, t: Vec, n: Vec, alongT: number, alongN: number): Vec[] {
  const ht = alongT / 2;
  const hn = alongN / 2;
  return [
    { x: c.x - t.x * ht - n.x * hn, y: c.y - t.y * ht - n.y * hn },
    { x: c.x + t.x * ht - n.x * hn, y: c.y + t.y * ht - n.y * hn },
    { x: c.x + t.x * ht + n.x * hn, y: c.y + t.y * ht + n.y * hn },
    { x: c.x - t.x * ht + n.x * hn, y: c.y - t.y * ht + n.y * hn },
  ];
}

function drawGroundSlab(): void {
  if (view !== "iso") return;
  useScreenTransform();
  const depth = 0.8;
  const { cols, rows } = MAP;
  polygon([toScreen(0, rows), toScreen(cols, rows), toScreen(cols, rows, -depth), toScreen(0, rows, -depth)], COLORS.soil);
  polygon([toScreen(cols, 0), toScreen(cols, rows), toScreen(cols, rows, -depth), toScreen(cols, 0, -depth)], COLORS.soilDark);
}

function drawTiles(): void {
  useTileTransform();
  for (let row = 0; row < MAP.rows; row++) {
    for (let col = 0; col < MAP.cols; col++) {
      const tile = tiles[row]![col]!;
      if (tile === "grass") ctx.fillStyle = (row + col) % 2 ? COLORS.grass : COLORS.grassAlt;
      else {
        // The dam backs the water up a little: calmer, deeper water just upstream.
        const s = tileAlong[row]![col]!;
        ctx.fillStyle = s < damS && s > damS - 4 ? COLORS.pond : COLORS.water;
      }
      // Slight overlap hides seams between tiles.
      ctx.fillRect(col, row, 1.01, 1.01);
    }
  }
  if (showGrid) {
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1 / unit;
    ctx.beginPath();
    for (let col = 0; col <= MAP.cols; col++) {
      ctx.moveTo(col, 0);
      ctx.lineTo(col, MAP.rows);
    }
    for (let row = 0; row <= MAP.rows; row++) {
      ctx.moveTo(0, row);
      ctx.lineTo(MAP.cols, row);
    }
    ctx.stroke();
  }
}

// Short light streaks drifting with the current.
const streaks = Array.from({ length: RIVER.streaks }, () => ({
  s: Math.random() * riverLength,
  offset: (Math.random() - 0.5) * (RIVER.width - 0.6),
}));

/** Water is slow in the pond behind the dam and fast right after the turbine. */
function flowFactor(s: number): number {
  if (s > damS - 4 && s < damS) return 0.45;
  if (s >= damS && s < damS + 2.5) return 1.8;
  return 1;
}

function drawStreaks(dt: number): void {
  useTileTransform();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, MAP.cols, MAP.rows);
  ctx.clip();
  ctx.strokeStyle = COLORS.streak;
  ctx.lineCap = "round";
  ctx.lineWidth = 0.08;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  for (const q of streaks) {
    const before = q.s;
    q.s += RIVER.flowSpeed * flowFactor(q.s) * dt;
    // Streaks do not pass through the dam wall; they pop out on the far side.
    if (before < damS - HYDRO.damThickness / 2 && q.s >= damS - HYDRO.damThickness / 2) q.s = damS + HYDRO.damThickness / 2;
    if (q.s > riverLength) q.s -= riverLength;
    const { p, t, n } = riverAt(q.s);
    const x = p.x + n.x * q.offset;
    const y = p.y + n.y * q.offset;
    const len = 0.35 * flowFactor(q.s);
    ctx.moveTo(x, y);
    ctx.lineTo(x + t.x * len, y + t.y * len);
  }
  ctx.stroke();
  ctx.restore();
}

let rotorAngle = 0;

function drawHydro(dt: number): void {
  const { p, t, n } = dam;
  // Dam: a low concrete wall across the whole river, a little wider than the water.
  prism(orientedRect(p, t, n, HYDRO.damThickness, RIVER.width + 0.8), HYDRO.damHeight, COLORS.concreteTop, COLORS.concreteSide, COLORS.concreteFront);

  // Powerhouse on the bank, next to the dam.
  const side = HYDRO.bank;
  const houseCentre = {
    x: p.x + n.x * side * (RIVER.width / 2 + 0.4 + HYDRO.house.depth / 2),
    y: p.y + n.y * side * (RIVER.width / 2 + 0.4 + HYDRO.house.depth / 2),
  };
  prism(orientedRect(houseCentre, t, n, HYDRO.house.length, HYDRO.house.depth), HYDRO.house.height, COLORS.roof, COLORS.wallSide, COLORS.wallFront);

  // Turbine: a small rotor sitting on the dam, in the middle of the flow.
  rotorAngle += HYDRO.rotorSpeed * Math.PI * 2 * dt;
  useScreenTransform();
  const hub = toScreen(p.x, p.y, HYDRO.damHeight);
  ctx.strokeStyle = COLORS.rotor;
  ctx.lineWidth = Math.max(1.5, unit * 0.09);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = rotorAngle + (i * Math.PI) / 2;
    const tip = toScreen(p.x + Math.cos(a) * 0.55, p.y + Math.sin(a) * 0.55, HYDRO.damHeight);
    ctx.moveTo(hub.x, hub.y);
    ctx.lineTo(tip.x, tip.y);
  }
  ctx.stroke();
  ctx.fillStyle = COLORS.rotor;
  ctx.beginPath();
  ctx.arc(hub.x, hub.y, Math.max(2, unit * 0.1), 0, Math.PI * 2);
  ctx.fill();
}

// ---------- Hover readout ----------

let hover: Vec | null = null;
const readout = document.getElementById("readout")!;

function describeHover(): string {
  if (!hover) return "Move the mouse over the map";
  const col = Math.floor(hover.x);
  const row = Math.floor(hover.y);
  if (col < 0 || row < 0 || col >= MAP.cols || row >= MAP.rows) return "Outside the map";
  const nearDam = Math.hypot(hover.x - dam.p.x, hover.y - dam.p.y) < RIVER.width;
  return `tile ${col}, ${row} · ${nearDam ? HYDRO.name : tiles[row]![col]!}`;
}

function drawHover(): void {
  if (!hover) return;
  const col = Math.floor(hover.x);
  const row = Math.floor(hover.y);
  if (col < 0 || row < 0 || col >= MAP.cols || row >= MAP.rows) return;
  useTileTransform();
  ctx.fillStyle = COLORS.hover;
  ctx.fillRect(col, row, 1, 1);
}

canvas.addEventListener("pointermove", (e) => {
  hover = toTile(e.clientX, e.clientY);
  readout.textContent = describeHover();
});
canvas.addEventListener("pointerleave", () => {
  hover = null;
  readout.textContent = describeHover();
});

// ---------- Controls ----------

const viewButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-view]"));
function setView(next: View): void {
  view = next;
  for (const b of viewButtons) b.setAttribute("aria-pressed", String(b.dataset.view === next));
  fit();
}
for (const b of viewButtons) b.addEventListener("click", () => setView(b.dataset.view as View));
const gridToggle = document.getElementById("grid") as HTMLInputElement;
gridToggle.addEventListener("change", () => (showGrid = gridToggle.checked));
window.addEventListener("resize", fit);

// ---------- Loop ----------

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  useScreenTransform();
  ctx.clearRect(0, 0, cssW, cssH);
  drawGroundSlab();
  drawTiles();
  drawStreaks(dt);
  drawHover();
  drawHydro(dt);
  requestAnimationFrame(frame);
}

setView("iso");
requestAnimationFrame(frame);
