import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PALETTE as P } from "./palette";

// ---- Dimensions (world units, roughly meters at toy scale) ----
const ISLAND_SAND_TOP_RADIUS = 9.0;
const ISLAND_SAND_BOTTOM_RADIUS = 9.5;
const ISLAND_SAND_HEIGHT = 1.4;
const ISLAND_GRASS_TOP_RADIUS = 8.5;
const ISLAND_GRASS_BOTTOM_RADIUS = 8.7;
const GRASS_HEIGHT = 0.25;
const GROUND_Y = GRASS_HEIGHT;
const WATER_Y = -0.85;
const WATER_SIZE = 160;
const FOAM_INNER_RADIUS = 9.2;
const FOAM_OUTER_RADIUS = 9.8;
const ROCK_COUNT = 9;
const ROCK_RING_RADIUS = 9.3;

const PYLON_HEIGHT = 6.2;
const PYLON_BASE_HALF = 0.75;
const PYLON_TOP_HALF = 0.22;
const PYLON_LEVELS = [0.25, 2.1, 3.9, 5.5] as const;
const PYLON_BEAM = 0.05;
const LINE_RADIUS = 0.035;
const LINE_SAG_RATIO = 0.06;

const ROTOR_SPEED = 0.9; // rad/s
const UP = new THREE.Vector3(0, 1, 0);
const WATER_COLOR_A = new THREE.Color(P.water);
const WATER_COLOR_B = new THREE.Color(P.waterDeep);

// ---- Materials and mesh helpers ----
const flatCache = new Map<string, THREE.MeshStandardMaterial>();

function flat(color: string): THREE.MeshStandardMaterial {
  let m = flatCache.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0 });
    flatCache.set(color, m);
  }
  return m;
}

const litGlass = new THREE.MeshStandardMaterial({
  color: P.electric,
  emissive: P.electric,
  emissiveIntensity: 0.85,
  roughness: 0.5,
});
const lineMaterial = new THREE.MeshStandardMaterial({
  color: P.electric,
  emissive: P.electric,
  emissiveIntensity: 0.6,
  roughness: 0.6,
});

function solid(geometry: THREE.BufferGeometry, color: string): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, flat(color));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function roundedBox(w: number, h: number, d: number, color: string, radius = 0.06): THREE.Mesh {
  return solid(new RoundedBoxGeometry(w, h, d, 2, radius), color);
}

function at<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number): T {
  obj.position.set(x, y, z);
  return obj;
}

/** Thin square bar between two points (lattice members). */
function beam(a: THREE.Vector3, b: THREE.Vector3, thickness: number, color: string): THREE.Mesh {
  const dir = b.clone().sub(a);
  const mesh = solid(new THREE.BoxGeometry(thickness, dir.length(), thickness), color);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  return mesh;
}

// ---- Parts ----
function makeWindow(w: number, h: number, lit: boolean): THREE.Group {
  const g = new THREE.Group();
  g.add(at(solid(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.05), P.trim), 0, 0, 0.025));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), lit ? litGlass : flat(P.glassOff));
  glass.position.z = 0.05;
  g.add(glass);
  g.add(at(solid(new THREE.BoxGeometry(w, 0.025, 0.04), P.trim), 0, 0, 0.075));
  g.add(at(solid(new THREE.BoxGeometry(0.025, h, 0.04), P.trim), 0, 0, 0.075));
  return g;
}

interface Built {
  group: THREE.Group;
  /** Local-space point where a power line attaches. */
  attach: THREE.Vector3;
}

interface HouseSpec {
  width: number;
  depth: number;
  height: number;
  roof: string;
  /** Lit state of [front-left, front-right, side] windows. */
  lit: readonly [boolean, boolean, boolean];
  chimney?: boolean;
  fence?: boolean;
}

function makeFence(length: number): THREE.Group {
  const g = new THREE.Group();
  const posts = Math.ceil(length / 0.4) + 1;
  const step = length / (posts - 1);
  for (let i = 0; i < posts; i++) {
    g.add(at(solid(new THREE.BoxGeometry(0.06, 0.4, 0.06), P.trim), -length / 2 + i * step, 0.2, 0));
  }
  g.add(at(solid(new THREE.BoxGeometry(length, 0.04, 0.03), P.trim), 0, 0.32, 0));
  g.add(at(solid(new THREE.BoxGeometry(length, 0.04, 0.03), P.trim), 0, 0.17, 0));
  return g;
}

function makeHouse(spec: HouseSpec): Built {
  const { width, depth, height } = spec;
  const g = new THREE.Group();
  g.add(at(roundedBox(width, height, depth, P.wall), 0, height / 2, 0));

  // Gable roof: a triangular prism (3-sided cylinder), ridge along x.
  const rise = Math.min(width, depth) * 0.45;
  const overhang = 0.3;
  const roofGeo = new THREE.CylinderGeometry(1, 1, 1, 3);
  roofGeo.rotateX(-Math.PI / 2); // apex up
  roofGeo.translate(0, 0.5, 0); // base at y = 0, apex at y = 1.5
  roofGeo.scale((depth + overhang) / Math.sqrt(3), rise / 1.5, width + overhang);
  const roof = solid(roofGeo, spec.roof);
  roof.rotation.y = Math.PI / 2;
  roof.position.y = height;
  g.add(roof);

  // Door and step on the front (+z).
  const doorH = Math.min(0.8, height * 0.6);
  g.add(at(solid(new THREE.BoxGeometry(0.34, doorH, 0.06), P.dark), 0, doorH / 2, depth / 2 + 0.03));
  g.add(at(solid(new THREE.BoxGeometry(0.6, 0.06, 0.3), P.slab), 0, 0.03, depth / 2 + 0.15));
  g.add(at(solid(new THREE.SphereGeometry(0.025, 6, 4), P.metal), 0.1, doorH * 0.5, depth / 2 + 0.07));

  // Windows.
  const winSize = 0.34;
  const winY = height * 0.58;
  g.add(at(makeWindow(winSize, winSize, spec.lit[0]), -width * 0.3, winY, depth / 2));
  g.add(at(makeWindow(winSize, winSize, spec.lit[1]), width * 0.3, winY, depth / 2));
  const side = at(makeWindow(winSize, winSize, spec.lit[2]), width / 2, winY, 0);
  side.rotation.y = Math.PI / 2;
  g.add(side);

  if (spec.chimney) {
    const chimneyTop = height + rise + 0.25;
    g.add(at(solid(new THREE.BoxGeometry(0.28, chimneyTop - height, 0.28), P.slab), -width * 0.3, (height + chimneyTop) / 2, -depth * 0.2));
  }

  // Service mast on the ridge, with an insulator on top: the line attaches here.
  const mastX = width * 0.35;
  const ridgeY = height + rise;
  g.add(at(solid(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6), P.steel), mastX, ridgeY + 0.27, 0));
  g.add(at(solid(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 8), P.insulator), mastX, ridgeY + 0.58, 0));

  if (spec.fence) {
    g.add(at(makeFence(width), 0, 0, depth / 2 + 0.9));
  }
  return { group: g, attach: new THREE.Vector3(mastX, ridgeY + 0.66, 0) };
}

function makeTree(scale: number, light: boolean): THREE.Group {
  const g = new THREE.Group();
  const leaf = light ? P.leafLight : P.leafDark;
  g.add(at(solid(new THREE.CylinderGeometry(0.1, 0.14, 0.6, 6), P.trunk), 0, 0.3, 0));
  g.add(at(solid(new THREE.ConeGeometry(0.62, 1.0, 7), leaf), 0, 1.0, 0));
  g.add(at(solid(new THREE.ConeGeometry(0.46, 0.85, 7), leaf), 0, 1.6, 0));
  g.add(at(solid(new THREE.ConeGeometry(0.3, 0.7, 7), leaf), 0, 2.15, 0));
  g.scale.setScalar(scale);
  return g;
}

function makePowerPlant(): THREE.Group {
  const g = new THREE.Group();
  const hall = { w: 3.4, h: 1.8, d: 2.2 };
  g.add(at(roundedBox(hall.w, hall.h, hall.d, P.wall), 0, hall.h / 2, 0));
  g.add(at(solid(new THREE.BoxGeometry(hall.w + 0.15, 0.1, hall.d + 0.15), P.slab), 0, hall.h + 0.05, 0));
  for (let i = 0; i < 3; i++) {
    g.add(at(solid(new THREE.BoxGeometry(0.4, 0.22, 0.4), P.steel), -1.0 + i * 0.7, hall.h + 0.21, 0.35));
  }

  // Lower annex on the west side.
  g.add(at(roundedBox(1.4, 1.1, 1.6, P.trim), -hall.w / 2 - 0.55, 0.55, 0));
  g.add(at(solid(new THREE.BoxGeometry(1.5, 0.08, 1.7), P.roofSlate), -hall.w / 2 - 0.55, 1.14, 0));

  // Tall windows on the front, the middle one lit; roller door on the right.
  const frontZ = hall.d / 2;
  g.add(at(makeWindow(0.3, 0.8, false), -1.1, 1.0, frontZ));
  g.add(at(makeWindow(0.3, 0.8, true), -0.5, 1.0, frontZ));
  g.add(at(makeWindow(0.3, 0.8, false), 0.1, 1.0, frontZ));
  g.add(at(solid(new THREE.BoxGeometry(0.9, 1.1, 0.06), P.dark), 1.1, 0.55, frontZ + 0.03));

  // Stack with two bands and a rim.
  const stackX = 1.0;
  const stackZ = -0.5;
  const stackH = 4.4;
  g.add(at(solid(new THREE.CylinderGeometry(0.22, 0.32, stackH, 10), P.wall), stackX, hall.h + stackH / 2, stackZ));
  g.add(at(solid(new THREE.CylinderGeometry(0.235, 0.255, 0.4, 10), P.roofClay), stackX, hall.h + stackH - 0.9, stackZ));
  g.add(at(solid(new THREE.CylinderGeometry(0.265, 0.285, 0.4, 10), P.roofClay), stackX, hall.h + stackH - 1.8, stackZ));
  g.add(at(solid(new THREE.CylinderGeometry(0.27, 0.22, 0.12, 10), P.dark), stackX, hall.h + stackH + 0.04, stackZ));

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
  return g;
}

function makeTransformer(): Built {
  const g = new THREE.Group();
  g.add(at(solid(new THREE.BoxGeometry(1.1, 0.12, 0.9), P.slab), 0, 0.06, 0));
  g.add(at(roundedBox(0.8, 0.6, 0.6, P.steel, 0.04), 0, 0.42, 0));
  for (let i = 0; i < 4; i++) {
    g.add(at(solid(new THREE.BoxGeometry(0.05, 0.45, 0.2), P.steel), 0.45, 0.42, -0.24 + i * 0.16));
  }
  const bushingX = [-0.2, 0.2] as const;
  for (const x of bushingX) {
    g.add(at(solid(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 8), P.insulator), x, 0.87, 0));
    g.add(at(solid(new THREE.ConeGeometry(0.08, 0.1, 8), P.insulator), x, 1.07, 0));
  }
  return { group: g, attach: new THREE.Vector3(0.2, 1.14, 0) };
}

const TRANSFORMER_BUSHING_TOPS: readonly THREE.Vector3[] = [new THREE.Vector3(-0.2, 1.14, 0), new THREE.Vector3(0.2, 1.14, 0)];

interface Turbine {
  group: THREE.Group;
  rotor: THREE.Group;
}

function makeWindTurbine(): Turbine {
  const g = new THREE.Group();
  const towerH = 5.2;
  g.add(at(solid(new THREE.CylinderGeometry(0.5, 0.6, 0.2, 12), P.slab), 0, 0.1, 0));
  g.add(at(solid(new THREE.CylinderGeometry(0.1, 0.2, towerH, 10), P.wall), 0, towerH / 2 + 0.2, 0));
  const hubY = towerH + 0.4;
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
  return { group: g, rotor };
}

interface Pylon {
  group: THREE.Group;
  upperTips: THREE.Vector3[];
  lowerTips: THREE.Vector3[];
}

function pylonHalfAt(y: number): number {
  return PYLON_BASE_HALF + (PYLON_TOP_HALF - PYLON_BASE_HALF) * (y / PYLON_HEIGHT);
}

function pylonCorner(k: number, y: number): THREE.Vector3 {
  const signs: readonly (readonly [number, number])[] = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  const s = signs[k % 4] ?? [1, 1];
  const half = pylonHalfAt(y);
  return new THREE.Vector3(s[0] * half, y, s[1] * half);
}

/** Hanging insulator string at the end of a cross-arm; returns the wire attach point. */
function addInsulator(g: THREE.Group, x: number, armY: number): THREE.Vector3 {
  g.add(at(solid(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), P.insulator), x, armY - 0.2, 0));
  for (let i = 0; i < 3; i++) {
    g.add(at(solid(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 8), P.insulator), x, armY - 0.1 - i * 0.1, 0));
  }
  return new THREE.Vector3(x, armY - 0.44, 0);
}

function makePylon(): Pylon {
  const g = new THREE.Group();
  g.add(at(solid(new THREE.BoxGeometry(2.0, 0.2, 2.0), P.slab), 0, 0.1, 0));

  for (let k = 0; k < 4; k++) {
    g.add(beam(pylonCorner(k, 0.2), pylonCorner(k, PYLON_HEIGHT), PYLON_BEAM * 1.3, P.steel));
  }
  for (const y of PYLON_LEVELS) {
    for (let k = 0; k < 4; k++) g.add(beam(pylonCorner(k, y), pylonCorner(k + 1, y), PYLON_BEAM, P.steel));
  }
  for (let i = 0; i < PYLON_LEVELS.length - 1; i++) {
    const lo = PYLON_LEVELS[i] ?? 0;
    const hi = PYLON_LEVELS[i + 1] ?? 0;
    for (let k = 0; k < 4; k++) {
      g.add(beam(pylonCorner(k, lo), pylonCorner(k + 1, hi), PYLON_BEAM * 0.7, P.steel));
      g.add(beam(pylonCorner(k + 1, lo), pylonCorner(k, hi), PYLON_BEAM * 0.7, P.steel));
    }
  }

  const upperY = PYLON_LEVELS[3] ?? PYLON_HEIGHT;
  const lowerY = PYLON_LEVELS[2] ?? PYLON_HEIGHT / 2;
  const upperArm = 1.3;
  const lowerArm = 1.6;
  g.add(beam(new THREE.Vector3(-upperArm, upperY, 0), new THREE.Vector3(upperArm, upperY, 0), PYLON_BEAM * 1.2, P.steel));
  g.add(beam(new THREE.Vector3(-lowerArm, lowerY, 0), new THREE.Vector3(lowerArm, lowerY, 0), PYLON_BEAM * 1.2, P.steel));
  g.add(at(solid(new THREE.ConeGeometry(0.12, 0.3, 6), P.steel), 0, PYLON_HEIGHT + 0.1, 0));

  const upperTips = [addInsulator(g, -upperArm, upperY), addInsulator(g, upperArm, upperY)];
  const lowerTips = [addInsulator(g, -lowerArm, lowerY), addInsulator(g, lowerArm, lowerY)];
  return { group: g, upperTips, lowerTips };
}

/** Catenary-like sagging wire between two world points. */
function makeLine(a: THREE.Vector3, b: THREE.Vector3): THREE.Mesh {
  const sag = a.distanceTo(b) * LINE_SAG_RATIO;
  const points: THREE.Vector3[] = [];
  const segments = 12;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = a.clone().lerp(b, t);
    p.y -= sag * 4 * t * (1 - t);
    points.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, LINE_RADIUS, 5, false), lineMaterial);
  mesh.castShadow = true;
  return mesh;
}

function nearest(candidates: readonly THREE.Vector3[], p: THREE.Vector3, exclude?: THREE.Vector3): THREE.Vector3 {
  let best: THREE.Vector3 | undefined;
  for (const c of candidates) {
    if (c === exclude) continue;
    if (!best || c.distanceTo(p) < best.distanceTo(p)) best = c;
  }
  if (!best) throw new Error("no candidate point");
  return best;
}

function worldPoint(group: THREE.Object3D, local: THREE.Vector3): THREE.Vector3 {
  group.updateMatrixWorld(true);
  return group.localToWorld(local.clone());
}

function makeIsland(): THREE.Group {
  const g = new THREE.Group();
  const sandGeo = new THREE.CylinderGeometry(ISLAND_SAND_TOP_RADIUS, ISLAND_SAND_BOTTOM_RADIUS, ISLAND_SAND_HEIGHT, 30);
  sandGeo.translate(0, -ISLAND_SAND_HEIGHT / 2, 0);
  g.add(solid(sandGeo, P.sand));
  const grassGeo = new THREE.CylinderGeometry(ISLAND_GRASS_TOP_RADIUS, ISLAND_GRASS_BOTTOM_RADIUS, GRASS_HEIGHT, 30);
  grassGeo.translate(0, GRASS_HEIGHT / 2, 0);
  g.add(solid(grassGeo, P.grass));

  // Rim rocks, placed by index so the result is deterministic.
  for (let i = 0; i < ROCK_COUNT; i++) {
    const angle = (i / ROCK_COUNT) * Math.PI * 2 + 0.3;
    const size = 0.5 + ((i * 37) % 5) * 0.1;
    const rock = solid(new THREE.DodecahedronGeometry(size, 0), P.rock);
    rock.position.set(Math.cos(angle) * ROCK_RING_RADIUS, WATER_Y + size * 0.3, Math.sin(angle) * ROCK_RING_RADIUS);
    rock.rotation.set(i, i * 2, 0);
    rock.scale.y = 0.7;
    g.add(rock);
  }
  return g;
}

// ---- Scene ----
export function buildSpikeScene(scene: THREE.Scene): { update(dt: number): void } {
  scene.background = new THREE.Color(P.water);

  scene.add(new THREE.HemisphereLight(P.hemiSky, P.hemiGround, 1.7));
  const sun = new THREE.DirectionalLight(P.sun, 2.4);
  sun.position.set(-8, 16, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const cam = sun.shadow.camera;
  cam.left = -13;
  cam.right = 13;
  cam.top = 13;
  cam.bottom = -13;
  cam.near = 1;
  cam.far = 50;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  // Water and shoreline foam.
  const waterMat = new THREE.MeshStandardMaterial({ color: P.water, roughness: 1, metalness: 0 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_Y;
  water.receiveShadow = false; // shadows on open water read as stray lines
  scene.add(water);

  const foamMat = new THREE.MeshBasicMaterial({ color: P.foam, transparent: true, opacity: 0.5, depthWrite: false });
  const foam = new THREE.Mesh(new THREE.RingGeometry(FOAM_INNER_RADIUS, FOAM_OUTER_RADIUS, 48), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = WATER_Y + 0.01;
  scene.add(foam);

  scene.add(makeIsland());

  // Houses.
  const houseSpecs: readonly { spec: HouseSpec; x: number; z: number; rotY: number }[] = [
    { spec: { width: 2.4, depth: 2.0, height: 1.5, roof: P.roofSlate, lit: [true, false, true], chimney: true, fence: true }, x: -5, z: 3, rotY: 0.25 },
    { spec: { width: 1.9, depth: 1.7, height: 1.3, roof: P.roofClay, lit: [false, true, false] }, x: -2.2, z: 5, rotY: -0.3 },
    { spec: { width: 1.6, depth: 1.5, height: 1.2, roof: P.roofSage, lit: [true, true, false] }, x: -6, z: -0.5, rotY: 0.6 },
  ];
  const houseMasts: THREE.Vector3[] = [];
  for (const h of houseSpecs) {
    const built = makeHouse(h.spec);
    built.group.position.set(h.x, GROUND_Y, h.z);
    built.group.rotation.y = h.rotY;
    scene.add(built.group);
    houseMasts.push(worldPoint(built.group, built.attach));
  }

  // Gas power plant and transformer.
  const plant = makePowerPlant();
  plant.position.set(3.2, GROUND_Y, -3.8);
  scene.add(plant);

  const transformer = makeTransformer();
  transformer.group.position.set(0.6, GROUND_Y, -2.2);
  transformer.group.rotation.y = -0.4;
  scene.add(transformer.group);

  // Wind turbine.
  const turbine = makeWindTurbine();
  turbine.group.position.set(-2.5, GROUND_Y, -5);
  turbine.group.rotation.y = 0.5;
  scene.add(turbine.group);

  // Pylon, arms perpendicular to the line toward the plant.
  const pylon = makePylon();
  pylon.group.position.set(-1.2, GROUND_Y, 0.8);
  pylon.group.rotation.y = -Math.PI / 4;
  scene.add(pylon.group);
  const upperTips = pylon.upperTips.map((t) => worldPoint(pylon.group, t));
  const lowerTips = pylon.lowerTips.map((t) => worldPoint(pylon.group, t));

  // Lines: transformer -> pylon, pylon -> houses.
  const used: THREE.Vector3[] = [];
  for (const top of TRANSFORMER_BUSHING_TOPS) {
    const from = worldPoint(transformer.group, top);
    const to = nearest(upperTips, from, used[0]);
    used.push(to);
    scene.add(makeLine(from, to));
  }
  for (const mast of houseMasts) {
    scene.add(makeLine(nearest(lowerTips, mast), mast));
  }

  // Trees.
  const trees: readonly [number, number, number, boolean][] = [
    [-3.5, -3.5, 1.1, true],
    [-7.2, 2.8, 0.9, false],
    [1, 6.8, 1.0, true],
    [7, -1, 1.2, false],
    [-1, -6.5, 1.0, true],
    [3.5, 6.2, 0.8, false],
  ];
  for (const [x, z, s, light] of trees) {
    scene.add(at(makeTree(s, light), x, GROUND_Y, z));
  }

  let time = 0;
  return {
    update(dt: number): void {
      time += dt;
      turbine.rotor.rotation.z -= dt * ROTOR_SPEED;
      waterMat.color.copy(WATER_COLOR_A).lerp(WATER_COLOR_B, 0.5 + 0.5 * Math.sin(time * 0.5));
      foam.scale.setScalar(1 + 0.012 * Math.sin(time * 0.9));
      foamMat.opacity = 0.4 + 0.15 * Math.sin(time * 0.9);
      lineMaterial.emissiveIntensity = 0.55 + 0.25 * Math.sin(time * 1.6);
    },
  };
}
