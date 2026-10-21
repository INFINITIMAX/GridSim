// Modelul fizic al rețelei cu un singur nod. TypeScript pur, determinist (fără Math.random/Date).
// Formulele și cifrele: docs/calcule.md.

import type { GridConfig } from "./config";
import { CATALOG } from "./units";
import type { LoadKind, SourceKind } from "./units";

export interface BatteryInit {
  capacityMWh: number;
  /** Starea de încărcare inițială, în [0, 1]. */
  soc: number;
  etaCharge?: number;
  etaDischarge?: number;
}

export interface BatteryState {
  capacityMWh: number;
  soc: number;
  etaCharge: number;
  etaDischarge: number;
}

export interface UnitInit {
  id: string;
  kind: SourceKind;
  pMax: number;
  setpoint: number;
  online?: boolean;
  fcrReserveMW?: number;
  afrrReserveMW?: number;
  /** Disponibilitatea (MW), folosită doar de solar și eolian. Implicit pMax. */
  availability?: number;
  /** Obligatoriu pentru kind = "battery". */
  battery?: BatteryInit;
}

export interface UnitState {
  id: string;
  kind: SourceKind;
  pMax: number;
  /** Ținta cerută de jucător (MW). */
  setpoint: number;
  /** Setpoint-ul după limitarea de viteză (MW). */
  setpointRamped: number;
  /** Puterea efectivă (MW). La baterie, p > 0 înseamnă descărcare. */
  p: number;
  online: boolean;
  availability: number;
  fcrReserveMW: number;
  afrrReserveMW: number;
  /** FCR livrat acum (MW, cu semn). */
  fcr: number;
  /** aFRR livrat acum (MW, cu semn). */
  afrr: number;
  battery: BatteryState | null;
}

export interface LoadInit {
  id: string;
  kind: LoadKind;
  mw: number;
}

export interface LoadState {
  id: string;
  kind: LoadKind;
  mw: number;
}

export type GridLogType = "unit-tripped" | "ufls" | "blackout";

export interface GridLogEntry {
  t: number;
  type: GridLogType;
  detail: string;
}

export type BlackoutReason = "no-synchronous-machines" | "under-frequency" | "over-frequency";

export interface Blackout {
  t: number;
  reason: BlackoutReason;
}

export interface GridState {
  /** Timpul simulat, secunde. */
  t: number;
  /** Frecvența, Hz. */
  f: number;
  units: UnitState[];
  loads: LoadState[];
  /** Treptele UFLS deja declanșate (în ordinea config.ufls). */
  uflsTripped: boolean[];
  /** Fracția cumulată din sarcină deconectată de UFLS. */
  shedFraction: number;
  /** Integrala regulatorului aFRR, MW. */
  afrrIntegralMW: number;
  blackout: Blackout | null;
  log: GridLogEntry[];
  // Mărimi derivate (pasul curent)
  rocof: number;
  pGen: number;
  /** Consumul efectiv (după UFLS și autoreglaj), MW. */
  pLoad: number;
  /** Sarcina deconectată de UFLS, MW. */
  pShed: number;
  hSys: number;
  sSys: number;
  fcrDeployed: number;
  afrrDeployed: number;
}

export type GridEvent =
  | { type: "tripUnit"; id: string }
  | { type: "addUnit"; unit: UnitInit }
  | { type: "removeUnit"; id: string }
  | { type: "setSetpoint"; id: string; mw: number }
  | { type: "addLoad"; load: LoadInit }
  | { type: "removeLoad"; id: string }
  | { type: "setLoad"; id: string; mw: number }
  | { type: "setAvailability"; id: string; mw: number }
  | { type: "restoreShedLoad" };

export interface StepInput {
  events: readonly GridEvent[];
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

function makeUnit(init: UnitInit, config: GridConfig): UnitState {
  let battery: BatteryState | null = null;
  if (init.kind === "battery") {
    if (!init.battery || !(init.battery.capacityMWh > 0)) {
      throw new Error(`Unitatea ${init.id}: bateria cere battery.capacityMWh > 0`);
    }
    battery = {
      capacityMWh: init.battery.capacityMWh,
      soc: clamp(init.battery.soc, 0, 1),
      etaCharge: init.battery.etaCharge ?? config.batteryDefaultEta,
      etaDischarge: init.battery.etaDischarge ?? config.batteryDefaultEta,
    };
  }
  const lo = init.kind === "battery" ? -init.pMax : CATALOG[init.kind].minLoad * init.pMax;
  const setpoint = clamp(init.setpoint, Math.min(lo, 0), init.pMax);
  const online = init.online ?? true;
  const availability = init.availability ?? init.pMax;
  const unit: UnitState = {
    id: init.id,
    kind: init.kind,
    pMax: init.pMax,
    setpoint,
    setpointRamped: setpoint,
    p: 0,
    online,
    availability,
    fcrReserveMW: init.fcrReserveMW ?? 0,
    afrrReserveMW: init.afrrReserveMW ?? 0,
    fcr: 0,
    afrr: 0,
    battery,
  };
  if (online) {
    unit.p = clampBySoc(battery, clampUnitPower(unit, setpoint), config.dt);
  }
  return unit;
}

function isVariableRenewable(kind: SourceKind): boolean {
  return kind === "solar" || kind === "wind";
}

/** Limitele statice de putere: [minLoad·pMax, pMax]; baterie [-pMax, pMax]; solar/eolian cu disponibilitatea. */
function clampUnitPower(u: UnitState, p: number): number {
  const lo = u.kind === "battery" ? -u.pMax : CATALOG[u.kind].minLoad * u.pMax;
  let out = clamp(p, lo, u.pMax);
  if (isVariableRenewable(u.kind)) {
    out = Math.min(out, Math.max(u.availability, 0));
  }
  return out;
}

/** Taie p după energia disponibilă în baterie (descărcare/încărcare într-un pas). Fără baterie, p rămâne neschimbat. */
function clampBySoc(b: BatteryState | null, p: number, dt: number): number {
  if (!b) {
    return p;
  }
  const maxDischarge = (b.soc * b.capacityMWh * 3600 * b.etaDischarge) / dt;
  const maxCharge = ((1 - b.soc) * b.capacityMWh * 3600) / (b.etaCharge * dt);
  return clamp(p, -maxCharge, maxDischarge);
}

export function createGrid(config: GridConfig, units: UnitInit[], loads: LoadInit[]): GridState {
  const state: GridState = {
    t: 0,
    f: config.f0,
    units: [],
    loads: [],
    uflsTripped: config.ufls.map(() => false),
    shedFraction: 0,
    afrrIntegralMW: 0,
    blackout: null,
    log: [],
    rocof: 0,
    pGen: 0,
    pLoad: 0,
    pShed: 0,
    hSys: 0,
    sSys: 0,
    fcrDeployed: 0,
    afrrDeployed: 0,
  };
  for (const u of units) {
    addUnit(state, u, config);
  }
  for (const l of loads) {
    addLoad(state, l);
  }
  refreshDerived(state, config);
  return state;
}

function addUnit(state: GridState, init: UnitInit, config: GridConfig): void {
  if (state.units.some((u) => u.id === init.id)) {
    throw new Error(`Unitate duplicată: ${init.id}`);
  }
  state.units.push(makeUnit(init, config));
}

function addLoad(state: GridState, init: LoadInit): void {
  if (state.loads.some((l) => l.id === init.id)) {
    throw new Error(`Consumator duplicat: ${init.id}`);
  }
  state.loads.push({ id: init.id, kind: init.kind, mw: init.mw });
}

function findUnit(state: GridState, id: string): UnitState | undefined {
  return state.units.find((u) => u.id === id);
}

function totalLoadMW(state: GridState): number {
  let sum = 0;
  for (const l of state.loads) {
    sum += l.mw;
  }
  return sum;
}

function disconnect(state: GridState, u: UnitState, why: string): void {
  u.online = false;
  u.p = 0;
  u.fcr = 0;
  u.afrr = 0;
  state.log.push({ t: state.t, type: "unit-tripped", detail: `${u.id}: ${why}` });
}

function applyEvent(state: GridState, config: GridConfig, ev: GridEvent): void {
  switch (ev.type) {
    case "tripUnit": {
      const u = findUnit(state, ev.id);
      if (u && u.online) {
        disconnect(state, u, "deconectată");
      }
      break;
    }
    case "addUnit":
      addUnit(state, ev.unit, config);
      break;
    case "removeUnit":
      state.units = state.units.filter((u) => u.id !== ev.id);
      break;
    case "setSetpoint": {
      const u = findUnit(state, ev.id);
      if (u) {
        if (u.online) {
          // Online: [minLoad·pMax, pMax]; solar și eolian au minLoad = 0; bateria [-pMax, pMax].
          const lo = u.kind === "battery" ? -u.pMax : CATALOG[u.kind].minLoad * u.pMax;
          u.setpoint = clamp(ev.mw, lo, u.pMax);
          u.setpointRamped = clamp(u.setpointRamped, lo, u.pMax);
        } else {
          // Offline: setpoint-ul nu are efect; rămâne [0, pMax] (baterie [-pMax, pMax]).
          const lo = u.kind === "battery" ? -u.pMax : 0;
          u.setpoint = clamp(ev.mw, lo, u.pMax);
        }
      }
      break;
    }
    case "addLoad":
      addLoad(state, ev.load);
      break;
    case "removeLoad":
      state.loads = state.loads.filter((l) => l.id !== ev.id);
      break;
    case "setLoad": {
      const l = state.loads.find((x) => x.id === ev.id);
      if (l) {
        l.mw = Math.max(ev.mw, 0);
      }
      break;
    }
    case "setAvailability": {
      const u = findUnit(state, ev.id);
      if (u) {
        u.availability = Math.max(ev.mw, 0);
      }
      break;
    }
    case "restoreShedLoad":
      state.shedFraction = 0;
      state.uflsTripped = state.uflsTripped.map(() => false);
      break;
  }
}

/** Regulatorul aFRR comun (PI pe Δf), împărțit proporțional cu rezerva fiecărei unități. */
function updateAfrr(state: GridState, config: GridConfig, totalLoad: number): void {
  const { kp, ki, trackingTimeS } = config.afrr;
  const dt = config.dt;
  let reserve = 0;
  let delivered = 0;
  for (const u of state.units) {
    if (u.online) {
      reserve += u.afrrReserveMW;
      delivered += u.afrr;
    }
  }
  const e = config.f0 - state.f; // pozitiv când frecvența e sub nominal
  const raw = totalLoad * kp * e + state.afrrIntegralMW;
  const command = clamp(raw, -reserve, reserve);

  for (const u of state.units) {
    if (!u.online || u.afrrReserveMW <= 0 || reserve <= 0) {
      u.afrr = 0;
      continue;
    }
    const target = (command * u.afrrReserveMW) / reserve;
    const maxStep = ((CATALOG[u.kind].rampPerMin * u.pMax) / 60) * dt;
    u.afrr = clamp(
      u.afrr + clamp(target - u.afrr, -maxStep, maxStep),
      -u.afrrReserveMW,
      u.afrrReserveMW,
    );
  }

  // Anti-windup prin back-calculation: integratorul urmărește ce s-a livrat efectiv
  // (saturarea rezervei, rampa unităților, limitele de putere/SOC). `delivered` e valoarea
  // din pasul anterior, deja redusă la ce a livrat efectiv unitatea; decalajul de un pas
  // e intenționat (măsurăm livrarea reală, nu ținta rampată) și inofensiv față de dt.
  state.afrrIntegralMW += (ki * totalLoad * e + (delivered - raw) / trackingTimeS) * dt;
}

function updateUnit(u: UnitState, config: GridConfig, f: number): void {
  const dt = config.dt;
  if (!u.online) {
    u.p = 0;
    return;
  }
  const spec = CATALOG[u.kind];

  // Setpoint cu limitare de viteză
  const maxRamp = ((spec.rampPerMin * u.pMax) / 60) * dt;
  u.setpointRamped += clamp(u.setpoint - u.setpointRamped, -maxRamp, maxRamp);

  // FCR (SO GL, Anexa V): bandă moartă, proporțional până la ±fcrFullDeviationHz,
  // livrare limitată la rezervă / fcrFullTimeS pe secundă.
  if (u.fcrReserveMW > 0) {
    const dev = f - config.f0;
    let devEff = 0;
    if (dev > config.fcrDeadbandHz) {
      devEff = dev - config.fcrDeadbandHz;
    } else if (dev < -config.fcrDeadbandHz) {
      devEff = dev + config.fcrDeadbandHz;
    }
    const target = -clamp(devEff / config.fcrFullDeviationHz, -1, 1) * u.fcrReserveMW;
    const maxFcrStep = (u.fcrReserveMW / (spec.fcrFullTimeS ?? config.fcrFullTimeS)) * dt;
    u.fcr += clamp(target - u.fcr, -maxFcrStep, maxFcrStep);
  } else {
    u.fcr = 0;
  }

  const b = u.battery;
  const raw = u.setpointRamped + u.fcr + u.afrr;
  const p = clampBySoc(b, clampUnitPower(u, raw), dt);

  // Când puterea e limitată (pMax, minLoad, disponibilitate, SOC), se taie doar componentele care
  // împing spre limita depășită: la limita de sus cele pozitive, la limita de jos cele negative.
  // Ordinea: întâi aFRR, apoi FCR (FCR are prioritate). O componentă cu sens opus limitei nu se
  // taie și nu se resetează (altfel apare un ciclu limită). Valorile raportate nu sunt optimiste,
  // iar FCR nu se acumulează dincolo de ce poate livra (fără windup).
  if (p < raw) {
    let excess = raw - p;
    const cutAfrr = Math.min(Math.max(u.afrr, 0), excess);
    u.afrr -= cutAfrr;
    excess -= cutAfrr;
    u.fcr -= Math.min(Math.max(u.fcr, 0), excess);
  } else if (p > raw) {
    let excess = p - raw;
    const cutAfrr = Math.min(Math.max(-u.afrr, 0), excess);
    u.afrr += cutAfrr;
    excess -= cutAfrr;
    u.fcr += Math.min(Math.max(-u.fcr, 0), excess);
  }

  // Baterie: SOC rămâne în [0, 1]; la limită p s-a tăiat mai sus.
  if (b) {
    if (p >= 0) {
      b.soc -= (p * dt) / 3600 / (b.capacityMWh * b.etaDischarge);
    } else {
      b.soc += (-p * dt * b.etaCharge) / 3600 / b.capacityMWh;
    }
    b.soc = clamp(b.soc, 0, 1);
  }
  u.p = p;
}

function refreshDerived(state: GridState, config: GridConfig): void {
  let sSys = 0;
  let hs = 0;
  let pGen = 0;
  let fcr = 0;
  let afrr = 0;
  for (const u of state.units) {
    if (!u.online) {
      continue;
    }
    pGen += u.p;
    fcr += u.fcr;
    afrr += u.afrr;
    const spec = CATALOG[u.kind];
    if (spec.synchronous) {
      sSys += u.pMax;
      hs += spec.inertiaH * u.pMax;
    }
  }
  const total = totalLoadMW(state);
  state.pGen = pGen;
  state.sSys = sSys;
  state.hSys = sSys > 0 ? hs / sSys : 0;
  state.fcrDeployed = fcr;
  state.afrrDeployed = afrr;
  state.pShed = total * state.shedFraction;
  state.pLoad = (total - state.pShed) * (1 + config.loadDampingPerHz * (state.f - config.f0));
}

function declareBlackout(state: GridState, reason: BlackoutReason): void {
  state.blackout = { t: state.t, reason };
  state.log.push({ t: state.t, type: "blackout", detail: reason });
}

/** Un pas de config.dt. Mută starea pe loc și o returnează. După blackout nu mai schimbă nimic. */
export function step(state: GridState, config: GridConfig, input?: StepInput): GridState {
  if (state.blackout) {
    return state;
  }
  if (input) {
    for (const ev of input.events) {
      applyEvent(state, config, ev);
    }
  }
  const dt = config.dt;
  const f = state.f;
  const total = totalLoadMW(state);

  updateAfrr(state, config, total);
  for (const u of state.units) {
    updateUnit(u, config, f);
  }
  refreshDerived(state, config);
  state.t += dt;

  // Fără mașini sincrone, frecvența nu mai e definită în model (invertoare grid-following).
  if (state.sSys <= 0) {
    state.rocof = 0;
    declareBlackout(state, "no-synchronous-machines");
    return state;
  }

  // Swing equation agregată, Euler explicit (calcule.md, T1)
  state.rocof = (config.f0 * (state.pGen - state.pLoad)) / (2 * state.hSys * state.sSys);
  state.f = f + state.rocof * dt;

  // UFLS: treptele se declanșează cu latch; fracția cumulată se aplică de pasul următor.
  config.ufls.forEach((stage, i) => {
    if (!state.uflsTripped[i] && state.f <= stage.hz) {
      state.uflsTripped[i] = true;
      state.shedFraction = Math.max(state.shedFraction, stage.cumulativeFraction);
      state.log.push({
        t: state.t,
        type: "ufls",
        detail: `treapta ${i + 1} la ${stage.hz.toFixed(1)} Hz, ${(stage.cumulativeFraction * 100).toFixed(0)}% cumulat`,
      });
    }
  });
  state.pShed = total * state.shedFraction;

  // Deconectarea generatoarelor (RfG, art. 13): cascadă simplificată, apoi blackout
  const reason: BlackoutReason | null =
    state.f < config.genTripLowHz
      ? "under-frequency"
      : state.f > config.genTripHighHz
        ? "over-frequency"
        : null;
  if (reason) {
    for (const u of state.units) {
      if (u.online && CATALOG[u.kind].synchronous) {
        disconnect(state, u, reason);
      }
    }
    declareBlackout(state, reason);
    refreshDerived(state, config);
  }
  return state;
}
