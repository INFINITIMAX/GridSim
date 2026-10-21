// GridSim 2D, step 3: a green work area, a flowing river, one hydro plant you can click, inspect and upgrade in every way.
// Everything is drawn in tile space (1 unit = 1 tile); the view only changes the transform.

import { DAM_HEIGHTS, sizeById, stepClog, technologyById, type DamHeight, type PlantSetup, type Technology } from "./hydro";
import { createPanel, type PanelState } from "./panel";

// ---------- Everything you might want to change lives here ----------

/** Zooming in on the plant: how far, and how long it takes (ease-out). */
const CAMERA = { plantZoom: 2.6, animationMs: 600 };

const MAP = { cols: 32, rows: 20 };

const COLORS = {
  grass: "#9dbb7d",
  grassAlt: "#98b678",
  soil: "#8a7357",
  soilDark: "#6f5c45",
  water: "#5b93bf",
  pond: "#4f86b3",
  flooded: "#79a6a0",
  streak: "#d9eef8",
  gridLine: "rgba(31, 42, 51, 0.12)",
  hover: "rgba(255, 255, 255, 0.35)",
  plantOutline: "#ffffff",
  foam: "#ffffff",
  concreteTop: "#d4cfc3",
  concreteSide: "#aaa497",
  concreteFront: "#bdb7aa",
  wallSide: "#e2dccd",
  wallFront: "#efe9db",
  roof: "#6f7f8c",
  rotor: "#2b3640",
  gate: "#3a444d",
  rack: "#33404a",
  debris: "#7a5a3a",
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
  /** Tiles per second at the reference flow. */
  flowSpeed: 1.6,
  streaks: 70,
  /** River flow (m³/s) at which streaks move at `flowSpeed`; they scale with flow, never slower than `minSpeedFactor`. */
  referenceFlow: 3,
  minSpeedFactor: 0.25,
};

const HYDRO = {
  name: "Micro hydro",
  /** Where the dam sits; it snaps to the nearest point on the river. Keep it on a straight run. */
  at: { x: 15, y: 10 },
  damThickness: 0.6,
  /** Per entry of DAM_HEIGHTS (3, 5, 8 m): wall height in tiles, and how far the lake reaches upstream, in tiles. */
  damLook: { height: [0.25, 0.35, 0.55], lake: [2, 4, 7] },
  /** At this dam height the lake floods the grass beside the river, up to `margin` tiles from the bank. */
  flood: { fromHeight: 8, margin: 1 },
  /** The powerhouse stands on this bank: 1 = left of the flow, -1 = right. */
  bank: 1,
  house: { length: 1.8, depth: 1.4, height: 1.0 },
  /** Grass between the river and the powerhouse when there is no canal. */
  houseGap: 0.4,
  /** Diversion canal: width, length downstream from the dam, and the tailrace gap between house and river. */
  canal: { width: 0.6, length: 3.5, tailraceWidth: 0.6, streaks: 8 },
  /** Spillway gates on the crest: how many, size, height, and how high they lift while water spills. */
  gates: { count: 3, width: 0.5, thickness: 0.4, height: 0.16, openLift: 0.22, spillAbove: 0.01 },
  /** Fish ladder: pools on the bank opposite the powerhouse, stepping down the flow. */
  ladder: { pools: 4, poolLength: 0.45, poolWidth: 0.5, startAfterDam: 0.15, gapFromRiver: 0.1, baseHeight: 0.08, stepHeight: 0.07, dashSpeed: 30 },
  /** Intake rack: distance upstream of the dam, height above the water, debris dots at full clog, and the cleaner box. */
  rack: { offset: 0.2, lift: 0.05, debrisMax: 14, cleanerSize: 0.25, cleanerHeight: 0.3, armLift: 0.15 },
  /** Rotor turns per second at full load; slower at part load. */
  maxTurnsPerSecond: 1.6,
  /** Opacity of rotors that are not running. */
  idleRotorAlpha: 0.4,
  /** Francis: number of curved vanes. Crossflow: number of moving lines in the drum and its width relative to the rotor radius. */
  francisVanes: 8,
  crossflow: { lines: 4, width: 0.6 },
  /** Spill foam below the dam: length in tiles along the river, and opacity when everything spills. */
  foam: { length: 0.9, maxAlpha: 0.85 },
  /** Extra tiles around the plant that still count as pointing at it, and the gap of the hover outline. */
  hitMargin: 0.2,
  outlinePad: 0.12,
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

type Tile = "grass" | "water" | "flooded";
const tileDist: number[][] = [];
const tileAlong: number[][] = [];
for (let row = 0; row < MAP.rows; row++) {
  tileDist.push([]);
  tileAlong.push([]);
  for (let col = 0; col < MAP.cols; col++) {
    const near = nearestOnRiver(col + 0.5, row + 0.5);
    tileDist[row]!.push(near.dist);
    tileAlong[row]!.push(near.s);
  }
}
/** Recalculated whenever the dam height changes. */
const tiles: Tile[][] = Array.from({ length: MAP.rows }, () => new Array<Tile>(MAP.cols).fill("grass"));

const damS = nearestOnRiver(HYDRO.at.x, HYDRO.at.y).s;
const dam = riverAt(damS);

/** Wall height and lake length for a dam of this height. */
function damLook(height: DamHeight): { height: number; lake: number } {
  const i = Math.max(DAM_HEIGHTS.indexOf(height), 0);
  return { height: HYDRO.damLook.height[i]!, lake: HYDRO.damLook.lake[i]! };
}

/** The lake floods grass beside the river, upstream of the dam. It stops short of the powerhouse, which stands at the dam. */
function isFlooded(row: number, col: number, damHeight: DamHeight): boolean {
  if (damHeight < HYDRO.flood.fromHeight) return false;
  const dist = tileDist[row]![col]!;
  const s = tileAlong[row]![col]!;
  return dist > RIVER.width / 2 && dist <= RIVER.width / 2 + HYDRO.flood.margin && s < damS - HYDRO.house.length / 2 && s > damS - damLook(damHeight).lake;
}

/** How many tiles of land a dam of this height floods. */
function floodedTiles(damHeight: DamHeight): number {
  let count = 0;
  for (let row = 0; row < MAP.rows; row++) {
    for (let col = 0; col < MAP.cols; col++) if (isFlooded(row, col, damHeight)) count++;
  }
  return count;
}

function rebuildTiles(damHeight: DamHeight): void {
  for (let row = 0; row < MAP.rows; row++) {
    for (let col = 0; col < MAP.cols; col++) {
      tiles[row]![col] = tileDist[row]![col]! <= RIVER.width / 2 ? "water" : isFlooded(row, col, damHeight) ? "flooded" : "grass";
    }
  }
}

// Footprints of the plant, shared by drawing, hovering and clicking.
const damFootprint = orientedRect(dam.p, dam.t, dam.n, HYDRO.damThickness, RIVER.width + 0.8);

/** A point `along` the flow and `across` towards the powerhouse bank, both measured from the dam centre. */
function plantPoint(along: number, across: number): Vec {
  return { x: dam.p.x + dam.t.x * along + dam.n.x * HYDRO.bank * across, y: dam.p.y + dam.t.y * along + dam.n.y * HYDRO.bank * across };
}

/** Rectangle between two `along` values and two `across` values. */
function plantRect(along0: number, along1: number, across0: number, across1: number): Vec[] {
  return orientedRect(plantPoint((along0 + along1) / 2, (across0 + across1) / 2), dam.t, dam.n, along1 - along0, across1 - across0);
}

interface Box {
  c: Vec;
  along: number;
  across: number;
}

/** Everything that depends on whether the plant has a canal. */
interface Site {
  /** Where the powerhouse centre is along the river, from the dam. */
  houseAlong: number;
  houseFootprint: Vec[];
  hitBoxes: Box[];
  /** Flat water: canal intake, canal and tailrace. Empty without a canal. */
  water: Vec[][];
  /** Distance of the canal centre line from the river centre line. */
  canalAcross: number;
  /** The rack line, and the direction pointing upstream of it. */
  rack: { a: Vec; b: Vec; out: Vec };
  cleaner: { centre: Vec; footprint: Vec[] };
}

function buildSite(canal: boolean): Site {
  const halfDam = HYDRO.damThickness / 2;
  const riverHalf = RIVER.width / 2;
  const { house } = HYDRO;
  const gap = canal ? HYDRO.canal.tailraceWidth : HYDRO.houseGap;
  const houseAcross = riverHalf + gap + house.depth / 2;
  const houseAlong = canal ? HYDRO.canal.length + house.length / 2 : 0;
  const houseCentre = plantPoint(houseAlong, houseAcross);

  // The intake reaches from the river to the canal just upstream of the dam; the rack closes its mouth.
  const intake = HYDRO.canal.width;
  const water: Vec[][] = [];
  if (canal) {
    const halfCanal = HYDRO.canal.width / 2;
    water.push(plantRect(-halfDam - intake, -halfDam, riverHalf - 0.05, houseAcross + halfCanal));
    water.push(plantRect(-halfDam - intake, HYDRO.canal.length, houseAcross - halfCanal, houseAcross + halfCanal));
    water.push(plantRect(houseAlong - house.length / 2, houseAlong + house.length / 2, riverHalf - 0.05, riverHalf + gap));
  }

  const rack = canal
    ? { a: plantPoint(-halfDam - intake, riverHalf + 0.05), b: plantPoint(-halfDam, riverHalf + 0.05), out: { x: -dam.n.x * HYDRO.bank, y: -dam.n.y * HYDRO.bank } }
    : { a: plantPoint(-halfDam - HYDRO.rack.offset, -riverHalf), b: plantPoint(-halfDam - HYDRO.rack.offset, riverHalf), out: { x: -dam.t.x, y: -dam.t.y } };
  // The cleaner box sits just beyond the `a` end of the rack.
  const rackLength = Math.hypot(rack.b.x - rack.a.x, rack.b.y - rack.a.y);
  const back = HYDRO.rack.cleanerSize / 2 + 0.03;
  const centre = { x: rack.a.x - ((rack.b.x - rack.a.x) / rackLength) * back, y: rack.a.y - ((rack.b.y - rack.a.y) / rackLength) * back };

  return {
    houseAlong,
    houseFootprint: orientedRect(houseCentre, dam.t, dam.n, house.length, house.depth),
    hitBoxes: [
      { c: dam.p, along: HYDRO.damThickness, across: RIVER.width + 0.8 },
      { c: houseCentre, along: house.length, across: house.depth },
    ],
    water,
    canalAcross: houseAcross,
    rack,
    cleaner: { centre, footprint: orientedRect(centre, dam.t, dam.n, HYDRO.rack.cleanerSize, HYDRO.rack.cleanerSize) },
  };
}

let site = buildSite(false);
/** Wall height and lake length of the dam as currently built. */
let damH: number = damLook(5).height;
let lakeLength: number = damLook(5).lake;

/** Is this tile-space point on the dam or the powerhouse (plus a small margin)? */
function onPlant(p: Vec): boolean {
  const m = HYDRO.hitMargin;
  return site.hitBoxes.some(({ c, along, across }) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    return Math.abs(dx * dam.t.x + dy * dam.t.y) <= along / 2 + m && Math.abs(dx * dam.n.x + dy * dam.n.y) <= across / 2 + m;
  });
}

/** Is this screen point on the plant? In iso the walls and roof stand above their footprint, so test a few heights too. */
function plantAtScreen(sx: number, sy: number): boolean {
  const lifts = view === "iso" ? [0, 0.25, 0.5, 0.75, 1].map((k) => k * HYDRO.house.height) : [0];
  return lifts.some((lift) => onPlant(toTile(sx, sy + lift * unit)));
}

// ---------- View: top-down or isometric ----------

type View = "top" | "iso";
let view: View = "top";
let showGrid = false;

// The plant, as the panel last configured it.
let plant: PanelState;
/** How blocked the intake rack is, 0 to 1. It creeps up every frame. */
let clog = 0;
const upgradeRoot = document.getElementById("upgrade")!;

const canvas = document.getElementById("world") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let cssW = 1;
let cssH = 1;
let dpr = 1;
/** Pixels per tile (top) or half tile width (iso). */
let unit = 1;
let originX = 0;
let originY = 0;

/**
 * Camera: `zoom` multiplies the fitted scale, `focus` (tile space) is the point shown in the middle of the free area.
 * Without a focus the whole map stays centred. The free area is the screen left of the panel; it grows into view with `zoomAmount`.
 */
const camera: { zoom: number; focus: Vec | null } = { zoom: 1, focus: null };

function fit(): void {
  dpr = window.devicePixelRatio || 1;
  cssW = window.innerWidth;
  cssH = window.innerHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  layout();
}

/** Work out scale and origin for the current view and camera. Cheap, runs every frame while the camera moves. */
function layout(): void {
  const { cols, rows } = MAP;
  const base = view === "top" ? Math.min((cssW * 0.9) / cols, (cssH * 0.8) / rows) : Math.min((cssW * 0.9) / (cols + rows), (cssH * 0.8) / ((cols + rows) / 2));
  unit = base * camera.zoom;
  const focus = camera.focus ?? { x: cols / 2, y: rows / 2 };
  const centreX = camera.focus ? cssW / 2 + ((cssW - upgradeRoot.offsetWidth) / 2 - cssW / 2) * zoomAmount : cssW / 2;
  // Put the focus point exactly at the centre of the free area.
  originX = 0;
  originY = 0;
  const at = toScreen(focus.x, focus.y);
  originX = centreX - at.x;
  originY = cssH / 2 - at.y;
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

/** A box standing on the ground, or floating `lift` tiles above it. `base` is its footprint in tile space, any rotation. */
function prism(base: Vec[], height: number, top: string, side: string, front: string, lift = 0): void {
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
    polygon(
      [toScreen(f.a.x, f.a.y, lift), toScreen(f.b.x, f.b.y, lift), toScreen(f.b.x, f.b.y, lift + height), toScreen(f.a.x, f.a.y, lift + height)],
      f.eastish ? side : front,
    );
  }
  polygon(base.map((p) => toScreen(p.x, p.y, lift + height)), top);
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

/** Fill a flat shape lying on the ground, given in tile space. */
function fillTile(points: Vec[], fill: string): void {
  useTileTransform();
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (const q of points.slice(1)) ctx.lineTo(q.x, q.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
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
      else if (tile === "flooded") ctx.fillStyle = COLORS.flooded;
      else {
        // The dam backs the water up: calmer, deeper water just upstream, as far as the lake reaches.
        const s = tileAlong[row]![col]!;
        ctx.fillStyle = s < damS && s > damS - lakeLength ? COLORS.pond : COLORS.water;
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

/** Water is slow in the lake behind the dam and fast right after the turbine. */
function flowFactor(s: number): number {
  if (s > damS - lakeLength && s < damS) return 0.45;
  if (s >= damS && s < damS + 2.5) return 1.8;
  return 1;
}

/** How fast streaks move at the current river flow, as a multiple of `RIVER.flowSpeed`. */
function speedScale(): number {
  return Math.max(plant.riverFlow / RIVER.referenceFlow, RIVER.minSpeedFactor);
}

function drawStreaks(dt: number): void {
  const scale = speedScale();
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
    q.s += RIVER.flowSpeed * scale * flowFactor(q.s) * dt;
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

/** Streaks inside the canal: `s` runs from 0 (intake) to 1 (powerhouse). */
const canalStreaks = Array.from({ length: HYDRO.canal.streaks }, () => ({
  s: Math.random(),
  offset: (Math.random() - 0.5) * (HYDRO.canal.width - 0.3),
}));

/** Canal, intake and tailrace, with water streaks running through the canal. Nothing without a canal. */
function drawCanal(dt: number): void {
  if (!plant.setup.canal) return;
  for (const piece of site.water) fillTile(piece, COLORS.water);

  const streakLen = 0.3;
  const length = HYDRO.canal.length;
  ctx.strokeStyle = COLORS.streak;
  ctx.lineCap = "round";
  ctx.lineWidth = 0.08;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  for (const q of canalStreaks) {
    q.s += (RIVER.flowSpeed * speedScale() * dt) / length;
    if (q.s > 1) q.s -= 1;
    const from = plantPoint(q.s * length, site.canalAcross + q.offset);
    const to = plantPoint(Math.min(q.s * length + streakLen, length), site.canalAcross + q.offset);
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** White foam right below the dam, only when water goes over it. More foam the larger the share spilled. */
function drawSpill(): void {
  const { spilledFlow } = plant.op;
  if (spilledFlow <= 0 || plant.riverFlow <= 0) return;
  const { p, t, n } = dam;
  const d = (HYDRO.damThickness + HYDRO.foam.length) / 2;
  const foam = orientedRect({ x: p.x + t.x * d, y: p.y + t.y * d }, t, n, HYDRO.foam.length, RIVER.width);
  ctx.globalAlpha = HYDRO.foam.maxAlpha * Math.min(spilledFlow / plant.riverFlow, 1);
  fillTile(foam, COLORS.foam);
  ctx.globalAlpha = 1;
}

/** Four small pools stepping down, on the bank opposite the powerhouse, with water dashes falling from pool to pool. */
function drawFishLadder(now: number): void {
  if (!plant.setup.fishLadder) return;
  const { pools, poolLength, poolWidth, startAfterDam, gapFromRiver, baseHeight, stepHeight, dashSpeed } = HYDRO.ladder;
  const near = RIVER.width / 2 + gapFromRiver;
  const tops: { c: Vec; lift: number }[] = [];
  for (let i = 0; i < pools; i++) {
    const a0 = HYDRO.damThickness / 2 + startAfterDam + i * poolLength;
    const height = baseHeight + (pools - 1 - i) * stepHeight;
    // Negative `across`: the bank opposite the powerhouse.
    prism(plantRect(a0, a0 + poolLength, -(near + poolWidth), -near), height, COLORS.pond, COLORS.concreteSide, COLORS.concreteFront);
    tops.push({ c: plantPoint(a0 + poolLength / 2, -(near + poolWidth / 2)), lift: height });
  }
  useScreenTransform();
  ctx.strokeStyle = COLORS.streak;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.5, unit * 0.05);
  ctx.setLineDash([unit * 0.1, unit * 0.12]);
  ctx.lineDashOffset = -(now / 1000) * dashSpeed * (unit / 30);
  ctx.beginPath();
  for (let i = 0; i < tops.length - 1; i++) {
    const from = toScreen(tops[i]!.c.x, tops[i]!.c.y, tops[i]!.lift);
    const to = toScreen(tops[i + 1]!.c.x, tops[i + 1]!.c.y, tops[i + 1]!.lift);
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Debris dots on the water in front of the rack. Fixed random spots; more of them show as the rack clogs. */
const debris = Array.from({ length: HYDRO.rack.debrisMax }, () => ({ u: Math.random(), v: 0.04 + Math.random() * 0.18 }));

function drawRack(): void {
  const { a, b, out } = site.rack;
  useScreenTransform();
  ctx.lineCap = "round";
  ctx.strokeStyle = COLORS.rack;
  ctx.lineWidth = Math.max(2, unit * 0.05);
  const pa = toScreen(a.x, a.y, HYDRO.rack.lift);
  const pb = toScreen(b.x, b.y, HYDRO.rack.lift);
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.stroke();

  ctx.fillStyle = COLORS.debris;
  const shown = Math.round(clog * HYDRO.rack.debrisMax);
  for (let i = 0; i < shown; i++) {
    const d = debris[i]!;
    const at = toScreen(a.x + (b.x - a.x) * d.u + out.x * d.v, a.y + (b.y - a.y) * d.u + out.y * d.v);
    ctx.beginPath();
    ctx.arc(at.x, at.y, Math.max(2, unit * 0.035), 0, Math.PI * 2);
    ctx.fill();
  }

  if (!plant.setup.autoCleaner) return;
  // A small box at the end of the rack, with an arm reaching across it.
  prism(site.cleaner.footprint, HYDRO.rack.cleanerHeight, COLORS.concreteTop, COLORS.concreteSide, COLORS.concreteFront);
  const from = toScreen(site.cleaner.centre.x, site.cleaner.centre.y, HYDRO.rack.cleanerHeight);
  const to = toScreen((a.x + b.x) / 2, (a.y + b.y) / 2, HYDRO.rack.armLift);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

/** One angle per rotor slot; a rotor only turns while it is running. */
const rotorAngles = new Array<number>(8).fill(0);

/**
 * One rotor of the given technology, centred on `c` and raised by `lift`. `w` is the direction the rotors are lined up in.
 * The caller sets stroke and fill colours, line width and opacity.
 */
function drawRotor(kind: Technology["id"], c: Vec, lift: number, radius: number, angle: number, w: Vec): void {
  const hub = toScreen(c.x, c.y, lift);
  const at = (dx: number, dy: number): Vec => toScreen(c.x + dx, c.y + dy, lift);
  ctx.beginPath();
  if (kind === "kaplan") {
    for (let b = 0; b < 4; b++) {
      const a = angle + (b * Math.PI) / 2;
      const tip = at(Math.cos(a) * radius, Math.sin(a) * radius);
      ctx.moveTo(hub.x, hub.y);
      ctx.lineTo(tip.x, tip.y);
    }
  } else if (kind === "francis") {
    // A rim, and short vanes that curve as they run outwards.
    const rim = 24;
    for (let k = 0; k <= rim; k++) {
      const p = at(Math.cos((k / rim) * Math.PI * 2) * radius, Math.sin((k / rim) * Math.PI * 2) * radius);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    for (let v = 0; v < HYDRO.francisVanes; v++) {
      const a0 = angle + (v * Math.PI * 2) / HYDRO.francisVanes;
      for (let j = 0; j <= 3; j++) {
        const r = radius * (0.2 + (0.8 * j) / 3);
        const a = a0 + (0.8 * j) / 3;
        const p = at(Math.cos(a) * r, Math.sin(a) * r);
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
    }
  } else {
    // A drum: its outline, and lines that slide across it as it turns.
    const u = { x: -w.y, y: w.x };
    const half = radius * HYDRO.crossflow.width;
    const corner = (su: number, sw: number): Vec => at(u.x * radius * su + w.x * half * sw, u.y * radius * su + w.y * half * sw);
    const first = corner(-1, -1);
    ctx.moveTo(first.x, first.y);
    for (const [su, sw] of [[1, -1], [1, 1], [-1, 1]] as const) {
      const p = corner(su, sw);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    for (let k = 0; k < HYDRO.crossflow.lines; k++) {
      const sw = (((angle / (Math.PI * 2)) % 1) + k / HYDRO.crossflow.lines) % 1;
      const from = corner(-1, sw * 2 - 1);
      const to = corner(1, sw * 2 - 1);
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
    }
  }
  ctx.stroke();
  if (kind !== "crossflow") {
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, Math.max(2, unit * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHydro(dt: number): void {
  const { setup, op } = plant;
  const riverHalf = RIVER.width / 2;
  // Dam: a low concrete wall across the whole river, a little wider than the water.
  prism(damFootprint, damH, COLORS.concreteTop, COLORS.concreteSide, COLORS.concreteFront);

  // Spillway gates on the crest, lifted while water spills.
  if (setup.gates) {
    const { count, width, thickness, height, openLift, spillAbove } = HYDRO.gates;
    const lift = damH + (op.spilledFlow > spillAbove ? openLift : 0);
    for (let i = 0; i < count; i++) {
      const across = -riverHalf + (RIVER.width * (i + 0.5)) / count;
      prism(plantRect(-thickness / 2, thickness / 2, across - width / 2, across + width / 2), height, COLORS.gate, COLORS.rotor, COLORS.rotor, lift);
    }
  }

  // Powerhouse on the bank, next to the dam, or at the end of the canal.
  prism(site.houseFootprint, HYDRO.house.height, COLORS.roof, COLORS.wallSide, COLORS.wallFront);

  // Rotors: one per turbine. On the dam crest, or in the tailrace when there is a canal.
  const kind = technologyById(setup.technology).id;
  const radius = sizeById(setup.size).radius;
  useScreenTransform();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = COLORS.rotor;
  ctx.fillStyle = COLORS.rotor;
  ctx.lineWidth = Math.max(1.5, unit * 0.09);
  for (let i = 0; i < setup.count; i++) {
    const running = i < op.running;
    if (running) rotorAngles[i] = rotorAngles[i]! + HYDRO.maxTurnsPerSecond * op.load * Math.PI * 2 * dt;
    const slot = (i + 0.5) / setup.count;
    const spot = setup.canal
      ? { c: plantPoint(site.houseAlong - HYDRO.house.length / 2 + HYDRO.house.length * slot, riverHalf + HYDRO.canal.tailraceWidth / 2), lift: 0, w: dam.t }
      : { c: plantPoint(0, -riverHalf + RIVER.width * slot), lift: damH, w: dam.n };
    ctx.globalAlpha = running ? 1 : HYDRO.idleRotorAlpha;
    drawRotor(kind, spot.c, spot.lift, radius, rotorAngles[i]!, spot.w);
  }
  ctx.globalAlpha = 1;
}

/** Thin white outline around the plant while the mouse is over it. */
function drawPlantOutline(): void {
  useTileTransform();
  ctx.strokeStyle = COLORS.plantOutline;
  ctx.lineWidth = 2 / unit;
  ctx.lineJoin = "round";
  for (const footprint of [damFootprint, site.houseFootprint]) {
    // Grow the footprint outwards from its centre by the outline gap.
    const c = footprint.reduce((s, q) => ({ x: s.x + q.x / 4, y: s.y + q.y / 4 }), { x: 0, y: 0 });
    const grow = (q: Vec): Vec => {
      const dx = q.x - c.x;
      const dy = q.y - c.y;
      const u = dx * dam.t.x + dy * dam.t.y;
      const v = dx * dam.n.x + dy * dam.n.y;
      const su = (Math.abs(u) + HYDRO.outlinePad) / Math.abs(u);
      const sv = (Math.abs(v) + HYDRO.outlinePad) / Math.abs(v);
      return { x: c.x + dam.t.x * u * su + dam.n.x * v * sv, y: c.y + dam.t.y * u * su + dam.n.y * v * sv };
    };
    const pts = footprint.map(grow);
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (const q of pts.slice(1)) ctx.lineTo(q.x, q.y);
    ctx.closePath();
    ctx.stroke();
  }
}

// ---------- Hover readout ----------

let hover: Vec | null = null;
let hoverOnPlant = false;
const readout = document.getElementById("readout")!;

function describeHover(): string {
  if (!hover) return "Move the mouse over the map";
  const col = Math.floor(hover.x);
  const row = Math.floor(hover.y);
  if (col < 0 || row < 0 || col >= MAP.cols || row >= MAP.rows) return "Outside the map";
  if (hoverOnPlant) return `tile ${col}, ${row} · ${HYDRO.name} · ${Math.round(plant.op.powerKW)} kW`;
  return `tile ${col}, ${row} · ${tiles[row]![col]!}`;
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

function refreshHover(): void {
  canvas.style.cursor = hoverOnPlant ? "pointer" : "";
  readout.textContent = describeHover();
}

canvas.addEventListener("pointermove", (e) => {
  hover = toTile(e.clientX, e.clientY);
  hoverOnPlant = plantAtScreen(e.clientX, e.clientY);
  refreshHover();
});
canvas.addEventListener("pointerleave", () => {
  hover = null;
  hoverOnPlant = false;
  refreshHover();
});

// ---------- Opening and closing the plant ----------

/** 0 = overview, 1 = zoomed on the plant. The camera is derived from this one number. */
let zoomAmount = 0;
let zoomAnim: { from: number; to: number; start: number } | null = null;

function animateZoomTo(target: number): void {
  zoomAnim = { from: zoomAmount, to: target, start: performance.now() };
}

function stepCamera(now: number): void {
  if (!zoomAnim) return;
  const progress = Math.min(Math.max((now - zoomAnim.start) / CAMERA.animationMs, 0), 1);
  zoomAmount = zoomAnim.from + (zoomAnim.to - zoomAnim.from) * (1 - (1 - progress) ** 3);
  if (progress >= 1) zoomAnim = null;
  const lerp = (a: number, b: number): number => a + (b - a) * zoomAmount;
  camera.zoom = lerp(1, CAMERA.plantZoom);
  camera.focus = zoomAmount > 0 ? { x: lerp(MAP.cols / 2, dam.p.x), y: lerp(MAP.rows / 2, dam.p.y) } : null;
  layout();
}

function openPlant(): void {
  setView("iso");
  animateZoomTo(1);
  panel.setOpen(true);
}

function closePlant(): void {
  if (!panel.isOpen()) return;
  panel.setOpen(false);
  setView("top");
  animateZoomTo(0);
}

/** Bring the map in line with the panel: lake and flooded land follow the dam, the powerhouse follows the canal. */
let builtDam: DamHeight | null = null;
let builtCanal: boolean | null = null;
function applySetup(setup: PlantSetup): void {
  if (setup.damHeight !== builtDam) {
    builtDam = setup.damHeight;
    damH = damLook(setup.damHeight).height;
    lakeLength = damLook(setup.damHeight).lake;
    rebuildTiles(setup.damHeight);
  }
  if (setup.canal !== builtCanal) {
    builtCanal = setup.canal;
    site = buildSite(setup.canal);
  }
}

const panel = createPanel(upgradeRoot, {
  onChange(state) {
    plant = state;
    applySetup(state.setup);
    refreshHover();
  },
  onClose: closePlant,
  onCleanNow() {
    clog = 0;
  },
  floodedTiles,
});
plant = panel.state;
applySetup(plant.setup);

canvas.addEventListener("click", (e) => {
  const onIt = plantAtScreen(e.clientX, e.clientY);
  if (onIt && !panel.isOpen()) openPlant();
  else if (!onIt) closePlant();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePlant();
});

// ---------- Controls ----------

const viewButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-view]"));
function setView(next: View): void {
  view = next;
  for (const b of viewButtons) b.setAttribute("aria-pressed", String(b.dataset.view === next));
  layout();
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
  clog = stepClog(clog, plant.riverFlow, plant.setup.autoCleaner, dt);
  panel.setClog(clog);
  stepCamera(now);
  useScreenTransform();
  ctx.clearRect(0, 0, cssW, cssH);
  drawGroundSlab();
  drawTiles();
  drawStreaks(dt);
  drawCanal(dt);
  drawHover();
  drawSpill();
  drawFishLadder(now);
  drawRack();
  drawHydro(dt);
  if (hoverOnPlant) drawPlantOutline();
  requestAnimationFrame(frame);
}

fit();
setView("top");
requestAnimationFrame(frame);
