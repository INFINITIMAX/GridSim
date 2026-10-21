import * as THREE from "three";
import type { UnitView } from "../../game";
import { PALETTE as P } from "../palette";
import { at, roundedBox, solid } from "../parts";
import { createWindowBatch } from "../windows";
import { liftPoint, liftWindows, makeCabin } from "./common";
import type { UnitActor } from "./common";

const TOWER_H = 5.2;
const MAX_ROTOR_SPEED = 2.2; // rad/s at full output

/** Turbine from the spike, with a small base cabin. The rotor speed follows p / pMax. */
export function makeWindTurbine(): UnitActor {
  const g = new THREE.Group();
  g.add(at(solid(new THREE.CylinderGeometry(0.5, 0.6, 0.2, 12), P.slab), 0, 0.1, 0));
  g.add(at(solid(new THREE.CylinderGeometry(0.1, 0.2, TOWER_H, 10), P.wall), 0, TOWER_H / 2 + 0.2, 0));
  const hubY = TOWER_H + 0.4;
  g.add(at(roundedBox(0.3, 0.3, 0.9, P.trim, 0.08), 0, hubY, 0));

  const rotor = new THREE.Group();
  rotor.position.set(0, hubY, 0.55);
  const hub = solid(new THREE.ConeGeometry(0.16, 0.3, 8), P.steel);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.08;
  rotor.add(hub);
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (i * 2 * Math.PI) / 3;
    const blade = solid(new THREE.BoxGeometry(0.16, 2.3, 0.04), P.wall);
    blade.position.y = 1.3;
    const tip = solid(new THREE.BoxGeometry(0.1, 0.5, 0.045), P.roofSlate);
    tip.position.y = 2.2;
    pivot.add(blade, tip);
    rotor.add(pivot);
  }
  g.add(rotor);

  const cabin = makeCabin(0.55, 0.45, 0.4);
  cabin.group.position.set(0.95, 0, 0.3);
  g.add(cabin.group);
  const windows = createWindowBatch(liftWindows(cabin.group, cabin.windows));
  g.add(windows.group);

  return {
    group: g,
    attach: liftPoint(cabin.group, cabin.attach),
    windows,
    update(view: UnitView, dt: number, motion: boolean): void {
      windows.setLit(view.online);
      if (motion && view.online && view.pMax > 0) {
        const load = Math.min(1, Math.max(0, view.p / view.pMax));
        rotor.rotation.z -= dt * MAX_ROTOR_SPEED * load;
      }
    },
  };
}
