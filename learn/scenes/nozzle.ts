// The Pelton nozzle in section, as a desk object (lesson 6): pipe end and nozzle cut in half, the spear inside,
// the jet, the deflector on its pivot and the runner. Everything lies along +x, the direction of the jet.
import * as THREE from "three";
import { at, box, C, INK, part, setGlow, withThickMul, zcyl, type LessonScene } from "../toon";
import { makeRunner, R } from "./pelton";

export interface NozzleScene extends LessonScene {
  /** Spear opening, 0..1: moves the spear and sets the thickness of the jet. */
  setOpening(opening: number): void;
  /** Swings the deflector into the jet (true) or out of it. */
  setDeflector(on: boolean): void;
}

// nozzle: pipe end from X_START to X_CONE, then the cone down to the jet opening at X_TIP
const X_START = -3.2;
const X_CONE = -1.2;
const X_TIP = 1.6;
const R_OUT = 0.5;
const R_IN = 0.43;
const R_TIP_OUT = 0.22;
const R_JET = 0.12; // jet radius with the spear fully open
const SPEAR_R = 0.14;
const SPEAR_TIP_LEN = 0.4;

// runner, scaled up so one bucket is wider than the jet
const RS = 1.7;
const RUNNER_X = 5.0;
const RUNNER_Y = -R * RS; // the top of the pitch circle is on the jet axis

// deflector plate: hinged above the jet, swings down to the angle DEFL_ANGLE
const PIVOT = new THREE.Vector3(2.5, 0.58, 0);
const PLATE_LEN = 0.9;
const DEFL_ANGLE = 1.15;
const X_HIT = PIVOT.x + PIVOT.y / Math.tan(DEFL_ANGLE); // where the plate crosses the jet axis
const FALL_DX = 0.2; // the turned-away water falls down and a little forward
const FALL_DY = -1.25;
const FLOOR_Y = -3.35;

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function createNozzle(): NozzleScene {
  return withThickMul(1.4, build);
}

/** One cut-open shell (the far half) of a pipe or cone along x; `inner` shows the inside face. */
function shell(x0: number, x1: number, r0: number, r1: number, inner: boolean): THREE.Group {
  const g = new THREE.CylinderGeometry(r1, r0, x1 - x0, 40, 1, true, Math.PI / 2, Math.PI)
    .rotateZ(-Math.PI / 2)
    .translate((x0 + x1) / 2, 0, 0);
  return part(g, inner ? C.steelD : C.steel, { hull: false, side: inner ? THREE.BackSide : THREE.FrontSide });
}

/** The cut face of the wall, in the plane z = 0 (`sign` +1 for the upper wall, -1 for the lower). */
function wallCut(sign: number): THREE.Group {
  const pts: [number, number][] = [
    [X_START, R_OUT], [X_CONE, R_OUT], [X_TIP, R_TIP_OUT], [X_TIP, R_JET], [X_CONE, R_IN], [X_START, R_IN],
  ];
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, sign * y)));
  return part(new THREE.ShapeGeometry(shape), C.shaft, { hull: false, side: THREE.DoubleSide });
}

/** A water cylinder of length 1 and radius 1 along +x from the origin, with an ink outline; scale it to size. */
export function stream(): THREE.Group {
  const geom = new THREE.CylinderGeometry(1, 1, 1, 20).rotateZ(Math.PI / 2).translate(0.5, 0, 0);
  const g = part(geom, C.water, { edges: false, hull: false, emissive: 0x1d5f80 });
  g.add(new THREE.Mesh(geom.clone().scale(1, 1.1, 1.1), new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })));
  return g;
}

function build(): NozzleScene {
  const group = new THREE.Group();
  const parts: Record<string, THREE.Object3D[]> = {};
  const reg = <T extends THREE.Object3D>(id: string, o: T): T => {
    (parts[id] ??= []).push(o);
    group.add(o);
    return o;
  };

  // --- base and supports ---
  group.add(at(box(11.5, 0.2, 2.8, C.concrete), 1.7, FLOOR_Y - 0.1, 0));
  for (const [x, top] of [[-2.2, -R_OUT], [0.6, -0.4]] as const) {
    const h = top - FLOOR_Y;
    group.add(at(box(0.45, h, 0.8, C.concrete), x, FLOOR_Y + h / 2, 0));
  }
  for (const z of [-0.85, 0.85]) {
    const h = RUNNER_Y - FLOOR_Y;
    group.add(at(box(0.4, h, 0.3, C.concrete), RUNNER_X, FLOOR_Y + h / 2, z));
  }
  group.add(at(zcyl(0.2, 0.2, 2.1, C.shaft, 24), RUNNER_X, RUNNER_Y, 0));

  // --- nozzle: pipe end and cone, cut in half ---
  reg("nozzle", shell(X_START, X_CONE, R_OUT, R_OUT, false));
  reg("nozzle", shell(X_CONE, X_TIP, R_OUT, R_TIP_OUT, false));
  reg("nozzle", shell(X_START, X_CONE, R_IN, R_IN, true));
  reg("nozzle", shell(X_CONE, X_TIP, R_IN, R_JET, true));
  reg("nozzle", wallCut(1));
  reg("nozzle", wallCut(-1));

  // --- spear: its tip is at the origin of the group, so the group x is the tip x ---
  const spear = new THREE.Group();
  const shaftLen = 3.2;
  spear.add(at(part(new THREE.CylinderGeometry(SPEAR_R, SPEAR_R, shaftLen, 24).rotateZ(-Math.PI / 2), C.shaft), -SPEAR_TIP_LEN - shaftLen / 2, 0, 0));
  spear.add(at(part(new THREE.ConeGeometry(SPEAR_R, SPEAR_TIP_LEN, 24).rotateZ(-Math.PI / 2), C.shaft), -SPEAR_TIP_LEN / 2, 0, 0));
  reg("spear", spear);

  // --- jet and the water turned away by the deflector ---
  const jet = reg("jet", stream());
  jet.position.x = X_TIP;
  const fall = reg("jet", stream());
  fall.position.set(X_HIT, 0, 0);
  fall.rotation.z = Math.atan2(FALL_DY, FALL_DX);
  fall.visible = false;
  const fallLen = Math.hypot(FALL_DX, FALL_DY);

  // --- deflector: bracket from the nozzle, pivot pin, plate ---
  reg("deflector", at(box(0.08, 0.4, 0.18, C.steelD), 1.5, 0.42, 0));
  reg("deflector", at(box(1.08, 0.06, 0.18, C.steelD), 2.04, PIVOT.y + 0.06, 0));
  reg("deflector", at(zcyl(0.05, 0.05, 0.6, C.shaft, 16), PIVOT.x, PIVOT.y, 0));
  const plate = new THREE.Group();
  plate.position.copy(PIVOT);
  plate.add(at(box(PLATE_LEN, 0.04, 0.5, C.steelD), PLATE_LEN / 2, 0, 0));
  reg("deflector", plate);

  // --- runner ---
  const runner = makeRunner();
  runner.scale.setScalar(RS);
  runner.rotation.y = Math.PI / 2; // shaft along z, buckets on the jet axis at the top
  runner.position.set(RUNNER_X, RUNNER_Y, 0);
  reg("runner", runner);

  // --- state ---
  let opening = 1;
  const defl = { cur: 0, target: 0 };
  const apply = () => {
    const engaged = defl.cur > 0.6;
    const r = R_JET * Math.sqrt(opening);
    jet.scale.set((engaged ? X_HIT : RUNNER_X) - X_TIP, r, r);
    fall.visible = engaged;
    fall.scale.set(fallLen, r, r);
    plate.rotation.z = -DEFL_ANGLE * defl.cur;
    spear.position.x = X_TIP - 0.6 * opening;
  };
  apply();

  const update = (dt: number): boolean => {
    const gap = defl.target - defl.cur;
    if (Math.abs(gap) < 1e-3) return false;
    defl.cur += Math.sign(gap) * Math.min(Math.abs(gap), 4 * dt);
    apply();
    return true;
  };

  const anchors: Record<string, THREE.Vector3> = {
    nozzle: v(0, 0.4, -0.1),
    spear: v(-2.2, 0, 0),
    jet: v(3.3, 0.05, 0),
    deflector: v(PIVOT.x, PIVOT.y, 0),
    runner: v(RUNNER_X + RS * R, RUNNER_Y, 0),
  };

  let lit: string | null = null;
  const highlight = (id: string | null) => {
    if (lit) for (const o of parts[lit] ?? []) setGlow(o, false);
    lit = id;
    if (lit) for (const o of parts[lit] ?? []) setGlow(o, true);
  };

  return {
    group,
    anchors,
    target: v(1.7, -1.2, 0),
    extent: { w: 8.5, h: 6 },
    highlight,
    update,
    setOpening: (o) => {
      opening = o;
      apply();
    },
    setDeflector: (on) => {
      defl.target = on ? 1 : 0;
    },
  };
}
