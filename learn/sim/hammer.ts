// L5: water hammer. Pure TypeScript: no three, no DOM.
// Source: ESHA guide, eq. 5.22 (wave speed), 5.23 (critical time), 5.24 (Joukowsky), 5.25-5.26 (Allievi), ex. 5.7.
// The Allievi result is capped at the Joukowsky value (docs/learn/pelton/lectia-05.md).

const G = 9.81;

/** Bulk modulus of water, in Pa. */
export const K_WATER = 2.1e9;
/** Density of water, in kg/m3. */
export const RHO = 1000;

/** Pipes of ESHA ex. 5.7: elastic modulus (Pa) and D/t (steel 400 mm / 4 mm, PVC 400 mm / 14 mm). */
export const PIPES: Record<"steel" | "pvc", { e: number; dOverT: number }> = {
  steel: { e: 2.1e11, dOverT: 100 },
  pvc: { e: 2.75e9, dOverT: 400 / 14 },
};

/** What the scene needs to play one valve closing. */
export interface HammerParams {
  closeS: number;
  h0M: number;
  dH: number;
}

/** Pressure wave speed in m/s: c = sqrt[(K / rho) / (1 + K (D/t) / E)]. */
export function waveSpeedMs(eModulusPa: number, dOverT: number): number {
  return Math.sqrt(K_WATER / RHO / (1 + (K_WATER * dOverT) / eModulusPa));
}

/** Critical time in s: the wave's round trip, 2 L / c. */
export function criticalTimeS(lengthM: number, c: number): number {
  return (2 * lengthM) / c;
}

/** Joukowsky surge in m for an instant stop: c * dV / g. */
export function joukowskyM(c: number, dvMs: number): number {
  return (c * dvMs) / G;
}

/** Allievi surge in m for a closing time `closeS`. */
export function allieviM(h0M: number, lengthM: number, v0Ms: number, closeS: number): number {
  const n = ((lengthM * v0Ms) / (G * h0M * closeS)) ** 2;
  return h0M * (n / 2 + Math.sqrt(n + (n * n) / 4));
}

/** Surge in m. Closing within Tc is "sudden" (Joukowsky); slower is "gradual" (Allievi, at most Joukowsky). */
export function surgeM(c: number, lengthM: number, v0Ms: number, h0M: number, closeS: number): { dH: number; sudden: boolean } {
  const joukowsky = joukowskyM(c, v0Ms);
  if (closeS <= criticalTimeS(lengthM, c)) return { dH: joukowsky, sudden: true };
  return { dH: Math.min(allieviM(h0M, lengthM, v0Ms, closeS), joukowsky), sudden: false };
}
