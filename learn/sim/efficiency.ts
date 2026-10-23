// L8: efficiency of a Pelton turbine against flow. Pure TypeScript: no three, no DOM.
// Source: RETScreen curve (S1 HYDRO.40, S20 lines 458-461, claim H2), with the peak from ESHA table 6.7 (claim H3):
//   qp = 0.662 + 0.001 j,  η / ep = 1 - (1.31 + 0.025 j) * |(qp - q) / qp| ^ (5.6 + 0.4 j).
// The coefficient (1.31 + 0.025 j) multiplies the power term; it is not raised to it.
// Shaft power: use powerKW from power.ts.

/** Best efficiency of a small Pelton: 0.89 with one jet, 0.90 with more. */
export function peakEfficiency(jets: number): number {
  return jets <= 1 ? 0.89 : 0.9;
}

/** Flow (as a share of the design flow) where the efficiency is highest. */
export function peakFlowRatio(jets: number): number {
  return 0.662 + 0.001 * jets;
}

/** Efficiency divided by its peak, at a flow ratio q = Q / Qd. */
export function relativeEfficiency(flowRatio: number, jets: number): number {
  const qp = peakFlowRatio(jets);
  return 1 - (1.31 + 0.025 * jets) * Math.pow(Math.abs((qp - flowRatio) / qp), 5.6 + 0.4 * jets);
}

/** Turbine efficiency (0..1) at a flow ratio q = Q / Qd. */
export function turbineEfficiency(flowRatio: number, jets: number): number {
  return relativeEfficiency(flowRatio, jets) * peakEfficiency(jets);
}
