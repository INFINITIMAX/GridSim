// P4: sesiunea. L6 (plafonul advance), L7 (snapshot imutabil), L9 (restoreLoad), L10 (determinism).
import { describe, expect, it } from "vitest";
import { createSession } from "../../src/game";
import type { Snapshot } from "../../src/game";
import { accept, advanceBy, advanceUntil, refusal, startedLevel } from "./helpers";

describe("L6: plafonul de pași al lui advance", () => {
  // Plafon documentat: 400 de pași pe apel = 20 s simulate la dt = 50 ms; restul se aruncă.
  it("advance(3600) nu avansează mai mult de 20 s simulate", () => {
    const s = startedLevel();
    s.advance(3600);
    const snap = s.snapshot();
    expect(snap.t).toBeGreaterThan(0);
    expect(snap.t).toBeLessThanOrEqual(20 + 1e-6);
    expect(snap.t).toBeCloseTo(20, 6);
    expect(snap.state).toBe("running");
  });

  it("restul de timp e aruncat, nu păstrat pentru apelul următor", () => {
    const s = startedLevel();
    s.advance(3600);
    const t1 = s.snapshot().t;
    s.advance(0.04); // sub un pas: dacă restul ar fi rămas, ar fi urmat alți 400 de pași
    expect(s.snapshot().t).toBe(t1);
    s.advance(0.05);
    expect(s.snapshot().t).toBeCloseTo(t1 + 0.05, 9);
  });

  it("apelurile repetate avansează câte 20 s, iar ziua se termină fără blocaj", () => {
    const s = startedLevel();
    for (let i = 0; i < 6; i++) {
      s.advance(3600);
    }
    const snap = s.snapshot();
    expect(snap.state).toBe("won");
    expect(snap.t).toBeCloseTo(120, 1);
  });

  it("în sandbox cu viteza 4 plafonul se aplică tot pe pași, nu pe timp real", () => {
    const s = createSession("sandbox");
    accept(s.setSpeed(4));
    s.advance(3600);
    expect(s.snapshot().t).toBeCloseTo(20, 6);
  });

  it("dt nepozitiv sau NaN nu schimbă nimic", () => {
    const s = startedLevel();
    s.advance(0);
    s.advance(-5);
    s.advance(Number.NaN);
    expect(s.snapshot().t).toBe(0);
  });
});

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** Încearcă să strice tot ce poate dintr-un snapshot; un obiect înghețat care aruncă e și el în regulă. */
function tamper(snap: Snapshot): void {
  const attempt = (fn: () => void): void => {
    try {
      fn();
    } catch {
      // obiect înghețat: mutația a eșuat zgomotos, deci tot imutabil
    }
  };
  const units = snap.units as unknown as Mutable<Snapshot["units"][number]>[];
  const consumers = snap.consumers as unknown as Mutable<Snapshot["consumers"][number]>[];
  const stages = snap.uflsStages as unknown as boolean[];
  const log = snap.log as unknown as { detail: string; t: number }[];
  const measurements = snap.measurements as unknown as Mutable<Snapshot["measurements"]>;
  attempt(() => {
    for (const u of units) {
      u.p = 9999;
      u.online = false;
      u.pMax = 1;
    }
  });
  attempt(() => units.pop());
  attempt(() => {
    for (const c of consumers) {
      c.mw = 0;
      c.shedFraction = 1;
    }
  });
  attempt(() => consumers.pop());
  attempt(() => {
    stages[0] = !stages[0];
  });
  attempt(() => {
    for (const e of log) {
      e.detail = "tampered";
    }
  });
  attempt(() => log.pop());
  attempt(() => {
    measurements.nadirHz = 0;
    measurements.maxShedFraction = 1;
  });
  attempt(() => (snap.newMessages as unknown as unknown[]).push({ t: 0, text: "tampered" }));
}

describe("L7: snapshot() e imutabil față de exterior", () => {
  it("modificarea obiectului întors nu schimbă sesiunea", () => {
    const s = startedLevel();
    advanceBy(s, 55, 1); // gazul a picat la 50 s: jurnalul și UFLS nu sunt goale
    const first = s.snapshot();
    expect(first.log.length, "precondiție: jurnalul are intrări").toBeGreaterThan(0);
    expect(first.uflsStages.some(Boolean), "precondiție: UFLS a declanșat").toBe(true);
    const reference = structuredClone(first);

    tamper(first);

    const second = s.snapshot();
    expect(second).toEqual({ ...reference, newMessages: [] });
  });

  it("modificarea unui snapshot nu influențează evoluția ulterioară", () => {
    const run = (doTamper: boolean): Snapshot => {
      const s = startedLevel(["battery"]);
      advanceBy(s, 52, 1);
      const snap = s.snapshot();
      if (doTamper) {
        tamper(snap);
      }
      advanceBy(s, 20, 1);
      return s.snapshot();
    };
    expect(run(true)).toEqual(run(false));
  });

  it("două snapshot-uri consecutive nu împart referințe mutabile", () => {
    const s = startedLevel();
    advanceBy(s, 55, 1);
    const a = s.snapshot();
    const b = s.snapshot();
    expect(a.units).not.toBe(b.units);
    expect(a.consumers).not.toBe(b.consumers);
    expect(a.uflsStages).not.toBe(b.uflsStages);
    expect(a.log).not.toBe(b.log);
    expect(a.units[0]).not.toBe(b.units[0]);
  });

  it("mesajele noi se consumă: al doilea snapshot are lista goală", () => {
    const s = createSession("level1");
    const first = s.snapshot();
    expect(first.newMessages).toHaveLength(1); // introducerea
    expect(first.newMessages[0]?.text.length).toBeGreaterThan(0);
    expect(s.snapshot().newMessages).toEqual([]);

    accept(s.start());
    const afterStart = s.snapshot();
    expect(afterStart.newMessages).toHaveLength(1);
    expect(s.snapshot().newMessages).toEqual([]);

    advanceBy(s, 11, 1); // fabrica la 10 s
    const afterFactory = s.snapshot();
    expect(afterFactory.newMessages).toHaveLength(1);
    expect(afterFactory.newMessages[0]?.text).toMatch(/factory/i);
    expect(afterFactory.newMessages[0]?.t).toBe(10);
    expect(s.snapshot().newMessages).toEqual([]);
  });

  it("în sandbox nu există mesaje narative", () => {
    const s = createSession("sandbox");
    advanceBy(s, 5, 1);
    expect(s.snapshot().newMessages).toEqual([]);
  });
});

describe("L9: restoreLoad()", () => {
  it("în prepare e refuzat", () => {
    const s = createSession("level1");
    expect(refusal(s.restoreLoad()).length).toBeGreaterThan(0);
  });

  it("fără deconectări e acceptat și nu schimbă nimic (idempotent)", () => {
    const s = startedLevel();
    advanceBy(s, 5, 1);
    accept(s.restoreLoad());
    s.advance(0.05);
    const snap = s.snapshot();
    expect(snap.shedFraction).toBe(0);
    expect(snap.pShed).toBe(0);
  });

  it("după UFLS readuce consumul: shedFraction, pShed și shedMW revin la 0", () => {
    const s = startedLevel(); // fără rezerve rapide: gazul pică la 50 s și UFLS taie ~21%
    const before = advanceUntil(s, 70, 1);
    expect(before.shedFraction, "precondiție: UFLS a deconectat consum").toBeGreaterThan(0);
    expect(before.pShed).toBeGreaterThan(0);
    expect(before.consumers.every((c) => c.shedMW > 0)).toBe(true);
    // Reconectarea nu are sens dacă frecvența e deja sub prima treaptă (ar redeclanșa în același pas).
    expect(before.f, "precondiție: frecvența s-a refăcut peste treapta 1 UFLS (49,0 Hz)").toBeGreaterThan(49.0);

    accept(s.restoreLoad());
    s.advance(0.05);
    const after = s.snapshot();
    expect(after.shedFraction).toBe(0);
    expect(after.pShed).toBe(0);
    expect(after.uflsStages.some(Boolean)).toBe(false);
    for (const c of after.consumers) {
      expect(c.shedMW).toBe(0);
    }
    // consumul efectiv a crescut față de momentul deconectat
    expect(after.pLoad).toBeGreaterThan(before.pLoad);
  });

  it("măsurătorile păstrează maximul: reconectarea nu șterge maxShedFraction", () => {
    const s = startedLevel();
    const before = advanceUntil(s, 70, 1);
    const peak = before.measurements.maxShedFraction;
    expect(peak).toBeGreaterThan(0);
    accept(s.restoreLoad());
    s.advance(0.05);
    expect(s.snapshot().measurements.maxShedFraction).toBeGreaterThanOrEqual(peak);
  });

  it("e permis și în sandbox", () => {
    const s = createSession("sandbox");
    accept(s.restoreLoad());
  });
});

describe("L10: determinism", () => {
  const play = (slice: number): Snapshot => {
    const s = createSession("level1");
    accept(s.build("battery"));
    accept(s.build("solar"));
    accept(s.start());
    advanceBy(s, 55, slice);
    accept(s.restoreLoad());
    advanceBy(s, 15, slice);
    return s.snapshot();
  };

  it("aceeași secvență și aceeași feliere dau același snapshot final", () => {
    const a = play(0.1);
    const b = play(0.1);
    expect(a.t, "precondiție: simularea a rulat").toBeGreaterThan(69);
    expect(a.measurements.nadirHz, "precondiție: a existat dinamică").toBeLessThan(49.7);
    expect(a).toEqual(b);
  });

  it("la fel și cu felierea de 1 s", () => {
    expect(play(1)).toEqual(play(1));
  });

  it("sandbox: aceeași secvență de acțiuni dă același snapshot", () => {
    const run = (): Snapshot => {
      const s = createSession("sandbox");
      accept(s.setSpeed(2));
      accept(s.build("solar"));
      advanceBy(s, 3, 0.5);
      accept(s.addConsumer("factory"));
      advanceBy(s, 5, 0.5);
      return s.snapshot();
    };
    const a = run();
    expect(a.consumers.some((c) => c.kind === "factory")).toBe(true);
    expect(a).toEqual(run());
  });
});
