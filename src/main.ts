import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildSpikeScene } from "./scene/spike";

declare global {
  interface Window {
    __gridsimReady?: boolean;
  }
}

const CAMERA_DISTANCE = 60;
const CAMERA_AZIMUTH = Math.PI / 4;
const CAMERA_ELEVATION = (33 * Math.PI) / 180;
const MIN_HALF_HEIGHT = 10.5; // world units visible above/below center (landscape)
const MIN_HALF_WIDTH = 11; // world units visible left/right of center (portrait)
const MAX_DT = 1 / 30;
const PAN_LIMIT = new THREE.Vector3(6, 3, 6);

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (!canvas) throw new Error("missing #scene canvas");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const spike = buildSpikeScene(scene);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
const target = new THREE.Vector3(0, 1.5, 0);
camera.position.set(
  target.x + CAMERA_DISTANCE * Math.cos(CAMERA_ELEVATION) * Math.sin(CAMERA_AZIMUTH),
  target.y + CAMERA_DISTANCE * Math.sin(CAMERA_ELEVATION),
  target.z + CAMERA_DISTANCE * Math.cos(CAMERA_ELEVATION) * Math.cos(CAMERA_AZIMUTH),
);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(target);
controls.enableDamping = true;
controls.minZoom = 0.6;
controls.maxZoom = 2.5;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = Math.PI / 2 - 0.15; // never see under the island
controls.update();

const panMin = target.clone().sub(PAN_LIMIT);
const panMax = target.clone().add(PAN_LIMIT);

function clampPan(): void {
  const clamped = controls.target.clone().clamp(panMin, panMax);
  const delta = clamped.sub(controls.target);
  controls.target.add(delta);
  camera.position.add(delta);
}

function resize(): void {
  const { innerWidth: w, innerHeight: h } = window;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  const halfH = Math.max(MIN_HALF_HEIGHT, MIN_HALF_WIDTH / aspect);
  camera.left = -halfH * aspect;
  camera.right = halfH * aspect;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

let last: number | null = null;
renderer.setAnimationLoop((t) => {
  const dt = last === null ? 0 : Math.min((t - last) / 1000, MAX_DT);
  last = t;
  spike.update(dt);
  controls.update();
  clampPan();
  renderer.render(scene, camera);
  window.__gridsimReady = true;
});
