// GridSim 2D, the numbers and the words behind the panel. Pure functions, no DOM.

import {
  CANAL_EXTRA_HEAD,
  CANAL_HEAD_LOSS,
  CLOG_TIME_S,
  ECO_FLOW,
  FLOOD_SHUTDOWN_FLOW,
  GENERATOR_EFFICIENCY,
  RACK_MAX_LOSS,
  TRANSFORMER_LOSS,
  sizeById,
  type Operation,
  type PlantSetup,
  type StopReason,
} from "./hydro";

export interface Breakdown {
  /** m³/s; used = river − eco − spilled. */
  water: { river: number; eco: number; spilled: number; used: number };
  /** m; net = gross − canal − rack. */
  head: { gross: number; canal: number; rack: number; net: number };
  turbine: { running: number; flowEach: number; designFlow: number; load: number; efficiency: number };
  /** Generator efficiency and the share the transformer lets through (1 − TRANSFORMER_LOSS). */
  chain: { generator: number; transformerKeep: number };
  turbineKW: number;
  powerKW: number;
  stopReason: StopReason | null;
}

/** The figures of one operating point, as already worked out by `operate`. Nothing is recomputed here. */
export function breakdown(setup: PlantSetup, riverFlow: number, op: Operation): Breakdown {
  return {
    water: { river: Math.max(riverFlow, 0), eco: op.ecoFlow, spilled: op.spilledFlow, used: op.usedFlow },
    head: { gross: op.grossHead, canal: op.canalLossM, rack: op.rackLossM, net: op.netHead },
    turbine: {
      running: op.running,
      flowEach: op.flowPerTurbine,
      designFlow: sizeById(setup.size).designFlow,
      load: op.load,
      efficiency: op.efficiency,
    },
    chain: { generator: GENERATOR_EFFICIENCY, transformerKeep: 1 - TRANSFORMER_LOSS },
    turbineKW: op.turbineKW,
    powerKW: op.powerKW,
    stopReason: op.stopReason,
  };
}

export type SectionId = "dam" | "canal" | "turbines" | "rack" | "gates" | "fish" | "river" | "water" | "year" | "curve";

const rackPercent = Math.round(RACK_MAX_LOSS * 100);
const clogMinutes = CLOG_TIME_S / 60;

/** Paragraphs are separated by a blank line. A paragraph starting with "Simplified:" says what the game simplifies. */
export const SECTION_INFO: Record<SectionId, string> = {
  dam: "The dam raises the water. Head is the height the water falls, and power grows in direct proportion to it: twice the head, twice the power. A higher dam floods more land upstream.",
  canal: `A canal carries water along the valley at a gentle slope while the river drops faster, so at the powerhouse the water stands higher: ${CANAL_EXTRA_HEAD} m of extra head without flooding land. Friction in the canal costs part of it.\n\nSimplified: the friction loss is fixed at ${CANAL_HEAD_LOSS} m. In reality it grows with the square of the flow.`,
  turbines:
    "The turbine turns falling water into rotation, and the generator turns rotation into electricity. Turbine efficiency depends on the type, the head, the size and how full it runs. The curves follow the RETScreen formulas (Natural Resources Canada). Kaplan suits low head, Francis high head, Crossflow keeps going best when water is short. With little water the operator runs fewer turbines, each one fuller, because a half-empty turbine wastes more.",
  rack: `Bars in front of the intake stop leaves and branches. As debris builds up, the water loses head squeezing through, up to ${rackPercent}% when fully clogged.\n\nSimplified: the ${rackPercent}% and the clogging speed (${clogMinutes} minutes at average flow) are chosen for the game, not measured.`,
  gates: `Gates let a flood pass over the dam under control. Without them the plant shuts down above ${FLOOD_SHUTDOWN_FLOW} m³/s to protect the turbines.\n\nSimplified: in a real flood the water below the plant rises and the head shrinks. The fixed ${FLOOD_SHUTDOWN_FLOW} m³/s limit is a game rule.`,
  fish: `The law requires some water to always stay in the river below the dam, for fish and for the river itself (Romanian Water Law 107/1996). Here it is ${ECO_FLOW.toFixed(1)} m³/s, 10% of the average flow.\n\nSimplified: the real amount is set for each river by the water authority. 10% is our assumption.`,
  river:
    "How much water the river brings, in cubic metres per second. It changes with the seasons: snowmelt in spring, low water in late summer and autumn.",
  water:
    "Where the river goes: through the turbines, over the dam when the turbines are full, or down the fish ladder. The three always add up to the river flow.",
  year: "Energy over a typical year, each month at its average flow. Installed power is what the plant could give flat out. The capacity factor shows how much of that it actually delivers over the year.\n\nSimplified: the monthly flows describe an example mountain river, not a measured one, and real studies use daily flows.",
  curve:
    "Power for every river flow with the current setup. The dot is where the river is now. The curve flattens when the turbines are full and drops to zero where the plant has to stop.",
};
