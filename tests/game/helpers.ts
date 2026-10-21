// Ajutoare comune pentru testele din tests/game (nu conține teste).
import { expect } from "vitest";
import { createSession } from "../../src/game";
import type { ActionResult, BuildKind, GameResult, Session, Snapshot, UnitView } from "../../src/game";

/** Pasul fix al modelului (ISLAND_CONFIG.dt), secunde. */
export const DT = 0.05;

export function accept(result: ActionResult, label = "acțiune"): void {
  expect(result.ok, `${label} trebuia acceptată, dar: ${result.ok ? "" : result.reason}`).toBe(true);
}

/** Cere un refuz și întoarce motivul. */
export function refusal(result: ActionResult, label = "acțiune"): string {
  if (result.ok) {
    throw new Error(`${label} trebuia refuzată, dar a fost acceptată`);
  }
  return result.reason;
}

export function unitOf(snap: Snapshot, id: string): UnitView {
  const u = snap.units.find((x) => x.id === id);
  if (!u) {
    throw new Error(`unitatea ${id} lipsește din snapshot (are: ${snap.units.map((x) => x.id).join(", ")})`);
  }
  return u;
}

/** Id-urile construcțiilor jucătorului (tot ce nu e unitate de start). */
export function builtIds(snap: Snapshot): string[] {
  return snap.units.filter((u) => u.id !== "hydro" && u.id !== "gas").map((u) => u.id);
}

/** Suma puterilor unităților online, MW. */
export function sumP(snap: Snapshot): number {
  return snap.units.filter((u) => u.online).reduce((sum, u) => sum + u.p, 0);
}

/** Apelează `advance(slice)` de round(seconds/slice) ori. */
export function advanceBy(session: Session, seconds: number, slice: number): void {
  const n = Math.round(seconds / slice);
  for (let i = 0; i < n; i++) {
    session.advance(slice);
  }
}

/**
 * Apelează `advance(slice)` până când timpul simulat ajunge la `targetT`. Mesajele din fiecare
 * snapshot se adaugă în `messages` (snapshot() le consumă). Întoarce ultimul snapshot.
 */
export function advanceUntil(
  session: Session,
  targetT: number,
  slice: number,
  messages: string[] = [],
): Snapshot {
  let snap = session.snapshot();
  messages.push(...snap.newMessages.map((m) => m.text));
  for (let guard = 0; snap.t < targetT && guard < 1_000_000; guard++) {
    session.advance(slice);
    snap = session.snapshot();
    messages.push(...snap.newMessages.map((m) => m.text));
  }
  return snap;
}

/** Sesiune de nivel 1 cu construcțiile date, deja pornită (start() acceptat). */
export function startedLevel(builds: readonly BuildKind[] = []): Session {
  const s = createSession("level1");
  for (const b of builds) {
    accept(s.build(b), `build ${b}`);
  }
  accept(s.start(), "start");
  return s;
}

/** Joacă ziua până la capăt (pași de 0,5 s) și întoarce rezultatul. */
export function playToEnd(session: Session): GameResult {
  for (let i = 0; i < 1000; i++) {
    session.advance(0.5);
    const r = session.result();
    if (r !== null) {
      return r;
    }
  }
  throw new Error("jocul nu s-a terminat după 500 s jucați");
}
