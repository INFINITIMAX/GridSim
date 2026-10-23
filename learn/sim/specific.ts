// L9: specific speed, Pelton size and the choice of turbine. Pure TypeScript: no three, no DOM.
// Source: ESHA part 2, chapter 6 (S19): n_QE = n √Q / (g H)^¾ (eq. 6.5), D1 = 0.68 √H / n (eq. 6.16, n in rev/s),
// bands of n_QE (table 6.2) and ranges of head (table 6.3). Claims I1-I5 in docs/learn/pelton/lectia-09.md.
// A type fits when n_QE is inside its band and the head is inside its range; limits are inclusive.

const G = 9.81;

export type Turbine = "pelton" | "francis" | "kaplan";

export interface TurbineBand {
  /** Band of specific speed n_QE. */
  nqe: readonly [number, number];
  /** Range of head in m. */
  headM: readonly [number, number];
}

/** The bands of table 6.2 and 6.3; the Pelton one is for a single jet. */
const BANDS: Record<Turbine, TurbineBand> = {
  pelton: { nqe: [0.005, 0.025], headM: [50, 1300] },
  francis: { nqe: [0.05, 0.33], headM: [25, 350] },
  kaplan: { nqe: [0.19, 1.55], headM: [2, 40] },
};

const ORDER: readonly Turbine[] = ["pelton", "francis", "kaplan"];

/** Band of a turbine; the Pelton band is multiplied by √j for j jets. */
export function bandFor(type: Turbine, jets: number): TurbineBand {
  const b = BANDS[type];
  if (type !== "pelton") return b;
  const f = Math.sqrt(jets);
  return { nqe: [b.nqe[0] * f, b.nqe[1] * f], headM: b.headM };
}

/** Specific speed n_QE from speed (rpm), flow (m³/s) and net head (m). */
export function specificSpeed(rpm: number, flowM3s: number, headM: number): number {
  return ((rpm / 60) * Math.sqrt(flowM3s)) / Math.pow(G * headM, 0.75);
}

/** Diameter of the circle through the bucket centres of a Pelton runner, in m. */
export function peltonDiameterM(headM: number, rpm: number): number {
  return (0.68 * Math.sqrt(headM)) / (rpm / 60);
}

/** Types that fit, in the order pelton, francis, kaplan. */
export function fittingTurbines(nqe: number, headM: number, jets: number): Turbine[] {
  return ORDER.filter((type) => {
    const b = bandFor(type, jets);
    return nqe >= b.nqe[0] && nqe <= b.nqe[1] && headM >= b.headM[0] && headM <= b.headM[1];
  });
}
