// The penstock on its hillside, as a desk object (lessons 4 and 5): forebay on top, pipe with anchor blocks,
// a big inlet valve, the Pelton unit at the bottom. Lesson 4 adds the energy line and the H cotes;
// lesson 5 adds the pressure gauge and the pressure wave.
import * as THREE from "three";
import {
  at, box, C, cyl, overlayLines, part, setGlow, textTex, tube, withThickMul, wordSprite, zcyl,
  type LessonScene, type Pt,
} from "../toon";
import { GROSS_HEAD_M } from "../sim/friction";
import type { HammerParams } from "../sim/hammer";
import { makeUnit, R, RUN } from "./pelton";

export interface PenstockScene extends LessonScene {
  /** Shows the pieces of lesson 4 (energy line, cotes) or of lesson 5 (gauge, pressure wave). */
  setLesson(n: number): void;
  /** Moves the energy line: friction loss and gross head, both in m. */
  setLoss(hfM: number, h0M: number): void;
  /** Plays one valve closing with the pressure wave. */
  runHammer(params: HammerParams, onDone: () => void): void;
  /** Stops a running closing without calling its onDone (the lesson changed). */
  stopHammer(): void;
}

// hillside: shelf on top (z < SHELF_END), slope, bench at the bottom (z > FOOT); it falls toward +z
const XH = 2.4;
const ZB = -4.6;
const ZF = 5.2;
const SHELF_END = -2.8;
const FOOT = 1.5;
const Y_TOP = 4.6;
const Y_BENCH = 0.5;
const BOT = -0.3;
const gy = (z: number): number =>
  z <= SHELF_END ? Y_TOP : z >= FOOT ? Y_BENCH : Y_TOP - ((Y_TOP - Y_BENCH) * (z - SHELF_END)) / (FOOT - SHELF_END);

// the Pelton unit, scaled down, standing on the bench with its runner under the pipe (x = 0)
const S = 0.6;
const Y0 = Y_BENCH;
const Z0 = 3.2;
const X0 = -RUN.x * S;
const NOZ_Y = Y0 + (RUN.y + R) * S;

const WL = Y_TOP + 0.45; // water level in the forebay
const HG = WL - NOZ_Y; // gross head in scene units
const PEN_R = 0.17;
const VALVE_Z = 1.45;

// lesson 4: where the cotes stand
// the cotes stand just outside the right face of the hill, level with the nozzle
const GX = XH + 0.5;
const NET_X = XH + 1.1;
const EL_Z0 = -2.85; // the energy line starts at the forebay's downhill wall
const DROP_FACTOR = 5; // the loss is shown 5 times larger, and the scene says so
const DROP_MAX = 0.85; // share of the gross head the shown loss can reach

// lesson 5
const GAUGE_MAX_M = 200; // the dial runs 0..200 m
const GAUGE_Z = 0.9;
const U_VALVE = 0.9; // position of the valve along the pipe, 0 = forebay, 1 = unit
const U_FOREBAY = 0.02;
const U_PARKED = 0.55;
const WAVE_S = 1.4; // seconds the wave needs to climb to the forebay, slowed down on purpose

const DIM = 0xe0442e;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function createPenstock(): PenstockScene {
  return withThickMul(1.4, build);
}

function build(): PenstockScene {
  const group = new THREE.Group();
  const parts: Record<string, THREE.Object3D[]> = {};
  const reg = <T extends THREE.Object3D>(id: string, o: T): T => {
    (parts[id] ??= []).push(o);
    group.add(o);
    return o;
  };

  // --- hillside ---
  const shape = new THREE.Shape();
  shape.moveTo(ZB, BOT);
  shape.lineTo(ZF, BOT);
  shape.lineTo(ZF, Y_BENCH);
  shape.lineTo(FOOT, Y_BENCH);
  shape.lineTo(SHELF_END, Y_TOP);
  shape.lineTo(ZB, Y_TOP);
  shape.closePath();
  const eg = new THREE.ExtrudeGeometry(shape, { depth: 2 * XH, bevelEnabled: false });
  eg.rotateY(-Math.PI / 2);
  eg.translate(XH, 0, 0);
  group.add(part(eg, C.terrain));

  // --- forebay ---
  const FZ = -3.65;
  reg("forebay", at(box(1.7, 0.1, 1.7, C.concrete), 0, Y_TOP + 0.05, FZ));
  reg("forebay", at(box(1.7, 0.6, 0.1, C.concrete), 0, Y_TOP + 0.35, FZ - 0.8));
  reg("forebay", at(box(1.7, 0.6, 0.1, C.concrete), 0, Y_TOP + 0.35, FZ + 0.8));
  for (const dx of [-0.8, 0.8]) reg("forebay", at(box(0.1, 0.6, 1.7, C.concrete), dx, Y_TOP + 0.35, FZ));
  reg("forebay", at(box(1.5, 0.06, 1.5, C.water, { edges: false }), 0, WL - 0.03, FZ));

  // --- unit ---
  const { g: unit, NZ } = withThickMul(4, () => makeUnit(false));
  unit.scale.setScalar(S);
  unit.position.set(X0, Y0, Z0);
  group.add(unit);
  const NOZ_Z = Z0 + NZ.z * S;

  // --- penstock, with a bend at each corner and an anchor block under each bend ---
  const pen: Pt[] = [
    [0, Y_TOP + 0.28, SHELF_END - 0.1],
    [0, gy(-2.4) + 0.3, -2.4],
    [0, gy(-0.2) + 0.3, -0.2],
    [0, NOZ_Y, GAUGE_Z],
    [0, NOZ_Y, Z0 - 2.1 * S + 0.1],
  ];
  reg("penstock", tube(pen, C.pipe, PEN_R));
  const curve = new THREE.CatmullRomCurve3(pen.map((p) => v(...p)));
  for (const [, y, z] of pen.slice(1, 4)) {
    const h = Math.max(0.25, y - PEN_R - gy(z) + 0.04);
    reg("anchor", at(box(0.6, h, 0.5, C.concrete), 0, gy(z) + h / 2 - 0.04, z));
  }

  // --- inlet valve, much larger than the one in the plant scene ---
  const valve = new THREE.Group();
  valve.position.set(0, NOZ_Y, VALVE_Z);
  valve.add(box(0.7, 0.7, 0.4, C.red));
  for (const dz of [-0.26, 0.26]) valve.add(at(zcyl(0.27, 0.27, 0.1, C.steelD, 28), 0, 0, dz));
  const stem = new THREE.Group();
  stem.add(at(cyl(0.045, 0.5, C.shaft, 10), 0, 0.25, 0));
  const wheel = part(new THREE.TorusGeometry(0.25, 0.035, 10, 32).rotateX(Math.PI / 2), C.red, { edges: false, thick: 0.01 });
  wheel.position.y = 0.5;
  stem.add(wheel);
  valve.add(stem);
  reg("valve", valve);
  /** 1 = open (stem up), 0 = closed (stem down, wheel turned). */
  const setValve = (open: number) => {
    stem.position.y = 0.15 + 0.2 * open;
    stem.rotation.y = open * 6;
  };
  setValve(1);

  // --- lesson 4: energy line and cotes ---
  const hydro = new THREE.Group();
  group.add(hydro);
  const elGroup = new THREE.Group();
  elGroup.position.y = WL;
  const energyLine = overlayLines([0, 0, EL_Z0, 0, -1, NOZ_Z], DIM, 2.4, true);
  elGroup.add(energyLine);
  hydro.add(elGroup);
  const notToScale = wordSprite("not to scale", "#e0442e", 0.42);
  notToScale.position.set(0, WL + 0.35, (EL_Z0 + NOZ_Z) / 2);
  hydro.add(notToScale);

  // gross head: from the forebay level down to the nozzle, with thin leaders from both ends
  hydro.add(overlayLines([GX, WL, NOZ_Z, GX, NOZ_Y, NOZ_Z], DIM, 2.4));
  hydro.add(overlayLines([GX - 0.18, WL, NOZ_Z, GX + 0.18, WL, NOZ_Z], DIM, 2.4));
  hydro.add(overlayLines([0, WL, NOZ_Z, GX, WL, NOZ_Z, 0, NOZ_Y, NOZ_Z, NET_X + 0.18, NOZ_Y, NOZ_Z], DIM, 1.4, true));
  hydro.add(overlayLines([GX - 0.18, NOZ_Y, NOZ_Z, NET_X + 0.18, NOZ_Y, NOZ_Z], DIM, 2.4));
  const grossLabel = wordSprite("H gross", "#e0442e", 0.5);
  grossLabel.position.set(GX - 0.7, (WL + NOZ_Y) / 2, NOZ_Z);
  hydro.add(grossLabel);

  // net head: from the end of the energy line down to the nozzle
  const netGroup = new THREE.Group();
  netGroup.position.set(NET_X, WL, NOZ_Z);
  const netLine = overlayLines([0, 0, 0, 0, -1, 0], DIM, 2.4);
  netGroup.add(netLine);
  netGroup.add(overlayLines([-0.18, 0, 0, 0.18, 0, 0], DIM, 2.4));
  netGroup.add(overlayLines([-NET_X, 0, 0, 0, 0, 0], DIM, 1.4, true));
  const netLabel = wordSprite("H net", "#e0442e", 0.5);
  netLabel.position.x = 0.75;
  netGroup.add(netLabel);
  hydro.add(netGroup);

  // --- lesson 5: pressure gauge and pressure wave ---
  const hammer = new THREE.Group();
  hammer.visible = false;
  group.add(hammer);
  const gaugeY = NOZ_Y + 1.15;
  const gauge = new THREE.Group();
  gauge.position.set(0, gaugeY, GAUGE_Z);
  gauge.rotation.y = Math.PI / 4;
  gauge.add(zcyl(0.32, 0.32, 0.08, C.white, 36));
  const dial = textTex(256, 256, (x, w, h) => {
    x.strokeStyle = "#1c2531";
    x.lineWidth = 5;
    x.lineCap = "round";
    for (let k = 0; k <= 10; k++) {
      const a = 0.75 * Math.PI - (k / 10) * 1.5 * Math.PI; // same angle as the needle
      const sx = -Math.sin(a);
      const sy = -Math.cos(a);
      x.beginPath();
      x.moveTo(w / 2 + sx * 0.7 * (w / 2), h / 2 + sy * 0.7 * (h / 2));
      x.lineTo(w / 2 + sx * 0.88 * (w / 2), h / 2 + sy * 0.88 * (h / 2));
      x.stroke();
    }
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.58), new THREE.MeshBasicMaterial({ map: dial, transparent: true }));
  face.position.z = 0.045;
  gauge.add(face);
  const needle = new THREE.Group();
  needle.position.z = 0.06;
  needle.add(at(part(new THREE.BoxGeometry(0.035, 0.24, 0.015), C.red, { edges: false, thick: 0.006 }), 0, 0.11, 0));
  gauge.add(needle);
  const setNeedle = (valueM: number) => {
    const f = Math.min(1, Math.max(0, valueM / GAUGE_MAX_M));
    needle.rotation.z = 0.75 * Math.PI - f * 1.5 * Math.PI;
  };
  setNeedle(GROSS_HEAD_M);
  reg("gauge", gauge);
  const riser = at(cyl(0.035, gaugeY - 0.32 - NOZ_Y - PEN_R + 0.04, C.steelD, 10), 0, (gaugeY - 0.32 + NOZ_Y + PEN_R) / 2 - 0.02, GAUGE_Z);
  reg("gauge", riser);
  hammer.add(gauge, riser);

  const ring = part(new THREE.TorusGeometry(0.26, 0.05, 12, 36), C.red, { edges: false, thick: 0.012, emissive: 0x6a1a10 });
  reg("wave", ring);
  hammer.add(ring);
  const slowed = wordSprite("slowed down", "#e0442e", 0.34);
  slowed.visible = false;
  hammer.add(slowed);
  const placeRing = (u: number) => {
    const p = curve.getPointAt(u);
    ring.position.copy(p);
    ring.quaternion.setFromUnitVectors(v(0, 0, 1), curve.getTangentAt(u));
    slowed.position.copy(p).add(v(0.9, 0.4, 0));
  };
  placeRing(U_PARKED);

  // --- highlight ---
  const aliases: Record<string, string[]> = { wall: ["penstock"] };
  let lit: string[] = [];
  const highlight = (id: string | null) => {
    for (const k of lit) for (const o of parts[k] ?? []) setGlow(o, false);
    lit = id === null ? [] : (aliases[id] ?? [id]);
    for (const k of lit) for (const o of parts[k] ?? []) setGlow(o, true);
  };

  // --- anchors for callouts ---
  const bend2: Pt = pen[2] ?? [0, 0, 0];
  const anchors: Record<string, THREE.Vector3> = {
    forebay: v(0, WL, FZ),
    penstock: curve.getPointAt(0.35),
    anchor: v(0, gy(bend2[2]) + 0.1, bend2[2]),
    energy: v(0, WL, 0),
    net: v(NET_X, (WL + NOZ_Y) / 2, NOZ_Z),
    valve: v(0, NOZ_Y + 0.4, VALVE_Z),
    wave: curve.getPointAt(U_PARKED),
    wall: curve.getPointAt(0.75),
    gauge: v(0, gaugeY, GAUGE_Z),
  };

  const setLoss = (hfM: number, h0M: number) => {
    const drop = Math.min(DROP_MAX, (DROP_FACTOR * hfM) / h0M) * HG;
    energyLine.scale.y = drop;
    netGroup.position.y = WL - drop;
    netLine.scale.y = HG - drop;
    netLabel.position.y = -(HG - drop) / 2;
    anchors.energy = v(0, WL - (drop * (0 - EL_Z0)) / (NOZ_Z - EL_Z0), 0);
    anchors.net = v(NET_X, WL - drop - (HG - drop) / 2, NOZ_Z);
  };
  setLoss(0.98, GROSS_HEAD_M);

  // --- the closing ---
  const run = { on: false, t: 0, p: { closeS: 0, h0M: GROSS_HEAD_M, dH: 0 } as HammerParams, onDone: () => {} };
  const reset = () => {
    run.on = false;
    setValve(1);
    placeRing(U_PARKED);
    slowed.visible = false;
    setNeedle(GROSS_HEAD_M);
  };

  const update = (dt: number): boolean => {
    if (!run.on) return false;
    run.t += dt;
    const { closeS, h0M, dH } = run.p;
    const closeT = 0.4 + 0.08 * closeS; // slowed down too: 0.1..20 s of closing last 0.4..2 s here
    const waveEnd = closeT + 2 * WAVE_S;
    const fadeEnd = waveEnd + 0.7;
    if (run.t < closeT) {
      const k = run.t / closeT;
      setValve(1 - k);
      setNeedle(h0M + dH * k);
    } else if (run.t < waveEnd) {
      const w = (run.t - closeT) / WAVE_S; // 0..1 up, 1..2 back
      placeRing(U_VALVE + (U_FOREBAY - U_VALVE) * (w <= 1 ? w : 2 - w));
    } else if (run.t < fadeEnd) {
      setNeedle(h0M + dH * (1 - (run.t - waveEnd) / 0.7));
    } else {
      const done = run.onDone;
      reset();
      done();
    }
    return true;
  };

  return {
    group,
    anchors,
    target: v(0.2, 2.2, 0.3),
    extent: { w: 11, h: 9 },
    highlight,
    update,
    setLesson: (n) => {
      hydro.visible = n === 4;
      hammer.visible = n === 5;
    },
    setLoss,
    runHammer: (p, onDone) => {
      if (run.on) return;
      Object.assign(run, { on: true, t: 0, p, onDone });
      placeRing(U_VALVE);
      slowed.visible = true;
      highlight(null);
    },
    stopHammer: () => {
      reset();
      highlight(null);
    },
  };
}
