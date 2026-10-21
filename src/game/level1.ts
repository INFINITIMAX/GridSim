// Datele nivelului 1, „Keep the lights on” (docs/level1.md). Doar date, fără logică.
// Cifrele sunt valori de joc, calibrate în docs/level1.md.

import { ISLAND_CONFIG } from "../model";
import type { GridConfig, GridEvent, LoadInit, SourceKind, UnitInit } from "../model";

export type ScriptAction =
  | { type: "model"; event: GridEvent }
  /** Setează disponibilitatea tuturor unităților de un tip la `fraction` · pMax (apus de soare). */
  | { type: "setAvailabilityByKind"; unitKind: SourceKind; fraction: number };

export interface ScriptedEvent {
  /** Timpul simulat, în secunde de la începutul zilei. */
  t: number;
  action?: ScriptAction;
  /** Mesaj narativ scurt, în engleză. */
  message?: string;
}

export interface StarRules {
  /** ★★★: maxShedFraction <= acest prag și nadir >= minNadirHz. */
  three: { maxShedFraction: number; minNadirHz: number };
  /** ★★: maxShedFraction <= acest prag. */
  two: { maxShedFraction: number };
  /** ★: fără blackout. 0 stele: blackout. */
}

export interface LevelData {
  config: GridConfig;
  units: readonly UnitInit[];
  loads: readonly LoadInit[];
  /** Bugetul din faza de pregătire, în puncte. */
  budget: number;
  /** Durata zilei, secunde simulate. */
  durationS: number;
  introMessage: string;
  startMessage: string;
  script: readonly ScriptedEvent[];
  stars: StarRules;
}

export const LEVEL1: LevelData = {
  config: ISLAND_CONFIG,
  units: [
    { id: "hydro", kind: "hydro", pMax: 900, setpoint: 420, fcrReserveMW: 100, afrrReserveMW: 100 },
    { id: "gas", kind: "ccgt", pMax: 200, setpoint: 150, fcrReserveMW: 25, afrrReserveMW: 25 },
  ],
  loads: [{ id: "town", kind: "homes", mw: 570 }],
  budget: 100,
  durationS: 120,
  introMessage:
    "A storm is forecast for tomorrow evening and the old gas plant may trip. Spend your budget wisely, then start the day.",
  startMessage: "The day begins. Keep the lights on.",
  script: [
    {
      t: 10,
      action: { type: "model", event: { type: "addLoad", load: { id: "factory", kind: "factory", mw: 40 } } },
      message: "A factory just switched on: +40 MW of demand.",
    },
    {
      t: 50,
      action: { type: "model", event: { type: "tripUnit", id: "gas" } },
      message: "The old gas plant tripped offline: -150 MW in an instant!",
    },
    { t: 80, action: { type: "setAvailabilityByKind", unitKind: "solar", fraction: 0.8 }, message: "Sunset: solar output is fading." },
    { t: 85, action: { type: "setAvailabilityByKind", unitKind: "solar", fraction: 0.6 } },
    { t: 90, action: { type: "setAvailabilityByKind", unitKind: "solar", fraction: 0.4 } },
    { t: 95, action: { type: "setAvailabilityByKind", unitKind: "solar", fraction: 0.2 } },
    { t: 100, action: { type: "setAvailabilityByKind", unitKind: "solar", fraction: 0 } },
  ],
  stars: {
    three: { maxShedFraction: 0, minNadirHz: 49.2 },
    two: { maxShedFraction: 0.05 },
  },
};
