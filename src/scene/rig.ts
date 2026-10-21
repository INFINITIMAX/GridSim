import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const CAMERA_DISTANCE = 60;
const CAMERA_AZIMUTH = Math.PI / 4;
const CAMERA_ELEVATION = (33 * Math.PI) / 180;
/** World units that must fit vertically and horizontally in the free area. */
const FIT_HEIGHT = 21;
const FIT_WIDTH = 22;
const PAN_LIMIT = new THREE.Vector3(6, 3, 6);

export interface Rig {
  readonly camera: THREE.OrthographicCamera;
  resize(width: number, height: number): void;
  setPaddingRight(px: number): void;
  /** Call once per frame, before rendering. */
  update(): void;
  dispose(): void;
}

/** Orthographic isometric-style camera, orbit controls clamped to the island, and framing. */
export function createRig(canvas: HTMLCanvasElement): Rig {
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

  let width = 1;
  let height = 1;
  let paddingRight = 0;

  function frame(): void {
    const free = Math.max(width - paddingRight, 1);
    const pxPerUnit = Math.min(height / FIT_HEIGHT, free / FIT_WIDTH);
    const halfH = height / (2 * pxPerUnit);
    const halfW = halfH * (width / height);
    // Move the view center so the island sits in the middle of the free area.
    const shift = paddingRight / 2 / pxPerUnit;
    camera.left = -halfW + shift;
    camera.right = halfW + shift;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
  }
  frame();

  return {
    camera,
    resize(w: number, h: number): void {
      width = Math.max(w, 1);
      height = Math.max(h, 1);
      frame();
    },
    setPaddingRight(px: number): void {
      paddingRight = Math.max(px, 0);
      frame();
    },
    update(): void {
      controls.update();
      const clamped = controls.target.clone().clamp(panMin, panMax);
      const delta = clamped.sub(controls.target);
      controls.target.add(delta);
      camera.position.add(delta);
    },
    dispose(): void {
      controls.dispose();
    },
  };
}
