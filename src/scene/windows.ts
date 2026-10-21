import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE as P } from "./palette";
import { flat, litGlass } from "./parts";

export interface WindowSpec {
  /** Position and orientation of the window (local to the group that receives the batch). */
  matrix: THREE.Matrix4;
  w: number;
  h: number;
}

export interface WindowBatch {
  readonly group: THREE.Group;
  readonly count: number;
  readonly lit: boolean;
  setLit(lit: boolean): void;
}

const FRAME_MARGIN = 0.08;

/**
 * All windows of one building (or district) as instanced meshes: frame, mullions, and two glass
 * layers (lit and off). Lighting the batch only toggles which glass layer is visible.
 */
export function createWindowBatch(specs: readonly WindowSpec[]): WindowBatch {
  const n = specs.length;

  const frameGeo = new THREE.BoxGeometry(1, 1, 0.05);
  frameGeo.translate(0, 0, 0.025);
  const glassGeo = new THREE.BoxGeometry(1, 1, 0.04);
  glassGeo.translate(0, 0, 0.05);
  const bars = [new THREE.BoxGeometry(1, 0.07, 0.04), new THREE.BoxGeometry(0.07, 1, 0.04)];
  const crossGeo = mergeGeometries(bars);
  for (const b of bars) b.dispose();
  if (!crossGeo) throw new Error("window mullion geometry could not be merged");
  crossGeo.translate(0, 0, 0.075);

  const frame = new THREE.InstancedMesh(frameGeo, flat(P.trim), n);
  const glassOn = new THREE.InstancedMesh(glassGeo, litGlass, n);
  const glassOff = new THREE.InstancedMesh(glassGeo.clone(), flat(P.glassOff), n);
  const cross = new THREE.InstancedMesh(crossGeo, flat(P.trim), n);

  const scale = new THREE.Matrix4();
  const m = new THREE.Matrix4();
  specs.forEach((s, i) => {
    frame.setMatrixAt(i, m.multiplyMatrices(s.matrix, scale.makeScale(s.w + FRAME_MARGIN, s.h + FRAME_MARGIN, 1)));
    m.multiplyMatrices(s.matrix, scale.makeScale(s.w, s.h, 1));
    glassOn.setMatrixAt(i, m);
    glassOff.setMatrixAt(i, m);
    cross.setMatrixAt(i, m);
  });

  const group = new THREE.Group();
  for (const mesh of [frame, glassOn, glassOff, cross]) {
    mesh.frustumCulled = false;
    group.add(mesh);
  }

  let lit = false;
  const apply = (value: boolean): void => {
    lit = value;
    glassOn.visible = value;
    glassOff.visible = !value;
  };
  apply(false);

  return {
    group,
    count: n,
    get lit(): boolean {
      return lit;
    },
    setLit: apply,
  };
}
