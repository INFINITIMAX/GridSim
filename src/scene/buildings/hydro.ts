import * as THREE from "three";
import type { UnitView } from "../../game";
import { PALETTE as P } from "../palette";
import { at, flat, roundedBox, solid } from "../parts";
import { createWindowBatch } from "../windows";
import { liftPoint, liftWindows, makeCabin } from "./common";
import type { UnitActor } from "./common";

const LAKE_Z = -1.35;
const LAKE_BASE_Y = 0.55;

/** Dam with a lake behind it (toward -z), a spillway and a small powerhouse in front. */
export function makeHydro(): UnitActor {
  const g = new THREE.Group();

  // Embankment and lake.
  g.add(at(solid(new THREE.CylinderGeometry(1.35, 1.5, LAKE_BASE_Y, 16), P.sand), 0, LAKE_BASE_Y / 2, LAKE_Z));
  const lake = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.08, 16), flat(P.water));
  lake.position.set(0, LAKE_BASE_Y + 0.04, LAKE_Z);
  lake.receiveShadow = true;
  g.add(lake);

  // Dam wall with a cap and two abutments.
  g.add(at(roundedBox(2.5, 1.0, 0.45, P.wall, 0.05), 0, 0.5, 0));
  g.add(at(solid(new THREE.BoxGeometry(2.6, 0.08, 0.55), P.slab), 0, 1.04, 0));
  for (const side of [-1, 1]) {
    g.add(at(solid(new THREE.BoxGeometry(0.35, 1.15, 0.9), P.trim), side * 1.3, 0.575, -0.1));
  }

  // Spillway: water runs down the front only while the plant is online.
  const spillway = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 1.3), flat(P.water));
  spillway.position.set(0.5, 0.5, 0.65);
  spillway.rotation.x = Math.PI / 4;
  g.add(spillway);

  // Powerhouse and penstock.
  const cabin = makeCabin(1.1, 0.8, 0.8);
  cabin.group.position.set(-0.7, 0, 1.0);
  g.add(cabin.group);
  const pipe = solid(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), P.steel);
  pipe.rotation.x = Math.PI / 2;
  g.add(at(pipe, -0.7, 0.45, 0.45));
  const windows = createWindowBatch(liftWindows(cabin.group, cabin.windows));
  g.add(windows.group);

  return {
    group: g,
    attach: liftPoint(cabin.group, cabin.attach),
    windows,
    update(view: UnitView): void {
      windows.setLit(view.online);
      spillway.visible = view.online;
    },
  };
}
