import * as THREE from "three";

// P1 placeholder: proves three.js renders. Replaced by the P1b visual spike.
const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (!canvas) throw new Error("missing #scene canvas");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color("#f3efe6");
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(6, 5, 6);
camera.lookAt(0, 0, 0);
scene.add(new THREE.HemisphereLight("#ffffff", "#b9a98c", 2.2));
const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#e0a458" }));
scene.add(box);

function resize(): void {
  const { innerWidth: w, innerHeight: h } = window;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();
renderer.setAnimationLoop((t) => {
  box.rotation.y = t / 1000;
  renderer.render(scene, camera);
});
