import * as THREE from "three";
import { PALETTE as P } from "../palette";
import { at, makeMast, placeMatrix, roundedBox, solid } from "../parts";
import { createWindowBatch } from "../windows";
import type { WindowSpec } from "../windows";
import { liftPoint, liftWindows } from "./common";
import type { SceneActor } from "./common";

interface HouseSpec {
  width: number;
  depth: number;
  height: number;
  roof: string;
}

const SMALL: HouseSpec = { width: 1.2, depth: 1.1, height: 1.0, roof: P.roofSage };
const MEDIUM: HouseSpec = { width: 1.3, depth: 1.2, height: 1.05, roof: P.roofClay };
const LARGE: HouseSpec = { width: 1.5, depth: 1.3, height: 1.15, roof: P.roofSlate };
const HOUSES: readonly HouseSpec[] = [LARGE, MEDIUM, SMALL];

/** House positions inside a district (x, z). */
const OFFSETS: readonly (readonly [number, number])[] = [
  [-0.9, -0.5],
  [0.8, -0.7],
  [0.1, 0.9],
];

const WINDOW_SIZE = 0.3;

interface BuiltHouse {
  group: THREE.Group;
  windows: WindowSpec[];
  attach: THREE.Vector3;
}

function buildHouse(spec: HouseSpec): BuiltHouse {
  const { width, depth, height } = spec;
  const g = new THREE.Group();
  g.add(at(roundedBox(width, height, depth, P.wall), 0, height / 2, 0));

  // Gable roof: a triangular prism (3-sided cylinder), ridge along x.
  const rise = Math.min(width, depth) * 0.45;
  const overhang = 0.3;
  const roofGeo = new THREE.CylinderGeometry(1, 1, 1, 3);
  roofGeo.rotateX(-Math.PI / 2);
  roofGeo.translate(0, 0.5, 0);
  roofGeo.scale((depth + overhang) / Math.sqrt(3), rise / 1.5, width + overhang);
  const roof = solid(roofGeo, spec.roof);
  roof.rotation.y = Math.PI / 2;
  roof.position.y = height;
  g.add(roof);

  // Door and step on the front (+z).
  const doorH = Math.min(0.8, height * 0.6);
  g.add(at(solid(new THREE.BoxGeometry(0.3, doorH, 0.06), P.dark), 0, doorH / 2, depth / 2 + 0.03));
  g.add(at(solid(new THREE.BoxGeometry(0.5, 0.06, 0.26), P.slab), 0, 0.03, depth / 2 + 0.13));

  const winY = height * 0.58;
  const side = placeMatrix(width / 2, winY, 0, Math.PI / 2);
  const windows: WindowSpec[] = [
    { matrix: placeMatrix(-width * 0.3, winY, depth / 2, 0), w: WINDOW_SIZE, h: WINDOW_SIZE },
    { matrix: placeMatrix(width * 0.3, winY, depth / 2, 0), w: WINDOW_SIZE, h: WINDOW_SIZE },
    { matrix: side, w: WINDOW_SIZE, h: WINDOW_SIZE },
  ];

  // Service mast on the ridge: the power line attaches here.
  const mast = makeMast(0.5);
  mast.group.position.set(width * 0.35, height + rise, 0);
  g.add(mast.group);
  return { group: g, windows, attach: mast.top.clone().add(mast.group.position) };
}

/** A city district: three houses sharing one window batch. The first house's mast is the line attach. */
export function makeDistrict(index: number): SceneActor {
  const g = new THREE.Group();
  const windows: WindowSpec[] = [];
  let attach = new THREE.Vector3();
  OFFSETS.forEach((offset, h) => {
    const house = buildHouse(HOUSES[(h + index) % HOUSES.length] ?? SMALL);
    house.group.position.set(offset[0], 0, offset[1]);
    house.group.rotation.y = (((index * 3 + h) * 0.37) % 0.9) - 0.45;
    g.add(house.group);
    windows.push(...liftWindows(house.group, house.windows));
    if (h === 0) attach = liftPoint(house.group, house.attach);
  });
  const batch = createWindowBatch(windows);
  g.add(batch.group);
  return { group: g, attach, windows: batch };
}
