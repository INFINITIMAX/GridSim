// L11: speed of the turbine when the village load drops, with and without a load controller (ELC).
// Pure TypeScript: no three, no DOM.
// Source: ESHA eq. 6.32-6.34 and docs/learn/pelton/lectia-11.md (claims K1, K2, K4, K6):
//   t_m * w * dw/dt = P_t(w) - P_load, with P_t(w) = w (2 - w) for a Pelton at constant flow (power per unit of P0).

const G = 9.81;

/** Starting time t_m in s. A model parameter, not a claim about a real machine (t_m / t_w > 4, ESHA). */
export const TM_S = 2;

const STEP_S = 0.001;
const SAMPLE_S = 0.1;
const DURATION_S = 10;

/** Turbine power over P0 at relative speed w = speed / nominal speed, at constant flow. */
export function turbinePowerPU(w: number): number {
  return w * (2 - w);
}

/** Water starting time t_w = L V / (g H) in s (ESHA eq. 6.34). */
export function waterStartS(lengthM: number, velocityMs: number, headM: number): number {
  return (lengthM * velocityMs) / (G * headM);
}

/**
 * Frequency in Hz at t = 0, 0.1, ... 10 s (101 values), after the village load drops from 100 % to `loadPU` (0..1) at t = 0.
 * RK4 with a 1 ms step, starting at w = 1. With the ELC the load is whatever the turbine makes, so w stays at 1.
 */
export function frequencyTrace(loadPU: number, elc: boolean, tmS: number): number[] {
  const dw = (w: number): number => {
    const load = elc ? turbinePowerPU(w) : loadPU;
    return (turbinePowerPU(w) - load) / (tmS * w);
  };
  const perSample = Math.round(SAMPLE_S / STEP_S);
  const samples = Math.round(DURATION_S / SAMPLE_S);
  let w = 1;
  const out: number[] = [50 * w];
  for (let i = 0; i < samples; i++) {
    for (let k = 0; k < perSample; k++) {
      const k1 = dw(w);
      const k2 = dw(w + (STEP_S / 2) * k1);
      const k3 = dw(w + (STEP_S / 2) * k2);
      const k4 = dw(w + STEP_S * k3);
      w += (STEP_S / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    }
    out.push(50 * w);
  }
  return out;
}

/** Power in kW that the ballast burns: what the village does not use, only with an ELC. */
export function ballastKW(p0KW: number, loadPU: number, elc: boolean): number {
  return elc ? p0KW * (1 - loadPU) : 0;
}
