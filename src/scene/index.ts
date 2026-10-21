import * as THREE from "three";
import type { Snapshot } from "../game";
import { createEnvironment } from "./island";
import { disposeObject, disposeShared, setDesaturation } from "./parts";
import { createRig } from "./rig";
import { createWorld } from "./world";

declare global {
  interface Window {
    __gridsimReady?: boolean;
    __gridsimScene?: { litWindowCount(): number };
  }
}

const MAX_DT = 1 / 30;
const DESATURATION_SPEED = 1.5; // per second: a blackout fades the colors in about 0.7 s

export interface SceneHandle {
  /** Applies the snapshot and renders one frame. Call every frame. */
  update(snapshot: Snapshot, dtSeconds: number): void;
  resize(width: number, height: number): void;
  /** Keeps the island clear of a side panel of this width (desktop). */
  setPadding(left: number, right: number): void;
  dispose(): void;
}

export function mountScene(canvas: HTMLCanvasElement): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const environment = createEnvironment(scene);
  const world = createWorld(scene);
  const rig = createRig(canvas);

  const reducedMotion = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  let motion = !(reducedMotion?.matches ?? false);
  const onMotionChange = (e: MediaQueryListEvent): void => {
    motion = !e.matches;
  };
  reducedMotion?.addEventListener("change", onMotionChange);

  function resize(width: number, height: number): void {
    renderer.setSize(width, height, false);
    rig.resize(width, height);
  }
  resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);

  window.__gridsimScene = { litWindowCount: () => world.litWindowCount() };

  let clock = 0; // animation clock for the water; frozen under reduced motion
  let desaturation = 0;
  let appliedDesaturation = 0;
  let rendered = false;

  return {
    update(snapshot: Snapshot, dtSeconds: number): void {
      const dt = Math.min(Math.max(dtSeconds, 0), MAX_DT);
      if (motion) clock += dt;

      const goal = snapshot.blackout ? 1 : 0;
      const maxStep = dt * DESATURATION_SPEED;
      desaturation += Math.min(Math.max(goal - desaturation, -maxStep), maxStep);
      if (desaturation !== appliedDesaturation) {
        appliedDesaturation = desaturation;
        setDesaturation(desaturation);
      }

      world.update(snapshot, dt, motion);
      environment.update(clock, desaturation);
      rig.update();
      renderer.render(scene, rig.camera);
      if (!rendered) {
        rendered = true;
        window.__gridsimReady = true;
      }
    },
    resize,
    setPadding(left: number, right: number): void {
      rig.setPadding(left, right);
    },
    dispose(): void {
      reducedMotion?.removeEventListener("change", onMotionChange);
      rig.dispose();
      disposeObject(scene);
      disposeShared();
      renderer.dispose();
      delete window.__gridsimScene;
      window.__gridsimReady = false;
    },
  };
}
