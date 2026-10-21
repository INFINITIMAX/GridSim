// GridSim 2D, hydro physics. Pure functions, no DOM.

// ---------- Everything you might want to change lives here ----------

export interface TurbineType {
  id: "small" | "medium" | "large";
  name: string;
  /** m³/s at full load. */
  designFlow: number;
  peakEfficiency: number;
  /** Fraction of designFlow below which it cannot run. */
  minLoad: number;
  /** Rotor size on the map, in tiles (visual only). */
  radius: number;
}

export const TURBINES: readonly TurbineType[] = [
  { id: "small", name: "Small turbine", designFlow: 1.0, peakEfficiency: 0.8, minLoad: 0.3, radius: 0.16 },
  { id: "medium", name: "Medium turbine", designFlow: 2.0, peakEfficiency: 0.85, minLoad: 0.3, radius: 0.2 },
  { id: "large", name: "Large turbine", designFlow: 3.5, peakEfficiency: 0.88, minLoad: 0.3, radius: 0.24 },
];

/** Drop created by the dam, metres. */
export const HEAD_M = 5;
export const MAX_TURBINES = 4;
/** River flow presets, m³/s. */
export const RIVER_PRESETS = { dry: 0.8, normal: 3, flood: 9 } as const;
export const RIVER_MAX = 12;
/** Efficiency lost at zero load, as a fraction of peak. Falls off with the square of the missing load. */
const PART_LOAD_PENALTY = 0.25;

// ---------- Physics ----------

export interface PlantSetup {
  turbine: TurbineType["id"];
  count: number;
}

export interface Operation {
  running: number;
  flowPerTurbine: number;
  usedFlow: number;
  spilledFlow: number;
  load: number;
  efficiency: number;
  powerKW: number;
  maxPowerKW: number;
  energyPerDayMWh: number;
}

export function turbineById(id: TurbineType["id"]): TurbineType {
  return TURBINES.find((t) => t.id === id) ?? TURBINES[0]!;
}

export function operate(setup: PlantSetup, riverFlow: number, headM = HEAD_M): Operation {
  const type = turbineById(setup.turbine);
  const count = Math.min(Math.max(Math.round(setup.count), 1), MAX_TURBINES);
  const flow = Math.max(riverFlow, 0);
  const qMin = type.minLoad * type.designFlow;
  const maxRunnable = Math.min(count, Math.floor(flow / qMin + 1e-9));
  // Power P = rho * g * Q * H * eta: 1000 kg/m³ * 9.81 m/s² * flow * head * efficiency, divided by 1000 for kW.
  const kW = (q: number, eta: number): number => (1000 * 9.81 * q * headM * eta) / 1000;
  const maxPowerKW = kW(count * type.designFlow, type.peakEfficiency);

  /** The plant with exactly `running` turbines sharing the river. */
  const withRunning = (running: number): Operation => {
    const flowPerTurbine = Math.min(type.designFlow, flow / running);
    const usedFlow = running * flowPerTurbine;
    const load = flowPerTurbine / type.designFlow;
    const efficiency = type.peakEfficiency * (1 - PART_LOAD_PENALTY * (1 - load) ** 2);
    const powerKW = kW(usedFlow, efficiency);
    return { running, flowPerTurbine, usedFlow, spilledFlow: flow - usedFlow, load, efficiency, powerKW, maxPowerKW, energyPerDayMWh: (powerKW * 24) / 1000 };
  };

  if (maxRunnable === 0) {
    return { running: 0, flowPerTurbine: 0, usedFlow: 0, spilledFlow: flow, load: 0, efficiency: 0, powerKW: 0, maxPowerKW, energyPerDayMWh: 0 };
  }
  // Like a real operator: shut turbines down when fewer, fuller ones make more power. Ties keep the smaller number.
  let best = withRunning(1);
  for (let k = 2; k <= maxRunnable; k++) {
    const candidate = withRunning(k);
    if (candidate.powerKW > best.powerKW + 1e-9) best = candidate;
  }
  return best;
}

/** Power at evenly spaced river flows from 0 to `maxFlow`, for the chart. */
export function powerCurve(setup: PlantSetup, maxFlow = RIVER_MAX, steps = 120): { flow: number; powerKW: number }[] {
  const out: { flow: number; powerKW: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const flow = (maxFlow * i) / steps;
    out.push({ flow, powerKW: operate(setup, flow).powerKW });
  }
  return out;
}
