// L2: P = Q * H * g * e. Pure TypeScript: no three, no DOM.

const G = 9.81;

/** Power in kW from head (m), flow (L/s) and overall efficiency (0..1). */
export function powerKW(headM: number, flowLps: number, eff: number): number {
  return (flowLps / 1000) * headM * G * eff;
}
