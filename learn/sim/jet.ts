// L6: the jet of a Pelton nozzle. Pure TypeScript: no three, no DOM.
// Source: v = Cv * sqrt(2 g H) with Cv = 0.98-0.99 (docs/learn/pelton/lectia-06.md, S7, S18).
// Simplification: the jet area is proportional to the spear opening. Power: use powerKW from power.ts.

const G = 9.81;

/** Velocity coefficient of the nozzle. */
export const CV = 0.98;
/** Nozzle diameter d0 in mm. */
export const NOZZLE_MM = 40;

/** Jet speed in m/s from net head (m) and velocity coefficient. */
export function jetSpeedMs(headM: number, cv: number): number {
  return cv * Math.sqrt(2 * G * headM);
}

/** Jet flow in L/s from speed (m/s), nozzle diameter (mm) and spear opening (0..1). */
export function jetFlowLps(speedMs: number, nozzleMm: number, opening: number): number {
  const d = nozzleMm / 1000;
  return speedMs * opening * ((Math.PI * d * d) / 4) * 1000;
}
