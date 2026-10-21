// GridSim 2D, hydro physics. Pure functions, no DOM.

// ---------- Everything you might want to change lives here ----------

export const DAM_HEIGHTS = [3, 5, 8] as const; // m, gross head from the dam alone
export const CANAL_EXTRA_HEAD = 4; // m gained by a diversion canal
export const CANAL_HEAD_LOSS = 0.4; // m lost to friction in the canal
export const RACK_MAX_LOSS = 0.06; // fully clogged rack loses 6% of gross head
export const MEAN_FLOW = 3; // m³/s, the river's yearly average
export const ECO_FLOW = 0.1 * MEAN_FLOW; // m³/s that must bypass the plant (fish ladder)
export const FLOOD_SHUTDOWN_FLOW = 7; // m³/s; without gates the plant stops above this
export const CLOG_TIME_S = 180; // seconds for a clean rack to clog fully at MEAN_FLOW
export const AUTO_CLEAN_LEVEL = 0.05; // the automatic cleaner keeps clog at or below this
export const AVERAGE_CLOG_NO_CLEANER = 0.5; // assumed average clog over a year without the cleaner
export const MONTHLY_FLOW = [1.8, 2.2, 4.2, 6.5, 6.0, 4.0, 2.4, 1.4, 1.2, 1.6, 2.2, 2.0]; // m³/s, Jan..Dec, example mountain river: snowmelt in spring, low in autumn
export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const HOURS_PER_YEAR = 8760;

export type DamHeight = (typeof DAM_HEIGHTS)[number];

export interface Technology {
  id: "kaplan" | "francis" | "crossflow";
  name: string;
  description: string;
  peakEfficiency: number;
  /** Fraction of designFlow below which it cannot run. */
  minLoad: number;
  /** Gross head range it can work in, m. */
  minHead: number;
  maxHead: number;
  /** Share of peak efficiency kept at load `load` (flow through the turbine divided by its design flow). */
  partLoad: (load: number) => number;
}

export const TECHNOLOGIES: readonly Technology[] = [
  {
    id: "kaplan",
    name: "Kaplan",
    description: "Adjustable blades. Good across a wide range of flows, low head.",
    peakEfficiency: 0.9,
    minLoad: 0.2,
    minHead: 2,
    maxHead: 20,
    partLoad: (load) => 1 - 0.15 * (1 - load) ** 2,
  },
  {
    id: "francis",
    name: "Francis",
    description: "Highest peak efficiency, but only near its design flow. Needs 10 m of head or more.",
    peakEfficiency: 0.92,
    minLoad: 0.4,
    minHead: 10,
    maxHead: 300,
    partLoad: (load) => 1 - (load - 0.85) ** 2,
  },
  {
    id: "crossflow",
    name: "Crossflow",
    description: "Simple and robust. Lower efficiency, but it barely drops at low flow.",
    peakEfficiency: 0.8,
    minLoad: 0.15,
    minHead: 2,
    maxHead: 100,
    partLoad: (load) => 1 - 0.08 * (1 - load) ** 2,
  },
];

export interface TurbineSize {
  id: "small" | "medium" | "large";
  name: string;
  /** m³/s at full load. */
  designFlow: number;
  /** Rotor size on the map, in tiles (visual only). */
  radius: number;
}

export const SIZES: readonly TurbineSize[] = [
  { id: "small", name: "Small", designFlow: 1.0, radius: 0.16 },
  { id: "medium", name: "Medium", designFlow: 2.0, radius: 0.2 },
  { id: "large", name: "Large", designFlow: 3.5, radius: 0.24 },
];

export const MAX_TURBINES = 4;
/** River flow presets, m³/s. */
export const RIVER_PRESETS = { dry: 0.8, normal: 3, flood: 9 } as const;
export const RIVER_MAX = 12;

// ---------- Physics ----------

export interface PlantSetup {
  technology: Technology["id"];
  size: TurbineSize["id"];
  count: number;
  damHeight: DamHeight;
  canal: boolean;
  /** Spillway gates. */
  gates: boolean;
  /** Fish ladder; also the ecological flow. */
  fishLadder: boolean;
  autoCleaner: boolean;
}

export type StopReason = "flood" | "head" | "low-flow";

export interface Operation {
  running: number;
  flowPerTurbine: number;
  usedFlow: number;
  spilledFlow: number;
  ecoFlow: number;
  load: number;
  efficiency: number;
  powerKW: number;
  /** Nameplate power: all turbines at full load, clean rack, head check ignored. */
  installedKW: number;
  grossHead: number;
  netHead: number;
  rackLossM: number;
  canalLossM: number;
  stopReason: StopReason | null;
  energyPerDayMWh: number;
}

export function technologyById(id: Technology["id"]): Technology {
  return TECHNOLOGIES.find((t) => t.id === id) ?? TECHNOLOGIES[0]!;
}

export function sizeById(id: TurbineSize["id"]): TurbineSize {
  return SIZES.find((s) => s.id === id) ?? SIZES[0]!;
}

/** `clog` is how blocked the intake rack is, 0 (clean) to 1 (fully blocked). */
export function operate(setup: PlantSetup, riverFlow: number, clog: number): Operation {
  const tech = technologyById(setup.technology);
  const size = sizeById(setup.size);
  const count = Math.min(Math.max(Math.round(setup.count), 1), MAX_TURBINES);
  const clogLevel = Math.min(Math.max(clog, 0), 1);

  const canalLossM = setup.canal ? CANAL_HEAD_LOSS : 0;
  const grossHead = setup.damHeight + (setup.canal ? CANAL_EXTRA_HEAD : 0);
  const rackLossM = clogLevel * RACK_MAX_LOSS * grossHead;
  const netHead = grossHead - canalLossM - rackLossM;

  const flow = Math.max(riverFlow, 0);
  const ecoFlow = setup.fishLadder ? Math.min(ECO_FLOW, flow) : 0;
  const available = flow - ecoFlow;

  // Power P = rho * g * Q * H * eta: 1000 kg/m³ * 9.81 m/s² * flow * head * efficiency, divided by 1000 for kW.
  const kW = (q: number, head: number, eta: number): number => (1000 * 9.81 * q * head * eta) / 1000;
  const installedKW = count * kW(size.designFlow, grossHead - canalLossM, tech.peakEfficiency * tech.partLoad(1));
  const qMin = tech.minLoad * size.designFlow;
  const maxRunnable = Math.min(count, Math.floor(available / qMin + 1e-9));
  const headOk = grossHead >= tech.minHead && grossHead <= tech.maxHead;

  const stopReason: StopReason | null =
    !setup.gates && flow > FLOOD_SHUTDOWN_FLOW ? "flood" : !headOk ? "head" : maxRunnable === 0 ? "low-flow" : null;
  const common = { ecoFlow, installedKW, grossHead, netHead, rackLossM, canalLossM, stopReason };

  if (stopReason) {
    return { running: 0, flowPerTurbine: 0, usedFlow: 0, spilledFlow: available, load: 0, efficiency: 0, powerKW: 0, energyPerDayMWh: 0, ...common };
  }

  /** The plant with exactly `running` turbines sharing the available water. */
  const withRunning = (running: number): Operation => {
    const flowPerTurbine = Math.min(size.designFlow, available / running);
    const usedFlow = running * flowPerTurbine;
    const load = flowPerTurbine / size.designFlow;
    const efficiency = tech.peakEfficiency * tech.partLoad(load);
    const powerKW = kW(usedFlow, netHead, efficiency);
    return { running, flowPerTurbine, usedFlow, spilledFlow: available - usedFlow, load, efficiency, powerKW, energyPerDayMWh: (powerKW * 24) / 1000, ...common };
  };

  // Like a real operator: shut turbines down when fewer, fuller ones make more power. Ties keep the smaller number.
  let best = withRunning(1);
  for (let k = 2; k <= maxRunnable; k++) {
    const candidate = withRunning(k);
    if (candidate.powerKW > best.powerKW + 1e-9) best = candidate;
  }
  return best;
}

/** The rack clogs faster in a faster river. The automatic cleaner keeps it at or below AUTO_CLEAN_LEVEL. */
export function stepClog(clog: number, riverFlow: number, autoCleaner: boolean, dtS: number): number {
  const grown = Math.min(clog + (dtS / CLOG_TIME_S) * (Math.max(riverFlow, 0) / MEAN_FLOW), 1);
  return autoCleaner ? Math.min(grown, AUTO_CLEAN_LEVEL) : grown;
}

export interface Annual {
  monthsMWh: number[];
  totalMWh: number;
  /** Average output divided by installed power, 0 to 1. */
  capacityFactor: number;
}

/** A typical year: each month at its mean flow, with the rack at its average clog. */
export function annual(setup: PlantSetup): Annual {
  const clog = setup.autoCleaner ? AUTO_CLEAN_LEVEL : AVERAGE_CLOG_NO_CLEANER;
  const monthsMWh = MONTHLY_FLOW.map((flow, m) => (operate(setup, flow, clog).powerKW * DAYS_IN_MONTH[m]! * 24) / 1000);
  const totalMWh = monthsMWh.reduce((sum, v) => sum + v, 0);
  const installedKW = operate(setup, 0, 0).installedKW;
  return { monthsMWh, totalMWh, capacityFactor: installedKW > 0 ? (totalMWh * 1000) / (installedKW * HOURS_PER_YEAR) : 0 };
}

/** Power at evenly spaced river flows from 0 to `maxFlow`, for the chart. */
export function powerCurve(setup: PlantSetup, clog: number, maxFlow = RIVER_MAX, steps = 120): { flow: number; powerKW: number }[] {
  const out: { flow: number; powerKW: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const flow = (maxFlow * i) / steps;
    out.push({ flow, powerKW: operate(setup, flow, clog).powerKW });
  }
  return out;
}
