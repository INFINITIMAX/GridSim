import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE as P } from "../palette";
import { GROUND_Y, at, beamGeometry, roundedBox, solid, worldPoint } from "../parts";

const PYLON_HEIGHT = 6.2;
const PYLON_BASE_HALF = 0.75;
const PYLON_TOP_HALF = 0.22;
const PYLON_LEVELS = [0.25, 2.1, 3.9, 5.5] as const;
const PYLON_BEAM = 0.05;

const TRANSFORMER_POS = { x: 0.6, z: -2.2, rotY: -0.4 };
const PYLON_POS = { x: 0.2, z: 1.0, rotY: -Math.PI / 4 };

/** World-space connection points of the fixed grid equipment. */
export interface Substation {
  /** Transformer bushings: generators and the pylon connect here. */
  bushingTops: THREE.Vector3[];
  /** Upper pylon insulators: connected to the transformer. */
  upperTips: THREE.Vector3[];
  /** Lower pylon insulators: connected to the districts and consumers. */
  lowerTips: THREE.Vector3[];
}

function makeTransformer(): { group: THREE.Group; bushingTops: THREE.Vector3[] } {
  const g = new THREE.Group();
  g.add(at(solid(new THREE.BoxGeometry(1.1, 0.12, 0.9), P.slab), 0, 0.06, 0));
  g.add(at(roundedBox(0.8, 0.6, 0.6, P.steel, 0.04), 0, 0.42, 0));
  for (let i = 0; i < 4; i++) {
    g.add(at(solid(new THREE.BoxGeometry(0.05, 0.45, 0.2), P.steel), 0.45, 0.42, -0.24 + i * 0.16));
  }
  const bushingTops: THREE.Vector3[] = [];
  for (const x of [-0.2, 0.2]) {
    g.add(at(solid(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 8), P.insulator), x, 0.87, 0));
    g.add(at(solid(new THREE.ConeGeometry(0.08, 0.1, 8), P.insulator), x, 1.07, 0));
    bushingTops.push(new THREE.Vector3(x, 1.14, 0));
  }
  return { group: g, bushingTops };
}

function pylonHalfAt(y: number): number {
  return PYLON_BASE_HALF + (PYLON_TOP_HALF - PYLON_BASE_HALF) * (y / PYLON_HEIGHT);
}

function pylonCorner(k: number, y: number): THREE.Vector3 {
  const signs: readonly (readonly [number, number])[] = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ];
  const s = signs[k % 4] ?? [1, 1];
  const half = pylonHalfAt(y);
  return new THREE.Vector3(s[0] * half, y, s[1] * half);
}

/** Hanging insulator string at the end of a cross-arm; returns the wire attach point. */
function addInsulator(g: THREE.Group, x: number, armY: number): THREE.Vector3 {
  g.add(at(solid(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), P.insulator), x, armY - 0.2, 0));
  for (let i = 0; i < 3; i++) {
    g.add(at(solid(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 8), P.insulator), x, armY - 0.1 - i * 0.1, 0));
  }
  return new THREE.Vector3(x, armY - 0.44, 0);
}

/** Lattice pylon; all steel bars are merged into one mesh. */
function makePylon(): { group: THREE.Group; upperTips: THREE.Vector3[]; lowerTips: THREE.Vector3[] } {
  const g = new THREE.Group();
  g.add(at(solid(new THREE.BoxGeometry(2.0, 0.2, 2.0), P.slab), 0, 0.1, 0));

  const bars: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 4; k++) {
    bars.push(beamGeometry(pylonCorner(k, 0.2), pylonCorner(k, PYLON_HEIGHT), PYLON_BEAM * 1.3));
  }
  for (const y of PYLON_LEVELS) {
    for (let k = 0; k < 4; k++) bars.push(beamGeometry(pylonCorner(k, y), pylonCorner(k + 1, y), PYLON_BEAM));
  }
  for (let i = 0; i < PYLON_LEVELS.length - 1; i++) {
    const lo = PYLON_LEVELS[i] ?? 0;
    const hi = PYLON_LEVELS[i + 1] ?? 0;
    for (let k = 0; k < 4; k++) {
      bars.push(beamGeometry(pylonCorner(k, lo), pylonCorner(k + 1, hi), PYLON_BEAM * 0.7));
      bars.push(beamGeometry(pylonCorner(k + 1, lo), pylonCorner(k, hi), PYLON_BEAM * 0.7));
    }
  }

  const upperY = PYLON_LEVELS[3] ?? PYLON_HEIGHT;
  const lowerY = PYLON_LEVELS[2] ?? PYLON_HEIGHT / 2;
  const upperArm = 1.3;
  const lowerArm = 1.6;
  bars.push(beamGeometry(new THREE.Vector3(-upperArm, upperY, 0), new THREE.Vector3(upperArm, upperY, 0), PYLON_BEAM * 1.2));
  bars.push(beamGeometry(new THREE.Vector3(-lowerArm, lowerY, 0), new THREE.Vector3(lowerArm, lowerY, 0), PYLON_BEAM * 1.2));
  const lattice = mergeGeometries(bars);
  for (const b of bars) b.dispose();
  if (!lattice) throw new Error("pylon geometry could not be merged");
  g.add(solid(lattice, P.steel));
  g.add(at(solid(new THREE.ConeGeometry(0.12, 0.3, 6), P.steel), 0, PYLON_HEIGHT + 0.1, 0));

  const upperTips = [addInsulator(g, -upperArm, upperY), addInsulator(g, upperArm, upperY)];
  const lowerTips = [addInsulator(g, -lowerArm, lowerY), addInsulator(g, lowerArm, lowerY)];
  return { group: g, upperTips, lowerTips };
}

/** Adds the transformer and the pylon to the scene at their fixed places. */
export function createSubstation(scene: THREE.Scene): Substation {
  const transformer = makeTransformer();
  transformer.group.position.set(TRANSFORMER_POS.x, GROUND_Y, TRANSFORMER_POS.z);
  transformer.group.rotation.y = TRANSFORMER_POS.rotY;
  scene.add(transformer.group);

  const pylon = makePylon();
  pylon.group.position.set(PYLON_POS.x, GROUND_Y, PYLON_POS.z);
  pylon.group.rotation.y = PYLON_POS.rotY;
  scene.add(pylon.group);

  return {
    bushingTops: transformer.bushingTops.map((p) => worldPoint(transformer.group, p)),
    upperTips: pylon.upperTips.map((p) => worldPoint(pylon.group, p)),
    lowerTips: pylon.lowerTips.map((p) => worldPoint(pylon.group, p)),
  };
}
