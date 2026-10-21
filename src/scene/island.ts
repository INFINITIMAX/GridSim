import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE as P } from "./palette";
import { GROUND_Y, desaturate, flat, solid } from "./parts";

const ISLAND_SAND_TOP_RADIUS = 9.0;
const ISLAND_SAND_BOTTOM_RADIUS = 9.5;
const ISLAND_SAND_HEIGHT = 1.4;
const ISLAND_GRASS_TOP_RADIUS = 8.5;
const ISLAND_GRASS_BOTTOM_RADIUS = 8.7;
const GRASS_HEIGHT = GROUND_Y;
const WATER_Y = -0.85;
const WATER_SIZE = 160;
const FOAM_INNER_RADIUS = 9.2;
const FOAM_OUTER_RADIUS = 9.8;
const ROCK_COUNT = 9;
const ROCK_RING_RADIUS = 9.3;

const WATER_COLOR_A = new THREE.Color(P.water);
const WATER_COLOR_B = new THREE.Color(P.waterDeep);

/** Trees on free spots: x, z, scale, light foliage. */
const TREES: readonly (readonly [number, number, number, boolean])[] = [
  [2.3, 2.1, 0.8, true],
  [-1.0, -2.0, 0.9, false],
  [-4.4, 6.1, 1.0, true],
  [-7.2, 1.2, 0.8, false],
];

export interface Environment {
  /** `time` is the animation clock in seconds; `desaturation` is 0..1 (blackout). */
  update(time: number, desaturation: number): void;
}

function makeRocks(): THREE.InstancedMesh {
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), flat(P.rock), ROCK_COUNT);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < ROCK_COUNT; i++) {
    const angle = (i / ROCK_COUNT) * Math.PI * 2 + 0.3;
    const size = 0.5 + ((i * 37) % 5) * 0.1;
    dummy.position.set(Math.cos(angle) * ROCK_RING_RADIUS, WATER_Y + size * 0.3, Math.sin(angle) * ROCK_RING_RADIUS);
    dummy.rotation.set(i, i * 2, 0);
    dummy.scale.set(size, size * 0.7, size);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  return rocks;
}

/** Trunks and the two foliage colors, one instanced mesh each. */
function makeTrees(): THREE.Group {
  const g = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.6, 6);
  trunkGeo.translate(0, 0.3, 0);
  const cones = [
    new THREE.ConeGeometry(0.62, 1.0, 7).translate(0, 1.0, 0),
    new THREE.ConeGeometry(0.46, 0.85, 7).translate(0, 1.6, 0),
    new THREE.ConeGeometry(0.3, 0.7, 7).translate(0, 2.15, 0),
  ];
  const foliageGeo = mergeGeometries(cones);
  for (const c of cones) c.dispose();
  if (!foliageGeo) throw new Error("foliage geometry could not be merged");

  const dummy = new THREE.Object3D();
  const build = (geo: THREE.BufferGeometry, color: string, light: boolean | null): THREE.InstancedMesh => {
    const chosen = TREES.filter((t) => light === null || t[3] === light);
    const mesh = new THREE.InstancedMesh(geo, flat(color), chosen.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    chosen.forEach((t, i) => {
      dummy.position.set(t[0], GROUND_Y, t[1]);
      dummy.scale.setScalar(t[2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    return mesh;
  };
  g.add(build(trunkGeo, P.trunk, null));
  g.add(build(foliageGeo, P.leafLight, true));
  g.add(build(foliageGeo.clone(), P.leafDark, false));
  return g;
}

/** Island, water, rocks, trees and lights. Returns the per-frame update for the water. */
export function createEnvironment(scene: THREE.Scene): Environment {
  const background = new THREE.Color(P.water);
  scene.background = background;

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

  const waterMat = new THREE.MeshStandardMaterial({ color: P.water, roughness: 1, metalness: 0 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_Y;
  scene.add(water);

  const foamMat = new THREE.MeshBasicMaterial({ color: P.foam, transparent: true, opacity: 0.5, depthWrite: false });
  const foam = new THREE.Mesh(new THREE.RingGeometry(FOAM_INNER_RADIUS, FOAM_OUTER_RADIUS, 48), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = WATER_Y + 0.01;
  scene.add(foam);

  const sandGeo = new THREE.CylinderGeometry(ISLAND_SAND_TOP_RADIUS, ISLAND_SAND_BOTTOM_RADIUS, ISLAND_SAND_HEIGHT, 30);
  sandGeo.translate(0, -ISLAND_SAND_HEIGHT / 2, 0);
  scene.add(solid(sandGeo, P.sand));
  const grassGeo = new THREE.CylinderGeometry(ISLAND_GRASS_TOP_RADIUS, ISLAND_GRASS_BOTTOM_RADIUS, GRASS_HEIGHT, 30);
  grassGeo.translate(0, GRASS_HEIGHT / 2, 0);
  scene.add(solid(grassGeo, P.grass));
  scene.add(makeRocks());
  scene.add(makeTrees());

  const mix = new THREE.Color();
  return {
    update(time: number, desaturation: number): void {
      mix.copy(WATER_COLOR_A).lerp(WATER_COLOR_B, 0.5 + 0.5 * Math.sin(time * 0.5));
      desaturate(waterMat.color, mix, desaturation);
      background.copy(waterMat.color);
      foam.scale.setScalar(1 + 0.012 * Math.sin(time * 0.9));
      foamMat.opacity = 0.4 + 0.15 * Math.sin(time * 0.9);
    },
  };
}
