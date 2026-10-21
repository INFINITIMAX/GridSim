// Catalogul de construcții și de consumatori ai jucătorului. TypeScript pur.
// Toate valorile de aici (mărime, cost, setpoint inițial, rezerve) sunt VALORI DE JOC,
// din docs/level1.md; nu au sursă primară. Fizica (inerție, viteze, timpi de pornire) vine din CATALOG.

import { CATALOG, LOAD_CATALOG } from "../model";
import type { LoadInit, LoadKind, SourceKind, UnitInit } from "../model";

export type BuildKind = "battery" | "ocgt" | "hydro" | "solar" | "wind";

export interface BuildSpec {
  kind: BuildKind;
  /** Mărimea (pMax), MW. Valoare de joc. */
  pMaxMW: number;
  /** Costul în puncte de buget. Valoare de joc. */
  cost: number;
  /** Setpoint-ul inițial, MW. Valoare de joc. */
  setpointMW: number;
  /** Rezerva FCR, MW. Valoare de joc. */
  fcrReserveMW: number;
  /** Rezerva aFRR, MW. Valoare de joc. */
  afrrReserveMW: number;
  /** Capacitatea bateriei, MWh (doar pentru baterie). Valoare de joc. */
  capacityMWh?: number;
  /** Starea de încărcare inițială a bateriei, în [0, 1]. Valoare de joc. */
  initialSoc?: number;
}

/** Valori de joc, docs/level1.md, tabelul „Construcții”. */
export const BUILDS: Record<BuildKind, BuildSpec> = {
  battery: {
    kind: "battery",
    pMaxMW: 100,
    cost: 40,
    setpointMW: 0,
    fcrReserveMW: 100,
    afrrReserveMW: 0,
    capacityMWh: 200,
    initialSoc: 0.5,
  },
  ocgt: {
    kind: "ocgt",
    pMaxMW: 100,
    cost: 30,
    setpointMW: 60,
    fcrReserveMW: 20,
    afrrReserveMW: 0,
  },
  hydro: {
    kind: "hydro",
    pMaxMW: 100,
    cost: 35,
    setpointMW: 50,
    fcrReserveMW: 20,
    afrrReserveMW: 0,
  },
  solar: {
    kind: "solar",
    pMaxMW: 80,
    cost: 15,
    setpointMW: 80,
    fcrReserveMW: 0,
    afrrReserveMW: 0,
  },
  wind: {
    kind: "wind",
    pMaxMW: 60,
    cost: 15,
    setpointMW: 60,
    fcrReserveMW: 0,
    afrrReserveMW: 0,
  },
};

/** Consumatorii pe care jucătorul îi poate adăuga în sandbox (MW din LOAD_CATALOG). */
export const CONSUMER_KINDS: readonly LoadKind[] = ["homes", "factory", "datacenter", "ev"];

/** Timpul de pornire al unei construcții, în secunde (din CATALOG). */
export function buildStartSeconds(kind: BuildKind): number {
  const sourceKind: SourceKind = kind;
  return CATALOG[sourceKind].startMinutes * 60;
}

/** Transformă o construcție într-un `UnitInit` pornit, cu id-ul dat. */
export function buildUnitInit(kind: BuildKind, id: string): UnitInit {
  const spec = BUILDS[kind];
  const init: UnitInit = {
    id,
    kind,
    pMax: spec.pMaxMW,
    setpoint: spec.setpointMW,
    fcrReserveMW: spec.fcrReserveMW,
    afrrReserveMW: spec.afrrReserveMW,
  };
  if (spec.capacityMWh !== undefined) {
    init.battery = { capacityMWh: spec.capacityMWh, soc: spec.initialSoc ?? 0.5 };
  }
  return init;
}

/** Transformă un consumator într-un `LoadInit`, cu id-ul dat. */
export function consumerInit(kind: LoadKind, id: string): LoadInit {
  return { id, kind, mw: LOAD_CATALOG[kind].typicalMW };
}
