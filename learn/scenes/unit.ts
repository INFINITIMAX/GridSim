// The Pelton unit as a desk object (lessons 10 and 11).
// Lesson 10: runner, generator with a pole window, a direct shaft or two belt pulleys, a panel with the frequency.
// Lesson 11: the same unit with a flywheel, the panel as load controller (ELC) with a ballast resistor, and a village.
import * as THREE from "three";
import {
  at, box, C, cyl, decal, disposeObject, part, setGlow, textTex, tube, withThickMul, wordSprite, xcyl,
  type LessonScene,
} from "../toon";
import { makeCabinet, makeGenerator, makeRunner } from "./pelton";

export interface UnitScene extends LessonScene {
  /** Switches between the pieces of lesson 10 and of lesson 11 and frames them. */
  setLesson(n: number): void;
  /** Lesson 10: a continuous shaft, or two belt pulleys whose diameters are in the ratio `ratio` (>= 1). */
  setDrive(drive: "direct" | "belt", ratio: number): void;
  /** Lesson 10: number of poles on the generator rotor, 2..12. */
  setPoles(poles: number): void;
  /** Lesson 10: the two rotors turn in proportion to these speeds (slowed down). */
  setSpeeds(turbineRpm: number, genRpm: number): void;
  /** Lesson 10: the frequency light on the panel is green when `ok`, grey otherwise. */
  setFreqOk(ok: boolean): void;
  /** Lesson 11: village load over P0, 0..1. The lamps light in proportion. */
  setVillage(loadPU: number): void;
  /** Lesson 11: ballast power over P0, 0..1. The coils turn red in proportion. */
  setBallast(pu: number): void;
  /** Lesson 11: plays the frequency values `hz` (spread over about 10 s); `onDone` runs when it ends. */
  runTrace(hz: number[], onDone: () => void): void;
  /** Stops a running trace without calling its onDone, and puts lesson 11 back to 50 Hz. */
  stopRun(): void;
}

const AXY = 1.41; // height of the shafts
const SLAB_TOP = 0.3;
const XR = -3.2; // runner
const XP = XR + 1.6; // plane of the coupling and of the pulleys
const XG = XP + 1.4; // generator centre
const DZ = 2.4; // belt: distance between the two shafts
const R_BIG = 0.75; // turbine pulley
const R_MIN = 0.15;
const BELT_T = 0.04;
const BELT_W = 0.2;
const PULLEY_W = 0.28;
const POLE_R = 0.6;
const WIN_AT = Math.PI / 4; // the window looks up and toward the camera
const WIN_HALF = 0.6;

const CAB_X = 0.4;
const CAB_Z = 1.9;
const VILLAGE_X = 4.2;
const HOUSES_Z = [-2.1, -0.7, 0.7, 2.1];
const BULBS_PER_HOUSE = 2;

const RAD_PER_RPM = (2 * Math.PI * 0.02) / 60; // the turning is slowed down to 2 %
const SPIN_50 = 1500 * RAD_PER_RPM;
const TRACE_S = 10;

const GREEN = { css: "#45d07a", lamp: 0x45d07a, glow: 0x1f6a3a };
const AMBER = { css: "#e8b931", lamp: 0xe8b931, glow: 0x6a5410 };
const RED = { css: "#ff5a3c", lamp: 0xff5a3c, glow: 0x7a2a1a };
const GREY = { css: "#9aa3ad", lamp: 0x8a96a3, glow: 0 };

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Sets the colour and the glow of every Lambert material under `obj`. */
function tint(obj: THREE.Object3D, color: number, glow: number): void {
  obj.traverse((o) => {
    const mat = (o as THREE.Mesh).material;
    if (mat instanceof THREE.MeshLambertMaterial) {
      mat.color.setHex(color);
      mat.emissive.setHex(glow);
    }
  });
}

function clear(g: THREE.Group): void {
  for (const c of [...g.children]) {
    g.remove(c);
    disposeObject(c);
  }
}

/** A disc on a shaft along x, with a red bar on its face so that the turning shows. */
function wheel(r: number, w: number): THREE.Group {
  const g = new THREE.Group();
  g.add(xcyl(r, w, C.shaft, 36));
  g.add(at(box(0.03, 0.12, r * 1.6, C.red, { edges: false, hull: false }), w / 2 + 0.01, 0, 0));
  return g;
}

/** A small house with a pyramid roof, 0.9 m wide, standing on y = 0. */
export function makeHouse(): THREE.Group {
  const g = new THREE.Group();
  g.add(at(box(0.9, 0.6, 0.9, C.white), 0, 0.3, 0));
  g.add(at(part(new THREE.ConeGeometry(0.7, 0.45, 4).rotateY(Math.PI / 4), C.red), 0, 0.825, 0));
  return g;
}

/** The closed belt around two pulleys of radius r1 (at z = 0) and r2 (at z = -DZ), as a flat ring. */
function beltGeometry(r1: number, r2: number): THREE.BufferGeometry {
  const outline = (a: number, b: number): THREE.Vector2[] => {
    const th = Math.acos((a - b) / DZ);
    const N = 24;
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= N; i++) {
      const t = -th + (2 * th * i) / N;
      pts.push(new THREE.Vector2(DZ + b * Math.cos(t), b * Math.sin(t)));
    }
    for (let i = 0; i <= N; i++) {
      const t = th + ((2 * Math.PI - 2 * th) * i) / N;
      pts.push(new THREE.Vector2(a * Math.cos(t), a * Math.sin(t)));
    }
    return pts;
  };
  const shape = new THREE.Shape(outline(r1 + BELT_T, r2 + BELT_T));
  shape.holes.push(new THREE.Path(outline(r1, r2)));
  return new THREE.ExtrudeGeometry(shape, { depth: BELT_W, bevelEnabled: false })
    .rotateY(Math.PI / 2)
    .translate(XP - BELT_W / 2, AXY, 0);
}

/** Points of a coil along x: `turns` turns of radius r around the line (y, z). */
function coilPoints(x0: number, x1: number, y: number, z: number, r: number, turns: number): [number, number, number][] {
  const N = turns * 10;
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push([x0 + (x1 - x0) * t, y + r * Math.sin(2 * Math.PI * turns * t), z + r * Math.cos(2 * Math.PI * turns * t)]);
  }
  return pts;
}

export function createUnit(): UnitScene {
  return withThickMul(1.4, build);
}

function build(): UnitScene {
  const group = new THREE.Group();
  const parts: Record<string, THREE.Object3D[]> = {};
  const reg = <T extends THREE.Object3D>(id: string, o: T, parent: THREE.Object3D = group): T => {
    (parts[id] ??= []).push(o);
    parent.add(o);
    return o;
  };

  // ---------- floor, runner, shafts ----------
  group.add(at(box(6.6, 0.3, 5.8, C.concrete), -1.3, 0.15, -0.2));
  const runner = at(makeRunner(), XR, AXY, 0);
  group.add(runner);
  const pillow = AXY + 0.15 - SLAB_TOP;
  for (const x of [XR - 0.55, XR + 0.55, XP - 0.42]) group.add(at(box(0.26, pillow, 0.4, C.steelD), x, SLAB_TOP + pillow / 2, 0));
  group.add(at(xcyl(0.08, XP + 0.3 - XR, C.shaft, 24), (XR + XP + 0.3) / 2, AXY, 0));
  const pulleyT = reg("belt", at(new THREE.Group(), XP, AXY, 0));
  pulleyT.add(wheel(R_BIG, PULLEY_W));

  // the direct coupling: shaft and two discs between the turbine shaft and the generator
  const direct = new THREE.Group();
  const shaftEnd = XG - 0.66;
  direct.add(at(xcyl(0.08, shaftEnd - (XP + 0.3), C.shaft, 24), (XP + 0.3 + shaftEnd) / 2, AXY, 0));
  direct.add(at(xcyl(0.26, 0.12, C.shaft, 32), XP + 0.4, AXY, 0));
  direct.add(at(xcyl(0.26, 0.12, C.shaft, 32), XP + 0.54, AXY, 0));
  reg("coupling", direct);

  const beltHolder = reg("belt", new THREE.Group());

  // ---------- generator, with its pole window ----------
  const gen = at(new THREE.Group(), XG, AXY, 0);
  group.add(gen);
  gen.add(at(box(1.6, 0.2, 1.1, C.concrete), 0, SLAB_TOP + 0.1 - AXY, 0));
  reg("generator", makeGenerator(), gen);
  const stub = at(xcyl(0.08, shaftEnd - XP, C.shaft, 24), (XP + shaftEnd) / 2 - XG, 0, 0);
  gen.add(stub);
  const pulleyG = reg("belt", at(new THREE.Group(), XP - XG, 0, 0), gen);

  const rotor = at(new THREE.Group(), -0.3, 0, 0);
  rotor.add(xcyl(0.58, 0.3, C.steelD, 40));
  const patches = reg("poles", new THREE.Group(), rotor);
  gen.add(rotor);
  const sleeve = new THREE.CylinderGeometry(0.64, 0.64, 0.34, 48, 1, true, WIN_AT + WIN_HALF, 2 * Math.PI - 2 * WIN_HALF).rotateZ(Math.PI / 2);
  reg("poles", at(part(sleeve, C.steel, { hull: false }), -0.3, 0, 0), gen);

  // ---------- flywheel (lesson 11) ----------
  const fly = at(new THREE.Group(), 0.95, 0, 0);
  fly.add(at(xcyl(0.08, 0.55, C.shaft, 24), -0.15, 0, 0));
  const flyWheel = reg("flywheel", wheel(0.5, 0.14), fly);
  gen.add(fly);

  // ---------- panel: frequency display, light, and the ballast on top (lesson 11) ----------
  const cab = at(new THREE.Group(), CAB_X, SLAB_TOP, CAB_Z);
  group.add(cab);
  reg("frequency", makeCabinet(), cab);
  parts.elc = parts.frequency ?? [];
  const tex = textTex(256, 128, () => {});
  const ctx = (tex.image as HTMLCanvasElement).getContext("2d");
  cab.add(at(decal(0.48, 0.24, tex, 0), 0, 1.25, 0.285));
  const lamp = at(cyl(0.07, 0.05, GREY.lamp, 16, { thick: 0.006 }), 0.32, 1.5, 0.28);
  lamp.rotation.x = Math.PI / 2;
  cab.add(lamp);
  const show = (text: string, c: typeof GREEN) => {
    tint(lamp, c.lamp, c.glow);
    if (!ctx) return;
    ctx.fillStyle = "#1c2531";
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = c.css;
    ctx.font = '500 52px "JetBrains Mono"';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 64);
    tex.needsUpdate = true;
  };

  const ballastG = at(new THREE.Group(), 0, 1.6, 0);
  reg("ballast", at(box(0.8, 0.08, 0.44, C.steelD), 0, 0.04, 0), ballastG);
  const coils = [-0.1, 0.1].map((z) => tube(coilPoints(-0.32, 0.32, 0.23, z, 0.11, 5), GREY.lamp, 0.022, { thick: 0.006 }));
  for (const c of coils) ballastG.add(c);
  cab.add(ballastG);

  // ---------- village (lesson 11) ----------
  const village = new THREE.Group();
  group.add(village);
  village.add(at(box(3.6, 0.3, 5.8, C.terrain), 3.8, 0.15, -0.2));
  const bulbs: THREE.Object3D[] = [];
  for (const z of HOUSES_Z) {
    reg("village", at(makeHouse(), VILLAGE_X, SLAB_TOP, z), village);
    for (let k = 0; k < BULBS_PER_HOUSE; k++) {
      const bulb = at(part(new THREE.SphereGeometry(0.09, 12, 8), GREY.lamp, { edges: false, thick: 0.006 }), VILLAGE_X + 0.5, SLAB_TOP + 0.35, z + (k === 0 ? -0.2 : 0.2));
      village.add(bulb);
      bulbs.push(bulb);
    }
  }
  const wireY = SLAB_TOP + 0.12;
  village.add(tube([[CAB_X + 0.45, SLAB_TOP + 0.9, CAB_Z], [1.6, SLAB_TOP + 0.5, CAB_Z], [3.0, wireY, CAB_Z]], 0x2b3038, 0.025, { thick: 0.006 }));
  village.add(tube([[3.0, wireY, -2.4], [3.0, wireY, 0], [3.0, wireY, 2.4]], 0x2b3038, 0.025, { thick: 0.006 }));

  const slowed = wordSprite("slowed down", "#e0442e", 0.34);
  slowed.position.set(XR, AXY + 1.4, 0);
  slowed.visible = false;
  group.add(slowed);

  // ---------- state setters ----------
  const anchors: Record<string, THREE.Vector3> = {};
  const target = v(0, 0, 0);
  const extent = { w: 8.5, h: 5.4 };
  let belt = false;
  let beltMid = 0;

  const updateAnchors = () => {
    const gz = gen.position.z;
    Object.assign(anchors, {
      generator: v(XG + 0.1, AXY + 0.75, gz),
      poles: v(XG - 0.3, AXY + 0.44, gz + 0.44),
      coupling: v(XP + 0.47, AXY, 0),
      belt: belt ? v(XP, AXY + beltMid, -DZ / 2) : v(XP + 0.47, AXY, 0),
      frequency: v(CAB_X, SLAB_TOP + 1.25, CAB_Z + 0.29),
      elc: v(CAB_X + 0.45, SLAB_TOP + 0.6, CAB_Z),
      ballast: v(CAB_X, SLAB_TOP + 1.9, CAB_Z),
      village: v(VILLAGE_X, SLAB_TOP + 1.15, 0),
      flywheel: v(XG + 0.95, AXY + 0.5, 0),
    });
  };

  const spin = { t: 0, g: 0 };
  const setSpin = (t: number, g: number) => {
    spin.t = t;
    spin.g = g;
    slowed.visible = t > 0 || g > 0;
  };

  const setDrive = (drive: "direct" | "belt", ratio: number) => {
    belt = drive === "belt";
    gen.position.z = belt ? -DZ : 0;
    direct.visible = !belt;
    for (const o of [stub, pulleyT, pulleyG, beltHolder]) o.visible = belt;
    if (belt) {
      const r2 = Math.max(R_MIN, R_BIG / Math.max(1, ratio));
      beltMid = (R_BIG + r2) / 2 + BELT_T;
      withThickMul(1.4, () => {
        clear(pulleyG);
        pulleyG.add(wheel(r2, PULLEY_W));
        clear(beltHolder);
        beltHolder.add(part(beltGeometry(R_BIG, r2), 0x2b3038, { angle: 40 }));
      });
    }
    updateAnchors();
  };

  const setPoles = (poles: number) => {
    clear(patches);
    const n = Math.min(12, Math.max(2, Math.round(poles)));
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * k) / n;
      const p = box(0.26, 0.05, 0.2, k % 2 === 0 ? C.red : C.white, { edges: false, hull: false });
      p.position.set(0, POLE_R * Math.cos(a), POLE_R * Math.sin(a));
      p.rotation.x = a;
      patches.add(p);
    }
  };

  const freqColor = (f: number) => (Math.abs(f - 50) < 0.5 ? GREEN : f > 55 ? RED : AMBER);
  const showFrequency = (f: number) => {
    setSpin((f / 50) * SPIN_50, (f / 50) * SPIN_50);
    show(`${f.toFixed(1)} Hz`, freqColor(f));
  };

  const trace = { on: false, t: 0, hz: [] as number[], onDone: () => {} };
  const advanceTrace = (dt: number) => {
    trace.t += dt;
    const k = Math.min(1, trace.t / TRACE_S);
    const x = k * (trace.hz.length - 1);
    const i = Math.floor(x);
    const a = trace.hz[i] ?? 50;
    const b = trace.hz[Math.min(i + 1, trace.hz.length - 1)] ?? a;
    showFrequency(a + (b - a) * (x - i));
    if (k >= 1) {
      trace.on = false;
      trace.onDone();
    }
  };

  let l11 = false;
  const setLesson = (n: number) => {
    l11 = n === 11;
    village.visible = l11;
    ballastG.visible = l11;
    fly.visible = l11;
    target.copy(l11 ? v(0.4, 1.0, 0) : v(-1.2, 1.2, 0));
    extent.w = l11 ? 10.5 : 8.5;
    extent.h = l11 ? 5.2 : 5.4;
    if (l11) {
      setDrive("direct", 1);
      setPoles(4);
      showFrequency(50);
    }
  };
  setLesson(10);
  setDrive("direct", 1);
  setPoles(4);
  updateAnchors();

  let lit: string | null = null;
  const highlight = (id: string | null) => {
    if (lit) for (const o of parts[lit] ?? []) setGlow(o, false);
    lit = id;
    if (lit) for (const o of parts[lit] ?? []) setGlow(o, true);
  };

  const update = (dt: number): boolean => {
    if (trace.on) advanceTrace(dt);
    if (spin.t === 0 && spin.g === 0) return false;
    runner.rotation.x += spin.t * dt;
    pulleyT.rotation.x += spin.t * dt;
    rotor.rotation.x += spin.g * dt;
    pulleyG.rotation.x += spin.g * dt;
    flyWheel.rotation.x += spin.g * dt;
    return true;
  };

  return {
    group,
    anchors,
    target,
    extent,
    highlight,
    update,
    setLesson,
    setDrive,
    setPoles,
    setSpeeds: (turbineRpm, genRpm) => setSpin(turbineRpm * RAD_PER_RPM, genRpm * RAD_PER_RPM),
    setFreqOk: (ok) => show(ok ? "50 Hz" : "-- Hz", ok ? GREEN : GREY),
    setVillage: (loadPU) => {
      const on = Math.round(Math.min(1, Math.max(0, loadPU)) * bulbs.length);
      bulbs.forEach((b, i) => tint(b, i < on ? 0xfff0a0 : GREY.lamp, i < on ? AMBER.lamp : 0));
    },
    setBallast: (pu) => {
      const k = Math.min(1, Math.max(0, pu));
      const color = new THREE.Color(GREY.lamp).lerp(new THREE.Color(0xe0442e), k).getHex();
      const glow = new THREE.Color(0x6a1a10).multiplyScalar(k).getHex();
      for (const c of coils) tint(c, color, glow);
    },
    runTrace: (hz, onDone) => {
      Object.assign(trace, { on: true, t: 0, hz, onDone });
    },
    stopRun: () => {
      trace.on = false;
      if (l11) showFrequency(50);
    },
  };
}
