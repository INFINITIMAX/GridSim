import * as THREE from "three";
import type { UnitView } from "../../game";
import { PALETTE as P } from "../palette";
import { at, makeMast, placeMatrix, roundedBox, solid } from "../parts";
import type { WindowBatch, WindowSpec } from "../windows";

export interface SceneActor {
  readonly group: THREE.Group;
  /** Where the power line attaches, in the group's local space. */
  readonly attach: THREE.Vector3;
  readonly windows: WindowBatch;
}

export interface UnitActor extends SceneActor {
  update(view: UnitView, dt: number, motion: boolean): void;
}

/** Window specs of a child group, expressed in the parent's space. Call after positioning the child. */
export function liftWindows(child: THREE.Object3D, specs: readonly WindowSpec[]): WindowSpec[] {
  child.updateMatrix();
  return specs.map((s) => ({ matrix: child.matrix.clone().multiply(s.matrix), w: s.w, h: s.h }));
}

/** Point of a child group, expressed in the parent's space. Call after positioning the child. */
export function liftPoint(child: THREE.Object3D, p: THREE.Vector3): THREE.Vector3 {
  child.updateMatrix();
  return p.clone().applyMatrix4(child.matrix);
}

/** Small service cabin with a flat roof, front windows and a line mast on the roof. */
export function makeCabin(w: number, h: number, d: number): { group: THREE.Group; windows: WindowSpec[]; attach: THREE.Vector3 } {
  const g = new THREE.Group();
  g.add(at(roundedBox(w, h, d, P.wall), 0, h / 2, 0));
  g.add(at(solid(new THREE.BoxGeometry(w + 0.1, 0.06, d + 0.1), P.slab), 0, h + 0.03, 0));
  const mast = makeMast(0.45);
  mast.group.position.set(w * 0.38, h + 0.06, 0);
  g.add(mast.group);
  const xs = w >= 0.9 ? [-w * 0.25, w * 0.1] : [-w * 0.15];
  const size = Math.min(0.25, w * 0.4);
  const windows = xs.map((x) => ({ matrix: placeMatrix(x, h * 0.55, d / 2, 0), w: size, h: Math.min(0.22, h * 0.4) }));
  return { group: g, windows, attach: mast.top.clone().add(mast.group.position) };
}
