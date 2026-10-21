// Sesiunea de joc: stări, acumulator cu pas fix, acțiuni validate, măsurători, rezultat, snapshot.
// TypeScript pur: fără three, DOM, Math.random sau ceas. Timpul vine doar prin advance().

import { CATALOG, LOAD_CATALOG, createGrid, step } from "../model";
import type {
  Blackout,
  BlackoutReason,
  GridEvent,
  GridLogEntry,
  GridState,
  LoadInit,
  LoadKind,
  SourceKind,
  UnitInit,
} from "../model";
import { BUILDS, buildStartSeconds, buildUnitInit, consumerInit } from "./builds";
import type { BuildKind } from "./builds";
import { LEVEL1 } from "./level1";
import type { ScriptAction } from "./level1";

export type GameMode = "level1" | "sandbox";
export type GameState = "prepare" | "running" | "won" | "lost";
export type Speed = 1 | 2 | 4;
export type ActionResult = { ok: true } | { ok: false; reason: string };

/** Plafon de pași pe apel de advance (20 s simulate la dt = 50 ms). */
const MAX_STEPS_PER_ADVANCE = 400;
const EPS = 1e-9;
/** Câte intrări din jurnalul rețelei expune snapshot() (cele mai recente), ca să nu crească costul pe cadru. */
export const SNAPSHOT_LOG_ENTRIES = 50;

export interface NarrativeMessage {
  /** Timpul simulat al mesajului, secunde. */
  t: number;
  text: string;
}

export interface Measurements {
  /** Cea mai mică frecvență atinsă, Hz. */
  nadirHz: number;
  /** Cea mai mare fracție din sarcină deconectată vreodată de UFLS. */
  maxShedFraction: number;
  /** Timpul simulat scurs din ziua de joc, secunde. */
  elapsedS: number;
  /** Numărul maxim de trepte UFLS declanșate simultan. */
  maxUflsStages: number;
}

export interface GameResult {
  stars: 0 | 1 | 2 | 3;
  /** Explicație scurtă, în engleză. */
  reason: string;
  nadirHz: number;
  maxShedFraction: number;
}

export interface UnitView {
  readonly id: string;
  readonly kind: SourceKind;
  readonly p: number;
  readonly pMax: number;
  readonly online: boolean;
  readonly fcr: number;
  readonly afrr: number;
  /** Starea de încărcare (doar baterii), altfel null. */
  readonly soc: number | null;
}

export interface ConsumerView {
  readonly id: string;
  readonly kind: LoadKind;
  readonly mw: number;
  /** Partea deconectată de UFLS, MW. */
  readonly shedMW: number;
  /** Partea deconectată de UFLS, fracție. */
  readonly shedFraction: number;
}

export interface PendingBuildView {
  readonly id: string;
  readonly kind: BuildKind;
  /** Secunde simulate până la pornire (doar sandbox). */
  readonly remainingS: number;
}

export interface Snapshot {
  readonly mode: GameMode;
  readonly state: GameState;
  readonly speed: Speed;
  /** Timpul simulat, secunde. */
  readonly t: number;
  readonly f: number;
  readonly rocof: number;
  readonly pGen: number;
  readonly pLoad: number;
  readonly pShed: number;
  readonly shedFraction: number;
  /** Treptele UFLS declanșate acum (în ordinea config.ufls). */
  readonly uflsStages: readonly boolean[];
  readonly units: readonly UnitView[];
  readonly consumers: readonly ConsumerView[];
  readonly pendingBuilds: readonly PendingBuildView[];
  /** Bugetul rămas; null în sandbox. */
  readonly budget: number | null;
  readonly blackout: Readonly<Blackout> | null;
  readonly measurements: Readonly<Measurements>;
  /** Mesajele narative apărute de la ultimul snapshot() (apelul le consumă). */
  readonly newMessages: readonly NarrativeMessage[];
  /** Ultimele SNAPSHOT_LOG_ENTRIES intrări din jurnalul rețelei, în ordine cronologică. */
  readonly log: readonly Readonly<GridLogEntry>[];
}

export interface Session {
  advance(realDtSeconds: number): void;
  start(): ActionResult;
  build(kind: BuildKind): ActionResult;
  demolish(id: string): ActionResult;
  addConsumer(kind: LoadKind): ActionResult;
  removeConsumer(id: string): ActionResult;
  restoreLoad(): ActionResult;
  /** Declanșează unitatea (incident provocat); aplicat la pasul următor. */
  tripUnit(id: string): ActionResult;
  setSpeed(speed: Speed): ActionResult;
  /** Rezultatul final; null cât timp jocul nu s-a terminat (și mereu în sandbox). */
  result(): GameResult | null;
  snapshot(): Snapshot;
}

interface BuiltUnit {
  id: string;
  cost: number;
  init: UnitInit;
}

interface PendingBuild {
  id: string;
  kind: BuildKind;
  readyAt: number;
  init: UnitInit;
}

const BLACKOUT_TEXT: Record<BlackoutReason, string> = {
  "under-frequency": "the frequency fell below the generator protection limit",
  "over-frequency": "the frequency rose above the generator protection limit",
  "no-synchronous-machines": "no spinning machines were left to hold the frequency",
};

function refuse(reason: string): ActionResult {
  return { ok: false, reason };
}

/** Vedere minimă a unei unități, pentru echilibrare (se potrivește cu UnitState). */
interface DispatchView {
  id: string;
  kind: SourceKind;
  pMax: number;
  setpoint: number;
  availability: number;
  online: boolean;
}

const DISPATCH_RANK: Partial<Record<SourceKind, number>> = { hydro: 0, ccgt: 1, ocgt: 2 };
const BALANCE_TOLERANCE_MW = 1e-6;

/**
 * Reechilibrare: producția programată (setpoint-uri; solar/eolian cât au disponibil) devine egală
 * cu consumul, reducând doar surplusul. Ordinea: hidro (cea mai mare întâi), apoi gaz CCGT, apoi
 * OCGT; fiecare până la minimul tehnic. Întoarce setpoint-urile noi și surplusul rămas neabsorbit.
 */
function rebalance(
  units: readonly DispatchView[],
  loadMW: number,
): { changes: { id: string; mw: number }[]; residualMW: number } {
  let scheduled = 0;
  for (const u of units) {
    if (!u.online) {
      continue;
    }
    const renewable = u.kind === "solar" || u.kind === "wind";
    scheduled += renewable ? Math.min(u.setpoint, Math.max(u.availability, 0)) : u.setpoint;
  }
  let surplus = scheduled - loadMW;
  const changes: { id: string; mw: number }[] = [];
  if (surplus <= BALANCE_TOLERANCE_MW) {
    return { changes, residualMW: 0 };
  }
  const dispatchable = units
    .filter((u) => u.online && DISPATCH_RANK[u.kind] !== undefined)
    .sort((a, b) => (DISPATCH_RANK[a.kind] ?? 0) - (DISPATCH_RANK[b.kind] ?? 0) || b.pMax - a.pMax);
  for (const u of dispatchable) {
    const room = u.setpoint - CATALOG[u.kind].minLoad * u.pMax;
    const cut = Math.min(Math.max(room, 0), surplus);
    if (cut > 0) {
      changes.push({ id: u.id, mw: u.setpoint - cut });
      surplus -= cut;
    }
    if (surplus <= BALANCE_TOLERANCE_MW) {
      surplus = 0;
      break;
    }
  }
  return { changes, residualMW: surplus };
}

export function createSession(mode: GameMode): Session {
  const level = LEVEL1;
  const config = level.config;
  const isLevel = mode === "level1";

  let state: GameState = isLevel ? "prepare" : "running";
  let speed: Speed = 1;
  let accumulator = 0;
  let scriptIndex = 0;
  let spent = 0;
  const built: BuiltUnit[] = [];
  let pending: PendingBuild[] = [];
  const queue: GridEvent[] = [];
  const idCounters = new Map<string, number>();
  let unreadMessages: NarrativeMessage[] = isLevel ? [{ t: 0, text: level.introMessage }] : [];

  function nextId(kind: string): string {
    const n = (idCounters.get(kind) ?? 0) + 1;
    idCounters.set(kind, n);
    return `${kind}-${n}`;
  }

  function makeGrid(setpointOverrides?: ReadonlyMap<string, number>): GridState {
    const loads: LoadInit[] = level.loads.map((l) => ({ ...l }));
    const units: UnitInit[] = [...level.units, ...built.map((b) => b.init)].map((u) => ({
      ...u,
      setpoint: setpointOverrides?.get(u.id) ?? u.setpoint,
    }));
    return createGrid(config, units, loads);
  }

  function totalLoadMW(): number {
    return grid.loads.reduce((sum, l) => sum + l.mw, 0);
  }

  let grid = makeGrid();
  let nadirHz = grid.f;
  let maxShedFraction = 0;
  let maxUflsStages = 0;

  function remainingBudget(): number {
    return level.budget - spent;
  }

  function resolveAction(action: ScriptAction): GridEvent[] {
    if (action.type === "model") {
      return [action.event];
    }
    return grid.units
      .filter((u) => u.kind === action.unitKind)
      .map((u): GridEvent => ({ type: "setAvailability", id: u.id, mw: action.fraction * u.pMax }));
  }

  function stepOnce(): void {
    const events: GridEvent[] = queue.splice(0);

    while (scriptIndex < level.script.length && isLevel) {
      const scripted = level.script[scriptIndex];
      if (!scripted || scripted.t > grid.t + EPS) {
        break;
      }
      scriptIndex += 1;
      if (scripted.action) {
        events.push(...resolveAction(scripted.action));
      }
      if (scripted.message) {
        unreadMessages.push({ t: scripted.t, text: scripted.message });
      }
    }

    const ready = pending.filter((p) => p.readyAt <= grid.t + EPS);
    if (ready.length > 0) {
      pending = pending.filter((p) => p.readyAt > grid.t + EPS);
      for (const p of ready) {
        events.push({ type: "addUnit", unit: p.init });
      }
    }

    // O construcție intră online: reechilibrăm setpoint-urile (după addUnit, în aceeași ordine de aplicare).
    const added: DispatchView[] = [];
    for (const ev of events) {
      if (ev.type === "addUnit") {
        added.push({
          id: ev.unit.id,
          kind: ev.unit.kind,
          pMax: ev.unit.pMax,
          setpoint: ev.unit.setpoint,
          availability: ev.unit.availability ?? ev.unit.pMax,
          online: ev.unit.online ?? true,
        });
      }
    }
    if (added.length > 0) {
      const { changes } = rebalance([...grid.units, ...added], totalLoadMW());
      for (const c of changes) {
        events.push({ type: "setSetpoint", id: c.id, mw: c.mw });
      }
    }

    step(grid, config, { events });

    nadirHz = Math.min(nadirHz, grid.f);
    maxShedFraction = Math.max(maxShedFraction, grid.shedFraction);
    maxUflsStages = Math.max(maxUflsStages,grid.uflsTripped.filter(Boolean).length);

    if (isLevel) {
      if (grid.blackout) {
        state = "lost";
      } else if (grid.t >= level.durationS - EPS) {
        state = "won";
      }
    }
  }

  function advance(realDtSeconds: number): void {
    if (state !== "running" || !(realDtSeconds > 0)) {
      return;
    }
    accumulator += realDtSeconds * speed;
    let steps = 0;
    while (accumulator >= config.dt - EPS && steps < MAX_STEPS_PER_ADVANCE && state === "running") {
      stepOnce();
      accumulator -= config.dt;
      steps += 1;
    }
    // Plafon atins: aruncăm restul, ca un tab revenit din fundal să nu blocheze.
    if (accumulator >= config.dt - EPS) {
      accumulator = 0;
    }
  }

  function start(): ActionResult {
    if (state !== "prepare") {
      return refuse("The day has already started.");
    }
    const { changes, residualMW } = rebalance(grid.units, totalLoadMW());
    if (residualMW > BALANCE_TOLERANCE_MW) {
      return refuse("Too much uncontrollable generation for this island: remove some solar or wind.");
    }
    grid = makeGrid(new Map(changes.map((c) => [c.id, c.mw])));
    state = "running";
    nadirHz = grid.f;
    unreadMessages.push({ t: 0, text: level.startMessage });
    return { ok: true };
  }

  function build(kind: BuildKind): ActionResult {
    const spec = BUILDS[kind] as (typeof BUILDS)[BuildKind] | undefined;
    if (!spec) {
      return refuse("Unknown building.");
    }
    if (state === "prepare") {
      if (spec.cost > remainingBudget()) {
        return refuse(
          `Not enough budget: ${CATALOG[kind].label} costs ${spec.cost}, you have ${remainingBudget()} left.`,
        );
      }
      const id = nextId(kind);
      built.push({ id, cost: spec.cost, init: buildUnitInit(kind, id) });
      spent += spec.cost;
      grid = makeGrid();
      nadirHz = grid.f;
      return { ok: true };
    }
    if (state === "running" && !isLevel) {
      const id = nextId(kind);
      const init = buildUnitInit(kind, id);
      const startS = buildStartSeconds(kind);
      if (startS > 0) {
        pending.push({ id, kind, readyAt: grid.t + startS, init });
      } else {
        queue.push({ type: "addUnit", unit: init });
      }
      return { ok: true };
    }
    if (state === "running") {
      return refuse("You can only build during preparation.");
    }
    return refuse("The game is over.");
  }

  function demolish(id: string): ActionResult {
    if (state === "prepare") {
      const i = built.findIndex((b) => b.id === id);
      const entry = built[i];
      if (!entry) {
        return refuse(
          level.units.some((u) => u.id === id)
            ? "The starting plants cannot be demolished."
            : "There is no such building.",
        );
      }
      built.splice(i, 1);
      spent -= entry.cost;
      grid = makeGrid();
      nadirHz = grid.f;
      return { ok: true };
    }
    if (state === "running" && !isLevel) {
      if (pending.some((p) => p.id === id)) {
        pending = pending.filter((p) => p.id !== id);
        return { ok: true };
      }
      if (grid.units.some((u) => u.id === id)) {
        queue.push({ type: "removeUnit", id });
        return { ok: true };
      }
      return refuse("There is no such building.");
    }
    if (state === "running") {
      return refuse("Nothing can be demolished once the day has started.");
    }
    return refuse("The game is over.");
  }

  function addConsumer(kind: LoadKind): ActionResult {
    if (!isLevel && state === "running") {
      if (!(kind in LOAD_CATALOG)) {
        return refuse("Unknown consumer.");
      }
      queue.push({ type: "addLoad", load: consumerInit(kind, nextId(kind)) });
      return { ok: true };
    }
    return refuse("Consumers can only be added in sandbox mode.");
  }

  function removeConsumer(id: string): ActionResult {
    if (!isLevel && state === "running") {
      if (!grid.loads.some((l) => l.id === id)) {
        return refuse("There is no such consumer.");
      }
      queue.push({ type: "removeLoad", id });
      return { ok: true };
    }
    return refuse("Consumers can only be removed in sandbox mode.");
  }

  function restoreLoad(): ActionResult {
    if (state !== "running") {
      return refuse("Load can only be restored while the day is running.");
    }
    queue.push({ type: "restoreShedLoad" });
    return { ok: true };
  }

  function tripUnit(id: string): ActionResult {
    if (state !== "running") {
      return refuse("Units can only be tripped while the day is running.");
    }
    const unit = grid.units.find((u) => u.id === id);
    if (!unit) {
      return refuse("There is no such unit.");
    }
    if (!unit.online) {
      return refuse("That unit is already offline.");
    }
    queue.push({ type: "tripUnit", id });
    return { ok: true };
  }

  function setSpeed(next: Speed): ActionResult {
    if (isLevel) {
      return refuse("Speed can only be changed in sandbox mode.");
    }
    speed = next;
    return { ok: true };
  }

  function result(): GameResult | null {
    if (state !== "won" && state !== "lost") {
      return null;
    }
    const nadir = nadirHz;
    const shed = maxShedFraction;
    const shedPct = (shed * 100).toFixed(0);
    const nadirText = nadir.toFixed(2);
    const { three, two } = level.stars;

    if (state === "lost" || grid.blackout) {
      const why = grid.blackout ? BLACKOUT_TEXT[grid.blackout.reason] : "the grid collapsed";
      const when = grid.blackout ? grid.blackout.t.toFixed(0) : grid.t.toFixed(0);
      return {
        stars: 0,
        reason: `Blackout at ${when} s: ${why}. Fast reserves and inertia must hold the frequency until slower plants react.`,
        nadirHz: nadir,
        maxShedFraction: shed,
      };
    }
    if (shed <= three.maxShedFraction + EPS && nadir >= three.minNadirHz) {
      return {
        stars: 3,
        reason: `No load was shed and the frequency never dropped below ${three.minNadirHz} Hz (lowest ${nadirText} Hz).`,
        nadirHz: nadir,
        maxShedFraction: shed,
      };
    }
    if (shed <= two.maxShedFraction + EPS) {
      const detail =
        shed <= EPS
          ? `no load was shed, but the frequency dipped to ${nadirText} Hz (3 stars need at least ${three.minNadirHz} Hz)`
          : `${shedPct}% of the city was disconnected by UFLS (3 stars need none)`;
      return {
        stars: 2,
        reason: `The lights stayed on, but ${detail}. More fast reserve would help.`,
        nadirHz: nadir,
        maxShedFraction: shed,
      };
    }
    return {
      stars: 1,
      reason: `The grid survived, but UFLS disconnected ${shedPct}% of the city (lowest ${nadirText} Hz). Batteries react within a second and soften the drop.`,
      nadirHz: nadir,
      maxShedFraction: shed,
    };
  }

  function snapshot(): Snapshot {
    const messages = unreadMessages;
    unreadMessages = [];
    return {
      mode,
      state,
      speed,
      t: grid.t,
      f: grid.f,
      rocof: grid.rocof,
      pGen: grid.pGen,
      pLoad: grid.pLoad,
      pShed: grid.pShed,
      shedFraction: grid.shedFraction,
      uflsStages: [...grid.uflsTripped],
      units: grid.units.map((u) => ({
        id: u.id,
        kind: u.kind,
        p: u.p,
        pMax: u.pMax,
        online: u.online,
        fcr: u.fcr,
        afrr: u.afrr,
        soc: u.battery ? u.battery.soc : null,
      })),
      consumers: grid.loads.map((l) => ({
        id: l.id,
        kind: l.kind,
        mw: l.mw,
        shedMW: l.mw * grid.shedFraction,
        shedFraction: grid.shedFraction,
      })),
      pendingBuilds: pending.map((p) => ({
        id: p.id,
        kind: p.kind,
        remainingS: Math.max(0, p.readyAt - grid.t),
      })),
      budget: isLevel ? remainingBudget() : null,
      blackout: grid.blackout ? { ...grid.blackout } : null,
      measurements: { nadirHz, maxShedFraction, elapsedS: grid.t, maxUflsStages },
      newMessages: messages,
      log: grid.log.slice(-SNAPSHOT_LOG_ENTRIES).map((e) => ({ ...e })),
    };
  }

  return {
    advance,
    start,
    build,
    demolish,
    addConsumer,
    removeConsumer,
    restoreLoad,
    tripUnit,
    setSpeed,
    result,
    snapshot,
  };
}
