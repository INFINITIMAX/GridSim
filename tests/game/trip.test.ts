// P4b: tripUnit(id) și plafonul jurnalului din snapshot().log.
import { describe, expect, it } from "vitest";
import { createSession } from "../../src/game";
import { SNAPSHOT_LOG_ENTRIES } from "../../src/game/session";
import type { Session } from "../../src/game";
import { DT, accept, advanceBy, builtIds, playToEnd, refusal, startedLevel, unitOf } from "./helpers";

/** Intrările de jurnal de tip unit-tripped ale unității `id`. */
function tripEntries(log: ReturnType<Session["snapshot"]>["log"], id: string) {
  return log.filter((e) => e.type === "unit-tripped" && e.detail.startsWith(`${id}:`));
}

describe("tripUnit: refuzuri", () => {
  it("id inexistent e refuzat, cu motiv", () => {
    const s = createSession("sandbox");
    expect(refusal(s.tripUnit("nu-exista")).length).toBeGreaterThan(0);
    s.advance(DT);
    expect(s.snapshot().log, "un refuz nu produce evenimente").toEqual([]);
  });

  it("în prepare e refuzat, chiar pentru o unitate existentă; unitatea rămâne online", () => {
    const s = createSession("level1");
    expect(refusal(s.tripUnit("gas")).length).toBeGreaterThan(0);
    accept(s.start());
    s.advance(DT);
    expect(unitOf(s.snapshot(), "gas").online, "refuzul din prepare nu s-a păstrat în coadă").toBe(true);
  });

  it("unitate deja offline e refuzată", () => {
    const s = createSession("sandbox");
    accept(s.tripUnit("gas"));
    s.advance(DT);
    expect(unitOf(s.snapshot(), "gas").online).toBe(false);
    expect(refusal(s.tripUnit("gas")).length).toBeGreaterThan(0);
  });

  it("după terminarea nivelului (won) e refuzat", () => {
    const s = startedLevel();
    playToEnd(s);
    expect(s.snapshot().state).toBe("won");
    expect(refusal(s.tripUnit("hydro")).length).toBeGreaterThan(0);
  });
});

describe("tripUnit: efect în running", () => {
  it("sandbox: unitatea e online până la pasul următor, apoi offline cu p = 0, o singură intrare în jurnal", () => {
    const s = createSession("sandbox");
    accept(s.tripUnit("gas"));

    const queued = s.snapshot();
    expect(unitOf(queued, "gas").online, "acțiunea se aplică la pasul următor, nu imediat").toBe(true);
    expect(queued.log).toEqual([]);

    s.advance(DT); // exact un pas
    const snap = s.snapshot();
    const gas = unitOf(snap, "gas");
    expect(gas.online).toBe(false);
    expect(gas.p).toBe(0);
    expect(tripEntries(snap.log, "gas")).toHaveLength(1);
    expect(unitOf(snap, "hydro").online, "celelalte unități nu sunt atinse").toBe(true);

    advanceBy(s, 30, 0.5); // după pierderea a 150 MW intervin UFLS etc., dar gazul nu mai pică a doua oară
    const later = s.snapshot();
    expect(later.blackout).toBeNull();
    expect(tripEntries(later.log, "gas"), "exact o dată, nu repetat").toHaveLength(1);
  });

  it("două cereri în aceeași fereastră de pas produc tot o singură declanșare în jurnal", () => {
    const s = createSession("sandbox");
    accept(s.tripUnit("gas"));
    accept(s.tripUnit("gas")); // unitatea e încă online la momentul cererii
    s.advance(DT);
    expect(tripEntries(s.snapshot().log, "gas")).toHaveLength(1);
  });

  it("dinamic: pierderea gazului coboară frecvența până la 49,0 Hz și declanșează UFLS; maxUflsStages ține minte treptele", () => {
    // Calcul de mână: deficit 150 MW din 570 MW (26%); rămâne doar hidroul (H = 3 s, S = 900 MW):
    // RoCoF = 50·(-150)/(2·3·900) ≈ -1,4 Hz/s, mai repede decât răspunsul FCR (10 s), deci f atinge
    // 49,0 Hz (prima treaptă UFLS, 5%) în sub o secundă.
    const s = createSession("sandbox");
    const before = s.snapshot();
    expect(before.f).toBe(50);
    expect(before.measurements.maxUflsStages).toBe(0);

    accept(s.tripUnit("gas"));
    advanceBy(s, 20, 0.5);
    const snap = s.snapshot();
    expect(snap.measurements.nadirHz, "frecvența a atins treapta 1 UFLS").toBeLessThanOrEqual(49.0);
    const tripped = snap.uflsStages.filter(Boolean).length;
    expect(tripped).toBeGreaterThanOrEqual(1);
    // Treptele sunt cu latch, deci maximul simultan = numărul curent de trepte declanșate.
    expect(snap.measurements.maxUflsStages).toBe(tripped);
    expect(snap.log.some((e) => e.type === "ufls")).toBe(true);
    expect(snap.measurements.maxShedFraction).toBeGreaterThan(0);
  });

  it("nivelul 1, running: tripUnit e permis (ambele moduri)", () => {
    const s = startedLevel();
    accept(s.tripUnit("gas"));
    s.advance(DT);
    expect(unitOf(s.snapshot(), "gas").online).toBe(false);
  });

  it("o unitate construită de jucător poate fi declanșată (baterie)", () => {
    const s = createSession("sandbox");
    accept(s.build("battery"));
    s.advance(DT);
    const id = builtIds(s.snapshot())[0] ?? "";
    expect(unitOf(s.snapshot(), id).online).toBe(true);
    accept(s.tripUnit(id));
    s.advance(DT);
    expect(unitOf(s.snapshot(), id).online).toBe(false);
  });
});

describe(`snapshot().log: plafon de ${SNAPSHOT_LOG_ENTRIES} intrări`, () => {
  /**
   * Construiește `n` baterii (setpoint 0 MW, pornire instantanee: nu schimbă bilanțul, frecvența
   * rămâne 50 Hz), apoi le declanșează pe toate într-un singur pas, în ordinea id-urilor.
   * Fiecare declanșare adaugă exact o intrare unit-tripped în jurnalul modelului.
   */
  function tripManyBatteries(n: number): { session: Session; ids: string[] } {
    const session = createSession("sandbox");
    for (let i = 0; i < n; i++) {
      accept(session.build("battery"), `build ${i}`);
    }
    session.advance(DT);
    const ids = builtIds(session.snapshot());
    expect(ids, "precondiție: toate bateriile sunt online").toHaveLength(n);
    for (const id of ids) {
      accept(session.tripUnit(id), `trip ${id}`);
    }
    session.advance(DT);
    return { session, ids };
  }

  it("constanta e 50", () => {
    expect(SNAPSHOT_LOG_ENTRIES).toBe(50);
  });

  it.each([
    [0, 0],
    [3, 3],
    [49, 49],
    [50, 50],
    [51, 50],
    [60, 50],
  ])("după %i declanșări, jurnalul are %i intrări și conține ultimele", (n, expectedLen) => {
    const { session, ids } = tripManyBatteries(n);
    const log = session.snapshot().log;
    expect(log).toHaveLength(expectedLen);
    expect(log.every((e) => e.type === "unit-tripped")).toBe(true);
    // Ultimele `expectedLen` unități declanșate, în ordine cronologică.
    const expectedIds = ids.slice(n - expectedLen);
    expect(log.map((e) => e.detail.split(":")[0])).toEqual(expectedIds);
  });

  it("intrările vechi ies din fereastră: gazul declanșat primul dispare după 50 de declanșări ulterioare", () => {
    const s = createSession("sandbox");
    accept(s.tripUnit("gas"));
    s.advance(DT);
    expect(tripEntries(s.snapshot().log, "gas")).toHaveLength(1);

    for (let i = 0; i < SNAPSHOT_LOG_ENTRIES; i++) {
      accept(s.build("battery"));
    }
    s.advance(DT);
    const ids = builtIds(s.snapshot());
    expect(ids).toHaveLength(SNAPSHOT_LOG_ENTRIES);
    for (const id of ids) {
      accept(s.tripUnit(id));
    }
    s.advance(DT);

    const log = s.snapshot().log;
    expect(log).toHaveLength(SNAPSHOT_LOG_ENTRIES);
    expect(tripEntries(log, "gas"), "gazul (cel mai vechi) a ieșit din fereastră").toHaveLength(0);
    expect(log[log.length - 1]?.detail.startsWith(`${ids[ids.length - 1]}:`)).toBe(true);
  });

  it("jurnalul e cronologic (t nedescrescător) și snapshot-ul întoarce copii", () => {
    const { session } = tripManyBatteries(5);
    const first = session.snapshot();
    for (let i = 1; i < first.log.length; i++) {
      expect(first.log[i]?.t ?? 0).toBeGreaterThanOrEqual(first.log[i - 1]?.t ?? 0);
    }
    const original = first.log[0]?.detail ?? "";
    (first.log[0] as { detail: string }).detail = "modificat";
    expect(session.snapshot().log[0]?.detail, "modificarea unei copii nu afectează jurnalul real").toBe(original);
  });
});
