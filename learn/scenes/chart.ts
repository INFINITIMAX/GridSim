// The board with the map of specific speed against head (lesson 9), as a desk object: log-log axes, a band for each
// turbine type, a red point for the chosen turbine, and beside it the Pelton runner (scaled by D1) and a generator.
import * as THREE from "three";
import { ACCENT, at, box, C, disposeObject, part, rbox, setGlow, withThickMul, wordSprite, xcyl, type LessonScene } from "../toon";
import { bandFor, type Turbine } from "../sim/specific";
import { makeGenerator, makeRunner, R } from "./pelton";

export interface ChartScene extends LessonScene {
  /** Moves the red point to head (m) and specific speed. */
  setPoint(headM: number, nqe: number): void;
  /** Number of Pelton jets, 1..4: the Pelton band widens by √j. */
  setJets(jets: number): void;
  /** Scales the runner by its diameter D1 (m), or hides it with null. */
  setRunner(d1M: number | null): void;
}

// plot: head on x (log, 1-1000 m), specific speed on y (log, 0.001-2)
const H_MIN = 1;
const H_MAX = 1000;
const N_MIN = 0.001;
const N_MAX = 2;
const PW = 6;
const PH = 4.2;
const BOARD_W = 7.6;
const BOARD_H = 5.6;
const BOARD_D = 0.14;
const BOARD_Y0 = 0.8;
const FRONT = BOARD_D / 2;
const OX = -BOARD_W / 2 + 1.1; // lower-left corner of the plot, on the board
const OY = BOARD_Y0 + 0.7;

// runner and generator on their own axis, to the right of the board
const AGG_X = BOARD_W / 2 + 2.6;
const AXIS_H = 1.5; // height of the shaft above the floor
const UNITS_PER_M = 2;
const RUN_SCALE_MIN = 0.25;
const RUN_SCALE_MAX = 1.2;
const RUN_X = -1.1;
const GEN_X = 1.2;
const GEN_FEET = 0.91; // the feet of makeGenerator are this far under its axis

const BANDS_STYLE: Record<Turbine, { color: number; depth: number; label: string }> = {
  kaplan: { color: C.lcd, depth: 0.05, label: "Kaplan" },
  francis: { color: C.sand, depth: 0.08, label: "Francis" },
  pelton: { color: C.steel, depth: 0.11, label: "Pelton" },
};
const TYPES: readonly Turbine[] = ["pelton", "francis", "kaplan"];

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const xOf = (headM: number) => OX + (PW * Math.log10(clamp(headM, H_MIN, H_MAX) / H_MIN)) / Math.log10(H_MAX / H_MIN);
const yOf = (nqe: number) => OY + (PH * Math.log10(clamp(nqe, N_MIN, N_MAX) / N_MIN)) / Math.log10(N_MAX / N_MIN);

export function createChart(): ChartScene {
  return withThickMul(1.4, build);
}

function build(): ChartScene {
  const root = new THREE.Group(); // turned so the board faces the camera
  root.rotation.y = Math.PI / 4;
  const parts: Record<string, THREE.Object3D[]> = {};
  const reg = <T extends THREE.Object3D>(id: string, o: T): T => {
    (parts[id] ??= []).push(o);
    root.add(o);
    return o;
  };
  const label = (text: string, color: string, height: number, x: number, y: number) => {
    const s = wordSprite(text, color, height);
    s.position.set(x, y, FRONT + 0.2);
    root.add(s);
    return s;
  };

  // ---------- board, legs, base ----------
  root.add(at(box(14, 0.2, 3.6, C.concrete), 2.2, -0.1, 0));
  reg("map", at(rbox(BOARD_W, BOARD_H, BOARD_D, 0.04, C.white), 0, BOARD_Y0 + BOARD_H / 2, 0));
  for (const x of [-2.8, 2.8]) root.add(at(box(0.4, BOARD_Y0, 0.5, C.concrete), x, BOARD_Y0 / 2, 0));

  // ---------- grid, axes, labels ----------
  const line = (w: number, h: number, x: number, y: number, color: number) =>
    root.add(at(box(w, h, 0.012, color, { edges: false, hull: false }), x, y, FRONT + 0.006));
  for (const h of [1, 10, 100, 1000]) {
    line(0.012, PH, xOf(h), OY + PH / 2, 0xdde3e8);
    label(String(h), "#5d6874", 0.26, xOf(h), OY - 0.28);
  }
  for (const n of [0.001, 0.01, 0.1, 1]) {
    line(PW, 0.012, OX + PW / 2, yOf(n), 0xdde3e8);
    label(String(n), "#5d6874", 0.26, OX - 0.5, yOf(n));
  }
  line(0.03, PH, OX, OY + PH / 2, C.base);
  line(PW, 0.03, OX + PW / 2, OY, C.base);
  label("H (m)", "#1c2531", 0.3, OX + PW - 0.4, OY - 0.62);
  label("nQE", "#1c2531", 0.3, OX - 0.1, OY + PH + 0.3);

  // ---------- bands ----------
  const holders: Record<Turbine, THREE.Group> = { pelton: new THREE.Group(), francis: new THREE.Group(), kaplan: new THREE.Group() };
  const names: Record<Turbine, THREE.Sprite> = {
    pelton: label(BANDS_STYLE.pelton.label, "#1c2531", 0.34, 0, 0),
    francis: label(BANDS_STYLE.francis.label, "#1c2531", 0.34, 0, 0),
    kaplan: label(BANDS_STYLE.kaplan.label, "#1c2531", 0.34, 0, 0),
  };
  const anchors: Record<string, THREE.Vector3> = {};
  let lit: string | null = null;
  const setBand = (type: Turbine, jets: number) => {
    const holder = holders[type];
    for (const child of [...holder.children]) {
      holder.remove(child);
      disposeObject(child);
    }
    const b = bandFor(type, jets);
    const x0 = xOf(b.headM[0]);
    const x1 = xOf(b.headM[1]);
    const y0 = yOf(b.nqe[0]);
    const y1 = yOf(b.nqe[1]);
    const s = BANDS_STYLE[type];
    holder.add(at(box(x1 - x0, y1 - y0, s.depth, s.color, { lw: 1.2 }), (x0 + x1) / 2, (y0 + y1) / 2, FRONT + s.depth / 2));
    if (lit === type) setGlow(holder, true);
    names[type].position.set((x0 + x1) / 2, (y0 + y1) / 2, FRONT + 0.2);
    anchors[type] = root.localToWorld(v(x1 - 0.25, y1 - 0.12, FRONT + s.depth));
  };
  for (const type of TYPES) {
    reg(type, holders[type]);
    setBand(type, 1);
  }

  // ---------- the point ----------
  const dot = part(new THREE.SphereGeometry(0.11, 20, 14), ACCENT, { thick: 0.012, emissive: 0x6a1a10 });
  root.add(dot);

  // ---------- runner and generator ----------
  const agg = new THREE.Group(); // its axis is turned 45 degrees from the board, like the unit in the other lessons
  agg.position.set(AGG_X, AXIS_H, 0.4);
  agg.rotation.y = Math.PI / 4;
  root.add(agg);
  const runner = reg("runner", new THREE.Group());
  runner.position.x = RUN_X;
  runner.add(makeRunner());
  agg.add(runner);
  const gen = reg("generator", makeGenerator());
  gen.position.x = GEN_X;
  agg.add(gen);
  agg.add(xcyl(0.08, 2.2, C.shaft, 24));
  agg.add(at(box(0.26, AXIS_H, 0.36, C.steelD), -0.35, -AXIS_H / 2, 0));
  agg.add(at(xcyl(0.2, 0.28, C.steelD, 28), -0.35, 0, 0));
  agg.add(at(box(1.5, AXIS_H - GEN_FEET, 1.1, C.concrete), GEN_X, -(AXIS_H + GEN_FEET) / 2, 0));

  anchors.map = root.localToWorld(v(0.5, BOARD_Y0 + BOARD_H - 0.3, FRONT));
  anchors.generator = gen.localToWorld(v(0, 0.75, 0));
  anchors.runner = runner.localToWorld(v(0, R, 0));

  // ---------- state ----------
  const setPoint = (headM: number, nqe: number) => {
    dot.position.set(xOf(headM), yOf(nqe), FRONT + 0.3);
  };
  setPoint(59, 0.0217);

  const setRunner = (d1M: number | null) => {
    runner.visible = d1M !== null;
    if (d1M === null) return;
    runner.scale.setScalar(clamp((d1M * UNITS_PER_M) / (2 * R), RUN_SCALE_MIN, RUN_SCALE_MAX));
    anchors.runner = runner.localToWorld(v(0, R, 0));
  };
  setRunner(0.42);

  const highlight = (id: string | null) => {
    if (lit) for (const o of parts[lit] ?? []) setGlow(o, false);
    lit = id;
    if (lit) for (const o of parts[lit] ?? []) setGlow(o, true);
  };

  return {
    group: root,
    anchors,
    target: root.localToWorld(v(2.0, 3.2, 0)),
    extent: { w: 13, h: 7.6 },
    highlight,
    update: () => false,
    setPoint,
    setJets: (jets) => setBand("pelton", clamp(Math.round(jets), 1, 4)),
    setRunner,
  };
}
