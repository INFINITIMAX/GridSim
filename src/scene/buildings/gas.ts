import * as THREE from "three";
import type { UnitView } from "../../game";
import { PALETTE as P } from "../palette";
import { at, makeMast, placeMatrix, roundedBox, solid, steamMaterial } from "../parts";
import { createWindowBatch } from "../windows";
import type { UnitActor } from "./common";

const HALL = { w: 3.4, h: 1.8, d: 2.2 };
const STACK_X = 1.0;
const STACK_Z = -0.5;
const STACK_H = 4.4;
const STACK_TOP = HALL.h + STACK_H + 0.1;
const PUFFS = 6;
const STEAM_RISE = 1.9;
const STEAM_RATE = 0.45; // full rise cycles per second
const MIN_STEAM_LEVEL = 0.35;

const dummy = new THREE.Object3D();

/** Gas plant from the spike: hall, stack, tank, steam. `scale` 1 = CCGT, smaller = OCGT. */
export function makeGasPlant(scale: number): UnitActor {
  const g = new THREE.Group();
  g.add(at(roundedBox(HALL.w, HALL.h, HALL.d, P.wall), 0, HALL.h / 2, 0));
  g.add(at(solid(new THREE.BoxGeometry(HALL.w + 0.15, 0.1, HALL.d + 0.15), P.slab), 0, HALL.h + 0.05, 0));
  for (let i = 0; i < 3; i++) {
    g.add(at(solid(new THREE.BoxGeometry(0.4, 0.22, 0.4), P.steel), -1.0 + i * 0.7, HALL.h + 0.21, 0.35));
  }

  // Lower annex on the west side.
  g.add(at(roundedBox(1.4, 1.1, 1.6, P.trim), -HALL.w / 2 - 0.55, 0.55, 0));
  g.add(at(solid(new THREE.BoxGeometry(1.5, 0.08, 1.7), P.roofSlate), -HALL.w / 2 - 0.55, 1.14, 0));

  // Tall front windows and a roller door.
  const frontZ = HALL.d / 2;
  const windows = createWindowBatch(
    [-1.1, -0.5, 0.1].map((x) => ({ matrix: placeMatrix(x, 1.0, frontZ, 0), w: 0.3, h: 0.8 })),
  );
  g.add(windows.group);
  g.add(at(solid(new THREE.BoxGeometry(0.9, 1.1, 0.06), P.dark), 1.1, 0.55, frontZ + 0.03));

  // Stack with two bands and a rim.
  g.add(at(solid(new THREE.CylinderGeometry(0.22, 0.32, STACK_H, 10), P.wall), STACK_X, HALL.h + STACK_H / 2, STACK_Z));
  g.add(at(solid(new THREE.CylinderGeometry(0.235, 0.255, 0.4, 10), P.roofClay), STACK_X, HALL.h + STACK_H - 0.9, STACK_Z));
  g.add(at(solid(new THREE.CylinderGeometry(0.265, 0.285, 0.4, 10), P.roofClay), STACK_X, HALL.h + STACK_H - 1.8, STACK_Z));
  g.add(at(solid(new THREE.CylinderGeometry(0.27, 0.22, 0.12, 10), P.dark), STACK_X, HALL.h + STACK_H + 0.04, STACK_Z));

  // Horizontal gas tank on two saddles, piped into the hall.
  const tankX = -0.6;
  const tankZ = 1.75;
  const tank = solid(new THREE.CylinderGeometry(0.5, 0.5, 1.6, 12), P.metal);
  tank.rotation.z = Math.PI / 2;
  g.add(at(tank, tankX, 0.62, tankZ));
  g.add(at(solid(new THREE.BoxGeometry(0.12, 0.22, 0.8), P.slab), tankX - 0.5, 0.11, tankZ));
  g.add(at(solid(new THREE.BoxGeometry(0.12, 0.22, 0.8), P.slab), tankX + 0.5, 0.11, tankZ));
  const pipe = solid(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), P.steel);
  pipe.rotation.x = Math.PI / 2;
  g.add(at(pipe, tankX, 0.62, frontZ + 0.3));

  // Line mast on the roof.
  const mast = makeMast(0.5);
  mast.group.position.set(-1.3, HALL.h + 0.1, -0.4);
  g.add(mast.group);

  // Steam: a few puffs that rise from the stack and grow.
  const steam = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), steamMaterial, PUFFS);
  steam.frustumCulled = false;
  g.add(steam);

  g.scale.setScalar(scale);
  let phase = 0;

  return {
    group: g,
    attach: mast.top.clone().add(mast.group.position),
    windows,
    update(view: UnitView, dt: number, motion: boolean): void {
      windows.setLit(view.online);
      if (view.online && motion) {
        phase = (phase + dt * STEAM_RATE) % 1;
      }
      const load = view.pMax > 0 ? Math.min(1, Math.max(0, view.p / view.pMax)) : 0;
      const level = view.online ? MIN_STEAM_LEVEL + (1 - MIN_STEAM_LEVEL) * load : 0;
      for (let i = 0; i < PUFFS; i++) {
        const t = (phase + i / PUFFS) % 1;
        dummy.position.set(STACK_X + t * 0.5, STACK_TOP + t * STEAM_RISE, STACK_Z);
        dummy.scale.setScalar(level * (0.14 + 0.34 * t));
        dummy.updateMatrix();
        steam.setMatrixAt(i, dummy.matrix);
      }
      steam.instanceMatrix.needsUpdate = true;
    },
  };
}
