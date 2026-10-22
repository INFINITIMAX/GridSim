// Drawing helpers (ink outline, edges, parts), ported from docs/learn/pelton/frame/hydro-frame.html.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

export const INK = 0x1c2531;
export const ACCENT = 0xe0442e;
const GLOW = 0x9a3a28;

export const C = {
  steel: 0x6f86a0, steelD: 0x52667d, shaft: 0xb9c0c8, gen: 0x3c63a8, concrete: 0xc9cdd1, water: 0x8fcff0,
  bucket: 0xd6dbe0, pipe: 0x56606b, white: 0xf3f4f1, red: 0xd9442f, lcd: 0xb3d3a2, base: 0x8a96a3,
  terrain: 0xc3cab9, sand: 0xd8c08a,
};

/** What a lesson scene gives to the page. */
export interface LessonScene {
  group: THREE.Group;
  anchors: Record<string, THREE.Vector3>;
  target: THREE.Vector3;
  /** Approximate size of the diorama on screen, in world units, at the default camera. */
  extent: { w: number; h: number };
  highlight(partId: string | null): void;
  /** Advances animations. Returns true when the frame must be redrawn. */
  update(dt: number): boolean;
}

const lineMats = new Set<LineMaterial>();
const style = { thickMul: 1 };

/** Runs `fn` with the outline thickness multiplied (for parts built at a different scale). */
export function withThickMul<T>(mul: number, fn: () => T): T {
  const prev = style.thickMul;
  style.thickMul = mul;
  try {
    return fn();
  } finally {
    style.thickMul = prev;
  }
}

export function setLineResolution(w: number, h: number): void {
  for (const m of lineMats) m.resolution.set(w, h);
}

function hullMat(t: number): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.thick = { value: t };
    sh.vertexShader =
      "uniform float thick;\n" +
      sh.vertexShader.replace("#include <begin_vertex>", "vec3 transformed = position + normalize(normal) * thick;");
  };
  return m;
}

function lineMat(w: number): LineMaterial {
  const m = new LineMaterial({ color: INK, linewidth: w });
  lineMats.add(m);
  return m;
}

export interface PartOpts {
  edges?: boolean;
  hull?: boolean;
  angle?: number;
  map?: THREE.Texture | null;
  thick?: number;
  lw?: number;
  emissive?: number;
  opacity?: number;
}

export function part(geom: THREE.BufferGeometry, color: number, o: PartOpts = {}): THREE.Group {
  const { edges = true, hull = true, angle = 30, map = null, thick = 0.016, lw = 1.3, emissive = 0, opacity = 1 } = o;
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color, map, emissive, transparent: opacity < 1, opacity });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = opacity === 1;
  mesh.receiveShadow = true;
  g.add(mesh);
  if (hull) {
    let hg = geom.clone();
    for (const k of Object.keys(hg.attributes)) if (k !== "position") hg.deleteAttribute(k);
    hg = mergeVertices(hg, 1e-4);
    hg.computeVertexNormals();
    g.add(new THREE.Mesh(hg, hullMat(thick * style.thickMul)));
  }
  if (edges) {
    const eg = new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geom, angle));
    g.add(new LineSegments2(eg, lineMat(lw)));
  }
  return g;
}

export function at<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number, ry = 0): T {
  obj.position.set(x, y, z);
  obj.rotation.y = ry;
  return obj;
}

export const box = (w: number, h: number, d: number, c: number, o?: PartOpts) =>
  part(new THREE.BoxGeometry(w, h, d), c, o);
export const rbox = (w: number, h: number, d: number, r: number, c: number, o?: PartOpts) =>
  part(new RoundedBoxGeometry(w, h, d, 3, r), c, o);
export const cyl = (r: number, h: number, c: number, seg = 28, o?: PartOpts) =>
  part(new THREE.CylinderGeometry(r, r, h, seg), c, o);
/** Cylinder lying along x. */
export const xcyl = (r: number, h: number, c: number, seg = 32, o?: PartOpts) =>
  part(new THREE.CylinderGeometry(r, r, h, seg).rotateZ(Math.PI / 2), c, o);
/** Cylinder (or cone) lying along z. */
export const zcyl = (r1: number, r2: number, h: number, c: number, seg = 32, o?: PartOpts) =>
  part(new THREE.CylinderGeometry(r1, r2, h, seg).rotateX(Math.PI / 2), c, o);

export function textTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (ctx) draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function decal(w: number, h: number, tex: THREE.Texture, rotX = -Math.PI / 2): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex, transparent: true }));
  m.rotation.x = rotX;
  return m;
}

export type Pt = [number, number, number];

export function tube(points: Pt[], color: number, r: number, o: PartOpts = {}): THREE.Group {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return part(new THREE.TubeGeometry(curve, 120, r, 24), color, { edges: false, thick: 0.014, ...o });
}

/** Segments drawn on top of the scene (dimension lines). `flat` holds pairs of points: x1 y1 z1 x2 y2 z2 ... */
export function overlayLines(flat: number[], color: number, lw: number, dashed = false): LineSegments2 {
  const g = new LineSegmentsGeometry();
  g.setPositions(flat);
  const m = new LineMaterial({ color, linewidth: lw, dashed, dashSize: 0.12, gapSize: 0.1 });
  m.depthTest = false;
  lineMats.add(m);
  const l = new LineSegments2(g, m);
  if (dashed) l.computeLineDistances();
  l.renderOrder = 10;
  return l;
}

export function labelSprite(text: string, color: string, size: number): THREE.Sprite {
  const tex = textTex(128, 128, (x, w, h) => {
    x.fillStyle = color;
    x.font = '700 96px "Barlow Semi Condensed"';
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, w / 2, h / 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(size, size, 1);
  s.renderOrder = 11;
  return s;
}

export function addLights(scene: THREE.Scene, span = 9): void {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xaeb8c2, 2.2));
  const d = new THREE.DirectionalLight(0xffffff, 1.6);
  d.position.set(-3, 10, 5);
  d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048);
  d.shadow.radius = 6;
  Object.assign(d.shadow.camera, { left: -span, right: span, top: span, bottom: -span });
  d.shadow.camera.updateProjectionMatrix();
  scene.add(d);
}

export function shadowGround(y: number): THREE.Mesh {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.13 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = y;
  ground.receiveShadow = true;
  return ground;
}

/** Lights a part up (or restores it). Works on every Lambert material under `obj`. */
export function setGlow(obj: THREE.Object3D, on: boolean): void {
  obj.traverse((o) => {
    const mat = (o as THREE.Mesh).material;
    if (mat instanceof THREE.MeshLambertMaterial) {
      if (mat.userData.baseEmissive === undefined) mat.userData.baseEmissive = mat.emissive.getHex();
      mat.emissive.setHex(on ? GLOW : (mat.userData.baseEmissive as number));
    }
  });
}

/** Frees geometries, materials and textures under `obj`. */
export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      if (mat instanceof LineMaterial) lineMats.delete(mat);
      (mat as THREE.MeshLambertMaterial).map?.dispose();
      mat.dispose();
    }
  });
}
