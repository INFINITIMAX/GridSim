// L4: friction loss in the penstock. Pure TypeScript: no three, no DOM.
// Source: ESHA guide, eq. 2.4 (Darcy-Weisbach), table 2.1 (roughness), eq. 2.9a (Colebrook-White);
// f comes from the Swamee-Jain approximation of Colebrook-White (docs/learn/pelton/lectia-04.md, S12).

const G = 9.81;

/** Gross head used in lessons 4 and 5, in m (the value of lesson 2). */
export const GROSS_HEAD_M = 60;

/** Kinematic viscosity of water at about 10 degrees C, in m2/s (ESHA). */
export const NU = 1.31e-6;

/** Wall roughness in mm: polyethylene and welded steel (ESHA table 2.1). */
export const ROUGHNESS_MM: Record<"pe" | "steel", number> = { pe: 0.003, steel: 0.6 };

/** Mean speed in m/s from flow (L/s) and inside diameter (mm): V = 4Q / (pi D^2). */
export function pipeVelocityMs(flowLps: number, diameterMm: number): number {
  const d = diameterMm / 1000;
  return (4 * (flowLps / 1000)) / (Math.PI * d * d);
}

/** Reynolds number from speed (m/s) and diameter (m). */
export function reynolds(velocityMs: number, diameterM: number): number {
  return (velocityMs * diameterM) / NU;
}

/** Darcy friction factor (Swamee-Jain) from roughness (mm), diameter (m) and Reynolds number. */
export function swameeJainF(roughnessMm: number, diameterM: number, re: number): number {
  const relative = roughnessMm / 1000 / (3.7 * diameterM);
  return 0.25 / Math.log10(relative + 5.74 / re ** 0.9) ** 2;
}

/** Friction head loss in m: hf = f * (L / D) * V^2 / (2 g). */
export function frictionLossM(f: number, lengthM: number, diameterM: number, velocityMs: number): number {
  return f * (lengthM / diameterM) * (velocityMs * velocityMs) / (2 * G);
}
