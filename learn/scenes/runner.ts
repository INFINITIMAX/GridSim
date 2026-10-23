// The big Pelton runner as a desk object (lessons 7 and 8).
// Lesson 7: nozzle, jet, one double bucket cut open (splitter, the two halves of the jet turned back), arrows for the
// water leaving the bucket, and the runner spinning slowly. Lesson 8: the runner seen from the front with 1-6 nozzles.
import * as THREE from "three";
import { at, box, C, part, setGlow, tube, withThickMul, wordSprite, zcyl, type LessonScene, type Pt } from "../toon";
import { DEFLECTION_DEG } from "../sim/bucket";
import { stream } from "./nozzle";
import { makeNozzle, makeRunner, R } from "./pelton";

export interface RunnerScene extends LessonScene {
  /** Shows the pieces of lesson 7 or of lesson 8 and frames them. */
  setLesson(n: number): void;
  /** Lesson 7: speed of the bucket over speed of the jet, 0..1. The runner turns in proportion (slowed down). */
  setSpin(ratio: number): void;
  /** Lesson 7: speed of the water leaving the bucket over speed of the jet, 0..1: length of the arrows. */
  setExit(fraction: number): void;
  /** Lesson 8: number of nozzles, 1..6. */
  setJets(jets: number): void;
  /** Lesson 8: flow over design flow, 0..1. The area of each jet follows it. */
  setFlow(flow: number): void;
  /** Stops the turning without redrawing (the lesson changed). */
  stopSpin(): void;
}

const FLOOR_Y = -3.6;
const MAX_JETS = 6;

// lesson 7: the jet runs along +x on the axis y = AXIS_Y, which is the middle of the cut bucket
const DEPTH = 0.5; // height of the cut bucket under its cut face (y = 0)
const AXIS_Y = -DEPTH / 2;
const JET_R = 0.15;
const NS = 2; // nozzle scale
const NOZ_TIP_X = -2.3;
const NOZ_X = NOZ_TIP_X - 0.25 * NS; // the nozzle tip is 0.25 in front of its origin
const NOSE_X = -0.32; // the front of the splitter
const CUP_R = 0.45; // radius of the curve each half of the jet follows
const WALL = 0.07;
const HALF_R = 0.08; // radius of each half of the jet
const TURN = (DEFLECTION_DEG * Math.PI) / 180;
const PATH_R = CUP_R - HALF_R;
const RS = 1.7; // runner scale
const RUN_X = 3.4;
const RUN_Y = AXIS_Y - R * RS; // the top of the pitch circle is on the jet axis
const SPIN_MAX = 3; // rad/s at u = v1, slowed down on purpose
const ARROW_MIN = 0.28;
const ARROW_MAX = 1.5;
const ARROW_HEAD = 0.18;

// lesson 8
const RS8 = 1.4;
const RP8 = R * RS8; // pitch radius
const JET_LEN8 = 0.45;
const JET_R8 = 0.085; // radius of one jet at full flow
const WHEEL_Y = -1.3;

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const AXIS_X = v(1, 0, 0);
const AXIS_Z = v(0, 0, 1);

export function createRunner(): RunnerScene {
  return withThickMul(1.4, build);
}

/** A flat shape in the x-z plane, standing from y = -DEPTH up to y = 0. */
function section(pts: THREE.Vector2[]): THREE.BufferGeometry {
  return new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: DEPTH, bevelEnabled: false }).rotateX(Math.PI / 2);
}

/** One half of the double cup, cut at y = 0; `sign` picks the +z or the -z half. */
function cupHalf(sign: 1 | -1): THREE.Group {
  const N = 20;
  const arc = (r: number, i: number) => {
    const t = (TURN * i) / N;
    return new THREE.Vector2(r * Math.sin(t), sign * (CUP_R - r * Math.cos(t)));
  };
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) pts.push(arc(CUP_R + WALL, i));
  for (let i = N; i >= 0; i--) pts.push(arc(CUP_R, i));
  return part(section(pts), C.bucket, { angle: 40 });
}

/** The half of the jet that follows the cup, as a tube along its curve. */
function jetHalf(sign: 1 | -1): THREE.Group {
  const pts: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = (TURN * i) / 16;
    pts.push([PATH_R * Math.sin(t), AXIS_Y, sign * (CUP_R - PATH_R * Math.cos(t))]);
  }
  return tube(pts, C.water, HALF_R, { thick: 0.008, emissive: 0x1d5f80 });
}

/** An arrow along +x; `setLength` changes its total length. */
function makeArrow(): { g: THREE.Group; setLength(len: number): void } {
  const g = new THREE.Group();
  const shaft = part(new THREE.CylinderGeometry(0.05, 0.05, 1, 12).rotateZ(-Math.PI / 2).translate(0.5, 0, 0), C.red, {
    edges: false,
    hull: false,
  });
  const head = part(new THREE.ConeGeometry(0.11, ARROW_HEAD, 16).rotateZ(-Math.PI / 2), C.red, { thick: 0.01 });
  g.add(shaft, head);
  return {
    g,
    setLength: (len) => {
      shaft.scale.x = len - ARROW_HEAD;
      head.position.x = len - ARROW_HEAD / 2;
    },
  };
}

function build(): RunnerScene {
  const group = new THREE.Group();
  const g7 = new THREE.Group();
  const g8 = new THREE.Group();
  group.add(g7, g8);
  const parts: Record<string, THREE.Object3D[]> = {};
  const reg = <T extends THREE.Object3D>(id: string, o: T, parent: THREE.Object3D): T => {
    (parts[id] ??= []).push(o);
    parent.add(o);
    return o;
  };

  // ---------- lesson 7 ----------
  g7.add(at(box(11.5, 0.2, 3.2, C.concrete), 0.5, FLOOR_Y - 0.1, 0));
  const nozzleTop = AXIS_Y - 0.36;
  g7.add(at(box(0.45, nozzleTop - FLOOR_Y, 0.8, C.concrete), NOZ_X + 0.2, FLOOR_Y + (nozzleTop - FLOOR_Y) / 2, 0));
  g7.add(at(box(0.8, -DEPTH - FLOOR_Y, 0.9, C.concrete), 0.15, FLOOR_Y + (-DEPTH - FLOOR_Y) / 2, 0));
  for (const z of [-0.85, 0.85]) {
    const h = RUN_Y - FLOOR_Y;
    g7.add(at(box(0.4, h, 0.3, C.concrete), RUN_X, FLOOR_Y + h / 2, z));
  }
  g7.add(at(zcyl(0.2, 0.2, 2.1, C.shaft, 24), RUN_X, RUN_Y, 0));

  const nozzle = makeNozzle();
  nozzle.scale.setScalar(NS);
  nozzle.rotation.y = Math.PI / 2; // the nozzle aims along +x
  nozzle.position.set(NOZ_X, AXIS_Y, 0);
  g7.add(nozzle);

  const jet = reg("jet", stream(), g7);
  jet.position.set(NOZ_TIP_X, AXIS_Y, 0);
  jet.scale.set(NOSE_X + 0.02 - NOZ_TIP_X, JET_R, JET_R);
  for (const sign of [1, -1] as const) {
    reg("bucket", cupHalf(sign), g7);
    reg("jet", jetHalf(sign), g7);
  }
  const wedge = section([new THREE.Vector2(NOSE_X, 0), new THREE.Vector2(0.12, 0.1), new THREE.Vector2(0.12, -0.1)]);
  reg("splitter", part(wedge.translate(0, 0.03, 0), C.steelD, { angle: 40 }), g7); // a little above the cut face

  const arrows = [1, -1].map((sign) => {
    const a = makeArrow();
    a.g.position.set(PATH_R * Math.sin(TURN), AXIS_Y, sign * (CUP_R - PATH_R * Math.cos(TURN)));
    a.g.rotation.y = -sign * TURN; // along the direction the water leaves
    reg("exit", a.g, g7);
    return a;
  });

  const spinner = new THREE.Group(); // turns about the shaft, which is along z
  spinner.position.set(RUN_X, RUN_Y, 0);
  const runner = makeRunner();
  runner.scale.setScalar(RS);
  runner.rotation.y = Math.PI / 2;
  spinner.add(runner);
  reg("runner", spinner, g7);
  const slowed = wordSprite("slowed down", "#e0442e", 0.34);
  slowed.position.set(RUN_X, 0.45, 0);
  slowed.visible = false;
  g7.add(slowed);

  // ---------- lesson 8 ----------
  g8.add(at(box(5.6, 0.2, 3.6, C.concrete), 0, FLOOR_Y - 0.1, 0));
  const wheel = new THREE.Group(); // its shaft points to the camera
  wheel.position.set(0, WHEEL_Y, 0);
  wheel.rotation.y = Math.PI / 4;
  g8.add(wheel);
  const runner8 = makeRunner();
  runner8.scale.setScalar(RS8);
  runner8.rotation.y = Math.PI / 2;
  reg("runner", runner8, wheel);
  wheel.add(zcyl(0.2, 0.2, 2.1, C.shaft, 24));
  for (const z of [-0.85, 0.85]) {
    const h = WHEEL_Y - FLOOR_Y;
    wheel.add(at(box(0.4, h, 0.3, C.concrete), 0, -h / 2, z));
  }
  const pairs = Array.from({ length: MAX_JETS }, () => {
    const nz = reg("nozzles", makeNozzle(), wheel);
    const jet8 = reg("jet", stream(), wheel);
    return { nz, jet8 };
  });

  const dir = new THREE.Vector3();
  const setJets = (jets: number) => {
    const j = Math.min(MAX_JETS, Math.max(1, Math.round(jets)));
    pairs.forEach((p, k) => {
      p.nz.visible = k < j;
      p.jet8.visible = k < j;
      const a = Math.PI / 2 - (2 * Math.PI * k) / j; // clockwise from the top
      const hit = v(RP8 * Math.cos(a), RP8 * Math.sin(a), 0); // where the jet touches the pitch circle
      dir.set(Math.sin(a), -Math.cos(a), 0);
      p.nz.quaternion.setFromUnitVectors(AXIS_Z, dir);
      p.nz.position.copy(hit).addScaledVector(dir, -(JET_LEN8 + 0.25));
      p.jet8.quaternion.setFromUnitVectors(AXIS_X, dir);
      p.jet8.position.copy(hit).addScaledVector(dir, -JET_LEN8);
    });
  };
  const setFlow = (flow: number) => {
    const r = JET_R8 * Math.sqrt(Math.min(1, Math.max(0, flow)));
    for (const p of pairs) p.jet8.scale.set(JET_LEN8, r, r);
  };
  setJets(1);
  setFlow(0.5);

  // ---------- anchors ----------
  group.updateMatrixWorld(true);
  const lessonAnchors: Record<number, Record<string, THREE.Vector3>> = {
    7: {
      bucket: v((CUP_R + WALL) * Math.sin(Math.PI / 2), 0, CUP_R),
      splitter: v(0, 0.03, 0),
      jet: v((NOZ_TIP_X + NOSE_X) / 2, AXIS_Y, 0),
      exit: v(PATH_R * Math.sin(TURN) + 0.15 * Math.cos(TURN), AXIS_Y, CUP_R - PATH_R * Math.cos(TURN) + 0.15 * Math.sin(TURN)),
      runner: v(RUN_X, AXIS_Y, 0),
    },
    8: {
      runner: wheel.localToWorld(v(0, 0, 0.45)),
      nozzles: wheel.localToWorld(v(-(JET_LEN8 + 0.25), RP8, 0)),
      jet: wheel.localToWorld(v(-JET_LEN8 / 2, RP8, 0)),
      curve: wheel.localToWorld(v(0.3, -0.5, 0.45)),
    },
  };
  const anchors: Record<string, THREE.Vector3> = {};
  const target = v(0, 0, 0);
  const extent = { w: 10.5, h: 5.2 };

  const setLesson = (n: number) => {
    const l8 = n === 8;
    g7.visible = !l8;
    g8.visible = l8;
    Object.assign(anchors, lessonAnchors[l8 ? 8 : 7]);
    target.copy(l8 ? v(0, WHEEL_Y, 0) : v(0.5, -1.6, 0));
    extent.w = l8 ? 6 : 10.5;
    extent.h = l8 ? 5.4 : 5.2;
  };
  setLesson(7);

  let lit: string | null = null;
  const highlight = (id: string | null) => {
    if (lit) for (const o of parts[lit] ?? []) setGlow(o, false);
    lit = id;
    if (lit) for (const o of parts[lit] ?? []) setGlow(o, true);
  };

  let spin = 0;
  const update = (dt: number): boolean => {
    if (spin === 0) return false;
    spinner.rotation.z -= spin * SPIN_MAX * dt; // clockwise: the top moves with the jet
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
    setSpin: (ratio) => {
      spin = Math.min(1, Math.max(0, ratio));
      slowed.visible = spin > 0;
    },
    setExit: (fraction) => {
      const len = ARROW_MIN + (ARROW_MAX - ARROW_MIN) * Math.min(1, Math.max(0, fraction));
      for (const a of arrows) a.setLength(len);
    },
    setJets,
    setFlow,
    stopSpin: () => {
      spin = 0;
      slowed.visible = false;
    },
  };
}
