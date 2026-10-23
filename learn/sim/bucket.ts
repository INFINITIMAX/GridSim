// L7: the double bucket of a Pelton runner. Pure TypeScript: no three, no DOM.
// Source: ηh = 2 (v1 - u) (1 + k cos φ) u / v1² = 2 (1 - r) r (1 + k cos φ), with r = u / v1, φ = 180° - θ and
// k = Vr2 / Vr1 (docs/learn/pelton/lectia-07.md, claims G3-G5; S7 eq. 2-4, S18). Jet power: ½ ρ Q v1².
// The exit speed comes from the velocity triangle: tangential u - w cos φ, axial w sin φ, with w = k (v1 - u).

const RHO = 1000;

/** Deflection angle θ of the jet through the bucket, in degrees. */
export const DEFLECTION_DEG = 165;
/** k = Vr2 / Vr1 of an ideal bucket (no friction). */
export const K_IDEAL = 1;

const phiRad = (deflectionDeg: number): number => ((180 - deflectionDeg) * Math.PI) / 180;

/** Hydraulic efficiency of the bucket (0..1) from the speed ratio r = u / v1. */
export function bucketEfficiency(ratio: number, deflectionDeg: number, k: number): number {
  return 2 * (1 - ratio) * ratio * (1 + k * Math.cos(phiRad(deflectionDeg)));
}

/** Speed of the water leaving the bucket, in m/s. */
export function exitSpeedMs(jetMs: number, ratio: number, deflectionDeg: number, k: number): number {
  const phi = phiRad(deflectionDeg);
  const u = ratio * jetMs;
  const w = k * (jetMs - u);
  return Math.hypot(u - w * Math.cos(phi), w * Math.sin(phi));
}

/** Power carried by the jet in kW, from flow (L/s) and jet speed (m/s). */
export function jetPowerKW(flowLps: number, jetMs: number): number {
  return (0.5 * RHO * (flowLps / 1000) * jetMs * jetMs) / 1000;
}
