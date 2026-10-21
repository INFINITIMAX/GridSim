import * as THREE from "three";
import type { UnitView } from "../../game";
import { PALETTE as P } from "../palette";
import { at, makeMast, placeMatrix, roundedBox, solid } from "../parts";
import { createWindowBatch } from "../windows";
import type { WindowSpec } from "../windows";
import type { UnitActor } from "./common";

const CONTAINER = { w: 0.7, h: 0.5, d: 0.45 };

/** Battery park: four containers (2 x 2) with a status window each on the front row, plus a line mast. */
export function makeBattery(): UnitActor {
  const g = new THREE.Group();
  g.add(at(solid(new THREE.BoxGeometry(1.6, 0.06, 1.1), P.slab), 0, 0.03, 0));

  const specs: WindowSpec[] = [];
  for (const row of [-1, 1]) {
    for (const col of [-1, 1]) {
      const x = col * (CONTAINER.w / 2 + 0.02);
      const z = row * (CONTAINER.d / 2 + 0.02);
      g.add(at(roundedBox(CONTAINER.w, CONTAINER.h, CONTAINER.d, P.metal, 0.04), x, 0.06 + CONTAINER.h / 2, z));
      g.add(at(solid(new THREE.BoxGeometry(0.3, 0.1, 0.25), P.steel), x, 0.06 + CONTAINER.h + 0.05, z));
      if (row === 1) {
        specs.push({ matrix: placeMatrix(x, 0.34, z + CONTAINER.d / 2, 0), w: 0.16, h: 0.1 });
      }
    }
  }
  const windows = createWindowBatch(specs);
  g.add(windows.group);

  const mast = makeMast(0.9);
  mast.group.position.set(0.85, 0.06, 0);
  g.add(mast.group);

  return {
    group: g,
    attach: mast.top.clone().add(mast.group.position),
    windows,
    update(view: UnitView): void {
      windows.setLit(view.online);
    },
  };
}
