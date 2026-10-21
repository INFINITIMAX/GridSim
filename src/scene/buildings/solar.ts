import * as THREE from "three";
import type { UnitView } from "../../game";
import { PALETTE as P } from "../palette";
import { at, flat, solid } from "../parts";
import { createWindowBatch } from "../windows";
import { liftPoint, liftWindows, makeCabin } from "./common";
import type { UnitActor } from "./common";

const COLUMNS = 3;
const ROWS = 2;
const PANEL_TILT = -0.45;

/** Solar field: a slab with a 3 x 2 grid of tilted panels (one instanced mesh) and an inverter cabin. */
export function makeSolarField(): UnitActor {
  const g = new THREE.Group();
  g.add(at(solid(new THREE.BoxGeometry(1.9, 0.06, 1.45), P.slab), 0, 0.03, 0));

  const panels = new THREE.InstancedMesh(new THREE.BoxGeometry(0.52, 0.04, 0.46), flat(P.roofSlate), COLUMNS * ROWS);
  panels.castShadow = true;
  panels.receiveShadow = true;
  const dummy = new THREE.Object3D();
  dummy.rotation.x = PANEL_TILT;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLUMNS; c++) {
      dummy.position.set((c - 1) * 0.58, 0.32, (r - 0.5) * 0.62 - 0.1);
      dummy.updateMatrix();
      panels.setMatrixAt(r * COLUMNS + c, dummy.matrix);
    }
  }
  g.add(panels);

  const cabin = makeCabin(0.4, 0.4, 0.3);
  cabin.group.position.set(0.55, 0.06, 0.52);
  g.add(cabin.group);
  const windows = createWindowBatch(liftWindows(cabin.group, cabin.windows));
  g.add(windows.group);

  return {
    group: g,
    attach: liftPoint(cabin.group, cabin.attach),
    windows,
    update(view: UnitView): void {
      windows.setLit(view.online);
    },
  };
}
