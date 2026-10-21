import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PALETTE as P } from "./palette";

/** Top of the grass layer: everything on the island stands at this height. */
export const GROUND_Y = 0.25;

const MAX_DESATURATION = 0.8;
const UP = new THREE.Vector3(0, 1, 0);
const ONE = new THREE.Vector3(1, 1, 1);

interface TintEntry {
  target: THREE.Color;
  source: THREE.Color;
}

const tintEntries: TintEntry[] = [];
const flatCache = new Map<string, THREE.MeshStandardMaterial>();
const hsl = { h: 0, s: 0, l: 0 };

/** Writes `source` with its saturation reduced by `amount` (0..1) into `target`. */
export function desaturate(target: THREE.Color, source: THREE.Color, amount: number): THREE.Color {
  source.getHSL(hsl);
  return target.setHSL(hsl.h, hsl.s * (1 - MAX_DESATURATION * amount), hsl.l);
}

/** Shared flat-shaded material, one per palette color. Registered for blackout desaturation. */
export function flat(color: string): THREE.MeshStandardMaterial {
  let m = flatCache.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0 });
    flatCache.set(color, m);
    tintEntries.push({ target: m.color, source: m.color.clone() });
  }
  return m;
}

/** Applies the blackout desaturation (0 = normal, 1 = fully desaturated) to every shared material. */
export function setDesaturation(amount: number): void {
  for (const e of tintEntries) {
    desaturate(e.target, e.source, amount);
  }
}

export const litGlass = new THREE.MeshStandardMaterial({
  color: P.electric,
  emissive: P.electric,
  emissiveIntensity: 0.85,
  roughness: 0.5,
});

export const lineLive = new THREE.MeshStandardMaterial({
  color: P.electric,
  emissive: P.electric,
  emissiveIntensity: 0.6,
  roughness: 0.6,
});

export const steamMaterial = new THREE.MeshStandardMaterial({
  color: P.foam,
  flatShading: true,
  roughness: 1,
  transparent: true,
  opacity: 0.6,
  depthWrite: false,
});

/** Frees the GPU resources of the shared materials (they are re-uploaded if used again). */
export function disposeShared(): void {
  for (const m of flatCache.values()) m.dispose();
  litGlass.dispose();
  lineLive.dispose();
  steamMaterial.dispose();
}

/** Disposes the geometries under `root`. Materials are shared and are not touched. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) {
      o.dispose();
      o.geometry.dispose();
    } else if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
    }
  });
}

export function solid(geometry: THREE.BufferGeometry, color: string): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, flat(color));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function roundedBox(w: number, h: number, d: number, color: string, radius = 0.06): THREE.Mesh {
  return solid(new RoundedBoxGeometry(w, h, d, 2, radius), color);
}

export function at<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number): T {
  obj.position.set(x, y, z);
  return obj;
}

/** Thin square bar between two points, as a geometry (merged by the caller). */
export function beamGeometry(a: THREE.Vector3, b: THREE.Vector3, thickness: number): THREE.BufferGeometry {
  const dir = b.clone().sub(a);
  const geo = new THREE.BoxGeometry(thickness, dir.length(), thickness);
  const position = a.clone().add(b).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  geo.applyMatrix4(new THREE.Matrix4().compose(position, quaternion, ONE));
  return geo;
}

/** Matrix for a point at (x, y, z) rotated around the vertical axis. */
export function placeMatrix(x: number, y: number, z: number, rotY: number): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromAxisAngle(UP, rotY);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, ONE);
}

/** Point `local` of `obj` in world space. */
export function worldPoint(obj: THREE.Object3D, local: THREE.Vector3): THREE.Vector3 {
  obj.updateMatrixWorld(true);
  return obj.localToWorld(local.clone());
}

/** Pole with an insulator on top, where a power line attaches. `top` is in the group's local space. */
export function makeMast(height: number): { group: THREE.Group; top: THREE.Vector3 } {
  const g = new THREE.Group();
  g.add(at(solid(new THREE.CylinderGeometry(0.03, 0.03, height, 6), P.steel), 0, height / 2, 0));
  g.add(at(solid(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 8), P.insulator), 0, height + 0.03, 0));
  return { group: g, top: new THREE.Vector3(0, height + 0.1, 0) };
}
