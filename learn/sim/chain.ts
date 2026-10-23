// L12: power along the whole chain, from the stream to the plug. Pure TypeScript: no three, no DOM.
// Source: docs/learn/pelton/lectia-12.md (claims L1-L4): P = rho g Q (H - hf) * eta_t * eta_g, E = P * 8760 * load factor.
// The turbine curve and the pipe are those of lessons 8 and 4.
import { turbineEfficiency } from "./efficiency";
import { frictionLossM, GROSS_HEAD_M, pipeVelocityMs, reynolds, ROUGHNESS_MM, swameeJainF } from "./friction";
import { CV, jetFlowLps, jetSpeedMs, NOZZLE_MM } from "./jet";

const G = 9.81;
const NET_HEAD_M = 59;
const PIPE_MM = 200;
const PIPE_LENGTH_M = 150;

/** Design flow in L/s: the full jet at 59 m net head, as in lessons 6 to 8. */
export const DESIGN_FLOW_LPS = jetFlowLps(jetSpeedMs(NET_HEAD_M, CV), NOZZLE_MM, 1);

/** Generator efficiency: the maker's 10 kW figure (ESHA table 6.8) and a small micro set (S13). */
export const GEN_EFF = { maker: 0.91, small: 0.8 };
/** Efficiency of a small turbine (S13), constant over the flow. */
export const SMALL_TURBINE_EFF = 0.75;

export type MachineSet = "maker" | "small";

export interface ChainKW {
  gross: number;
  net: number;
  shaft: number;
  elec: number;
  /** elec / gross, 0..1 */
  overall: number;
}

/** Power in kW at each step of the chain, at the flow ratio q = Q / Qd. */
export function chainKW(flowRatio: number, machines: MachineSet): ChainKW {
  const flowLps = flowRatio * DESIGN_FLOW_LPS;
  const dM = PIPE_MM / 1000;
  const velocity = pipeVelocityMs(flowLps, PIPE_MM);
  const hf = frictionLossM(swameeJainF(ROUGHNESS_MM.pe, dM, reynolds(velocity, dM)), PIPE_LENGTH_M, dM, velocity);
  const gross = G * (flowLps / 1000) * GROSS_HEAD_M;
  const net = (gross * (GROSS_HEAD_M - hf)) / GROSS_HEAD_M;
  const shaft = net * (machines === "maker" ? turbineEfficiency(flowRatio, 1) : SMALL_TURBINE_EFF);
  const elec = shaft * GEN_EFF[machines];
  return { gross, net, shaft, elec, overall: elec / gross };
}

/** Energy per year in kWh from electric power (kW) and load factor (0..1). */
export function annualKWh(elecKW: number, loadFactor: number): number {
  return elecKW * 8760 * loadFactor;
}
