// P4: sandbox. Părți din L1 (stări), L4 (reechilibrare) și L8 (construcții cu pornire întârziată, consumatori, viteză).
import { describe, expect, it } from "vitest";
import { CONSUMER_KINDS, createSession } from "../../src/game";
import { LOAD_CATALOG } from "../../src/model";
import { accept, advanceBy, builtIds, refusal, unitOf } from "./helpers";

describe("L1 (sandbox): stări", () => {
  it("pornește direct în running, fără buget, și nu se termină", () => {
    const s = createSession("sandbox");
    const snap = s.snapshot();
    expect(snap.state).toBe("running");
    expect(snap.mode).toBe("sandbox");
    expect(snap.budget).toBeNull();
    expect(s.result()).toBeNull();

    advanceBy(s, 200, 0.5); // mult peste cele 120 s ale nivelului
    const later = s.snapshot();
    expect(later.state).toBe("running");
    expect(later.t).toBeCloseTo(200, 1);
    expect(s.result()).toBeNull();
  });

  it("nu are script: fabrica nu apare și gazul nu pică", () => {
    const s = createSession("sandbox");
    advanceBy(s, 70, 1);
    const snap = s.snapshot();
    expect(snap.consumers.map((c) => c.id)).toEqual(["town"]);
    expect(unitOf(snap, "gas").online).toBe(true);
    expect(snap.shedFraction).toBe(0);
  });

  it("start() e refuzat (nu există prepare)", () => {
    const s = createSession("sandbox");
    expect(refusal(s.start()).length).toBeGreaterThan(0);
  });
});

describe("L4 (sandbox): reechilibrarea când o construcție intră online", () => {
  it("solarul (+80 MW, pornire instantanee) reduce hidroul: frecvența rămâne la 50 Hz", () => {
    // Fără reechilibrare, surplusul de 80 MW ar ține frecvența ridicată mult timp
    // (FCR 250 MW/Hz => ~+0,3 Hz, aFRR cu constanta de timp de ~120 s).
    // Hidroul (4,5 MW/s) scade de la 420 la 340 în ~18 s.
    const s = createSession("sandbox");
    accept(s.build("solar"));
    advanceBy(s, 60, 0.5);
    const snap = s.snapshot();
    expect(snap.blackout).toBeNull();
    expect(Math.abs(snap.f - 50)).toBeLessThan(0.05);
    expect(Math.abs(unitOf(snap, "hydro").p - 340)).toBeLessThan(5);
    expect(unitOf(snap, "gas").p).toBeGreaterThan(145);
  });

  it("OCGT (+60 MW, pornire 8 min = 480 s) reduce hidroul cu 60 MW după intrarea online", () => {
    // Calcul de mână: la intrare, programat = 420 (hidro) + 150 (gaz) + 60 (OCGT) = 630 MW, consum 570 MW,
    // surplus 60 MW. Hidroul e primul în ordinea de tăiere și are loc (420 - 0,2·900 = 240 MW >= 60),
    // deci noul setpoint al hidroului = 420 - 60 = 360 MW; gazul rămâne la 150. Rampa hidroului:
    // 0,3·900/60 = 4,5 MW/s => 60 MW în ~13,3 s.
    const s = createSession("sandbox");
    accept(s.setSpeed(4));
    accept(s.build("ocgt"));

    advanceBy(s, 115, 1); // 460 s simulate: OCGT încă în așteptare
    const before = s.snapshot();
    expect(before.t).toBeCloseTo(460, 1);
    expect(before.pendingBuilds).toHaveLength(1);
    expect(before.pendingBuilds[0]?.kind).toBe("ocgt");
    expect(before.units.some((u) => u.kind === "ocgt"), "OCGT nu e încă unitate").toBe(false);
    expect(Math.abs(unitOf(before, "hydro").p - 420), "hidroul neatins până la intrare").toBeLessThan(5);

    advanceBy(s, 6.25, 0.25); // 485 s: la ~5 s după intrare, hidroul încă coboară pe rampă
    const ramping = s.snapshot();
    expect(ramping.pendingBuilds).toEqual([]);
    const hydroMid = unitOf(ramping, "hydro").p;
    expect(hydroMid, "hidroul a început să scadă (rampă de 4,5 MW/s)").toBeLessThan(410);
    // The OCGT enters at full setpoint, so the 60 MW surplus raises f and hydro FCR (100 MW, 10 s) also
    // pulls output down, faster than the setpoint ramp alone: p can briefly undershoot 360. It stays well
    // above 420 - 60 - 100 = 260 (setpoint target minus the full FCR reserve).
    expect(hydroMid, "nu scade sub ținta minus toată rezerva FCR").toBeGreaterThan(260);
    expect(ramping.blackout).toBeNull();

    advanceBy(s, 25, 1); // 585 s: stabilizat
    const after = s.snapshot();
    const ocgt = after.units.find((u) => u.kind === "ocgt");
    expect(ocgt?.online).toBe(true);
    expect(Math.abs((ocgt?.p ?? 0) - 60)).toBeLessThan(5);
    expect(Math.abs(unitOf(after, "hydro").p - 360)).toBeLessThan(5);
    expect(Math.abs(unitOf(after, "gas").p - 150)).toBeLessThan(5);
    expect(after.blackout).toBeNull();
    expect(Math.abs(after.f - 50)).toBeLessThan(0.05);
  });

  it("demolish(\"hydro\") lasă 150 MW pentru 570 MW de consum: blackout sub-frecvență, sesiunea rămâne running", () => {
    // Calcul de mână: rămâne doar gazul (150 MW, pMax 200, H = 4,3 s): deficit 420 MW,
    // RoCoF ≈ 50·(150-570)/(2·4,3·200) ≈ -12 Hz/s => sub 47,5 Hz în câteva zeci de pași.
    const s = createSession("sandbox");
    expect(s.snapshot().blackout, "precondiție").toBeNull();
    accept(s.demolish("hydro"));
    expect(s.snapshot().blackout, "demolish se aplică abia la pasul următor").toBeNull();

    advanceBy(s, 10, 0.5);
    const snap = s.snapshot();
    expect(snap.blackout).not.toBeNull();
    expect(snap.blackout?.reason).toBe("under-frequency");
    expect(snap.state, "sandbox nu are stare lost").toBe("running");
    expect(s.result()).toBeNull();
    expect(snap.f).toBeLessThan(47.5 + 1e-6);
    expect(snap.log.some((e) => e.type === "blackout")).toBe(true);

    const frozenT = snap.t;
    advanceBy(s, 5, 0.5);
    expect(s.snapshot().t, "după blackout modelul nu mai avansează").toBeCloseTo(frozenT, 9);
    expect(s.snapshot().state).toBe("running");
  });
});

describe("L8: construcții cu timp de pornire", () => {
  it("solarul (startMinutes = 0) intră online imediat, fără să apară în pendingBuilds", () => {
    const s = createSession("sandbox");
    accept(s.build("solar"));
    s.advance(0.1);
    const snap = s.snapshot();
    expect(snap.pendingBuilds).toEqual([]);
    const id = builtIds(snap)[0] ?? "";
    expect(unitOf(snap, id).kind).toBe("solar");
    expect(unitOf(snap, id).online).toBe(true);
  });

  it("hidroul (5 min = 300 s) apare în pendingBuilds și intră online abia după 300 s simulate", () => {
    const s = createSession("sandbox");
    accept(s.setSpeed(4));
    accept(s.build("hydro"));

    const start = s.snapshot();
    expect(start.pendingBuilds).toHaveLength(1);
    const pending = start.pendingBuilds[0];
    expect(pending?.kind).toBe("hydro");
    expect(pending?.remainingS).toBeCloseTo(300, 6);
    expect(start.units.some((u) => u.id === pending?.id), "încă nu e unitate").toBe(false);

    advanceBy(s, 70, 1); // viteza 4 => 280 s simulate
    const mid = s.snapshot();
    expect(mid.t).toBeCloseTo(280, 1);
    expect(mid.pendingBuilds).toHaveLength(1);
    expect(mid.pendingBuilds[0]?.remainingS).toBeCloseTo(20, 0);
    expect(mid.units.some((u) => u.id === pending?.id)).toBe(false);

    advanceBy(s, 10, 1); // 320 s simulate
    const done = s.snapshot();
    expect(done.pendingBuilds).toEqual([]);
    const unit = unitOf(done, pending?.id ?? "");
    expect(unit.kind).toBe("hydro");
    expect(unit.online).toBe(true);
    expect(done.blackout).toBeNull();
  });

  it("o construcție în așteptare poate fi anulată cu demolish", () => {
    const s = createSession("sandbox");
    accept(s.build("hydro"));
    const id = s.snapshot().pendingBuilds[0]?.id ?? "";
    accept(s.demolish(id));
    expect(s.snapshot().pendingBuilds).toEqual([]);
    advanceBy(s, 20, 1);
    expect(s.snapshot().units.some((u) => u.id === id)).toBe(false);
  });

  it("setSpeed accelerează timpul simulat (1x, 2x, 4x)", () => {
    for (const speed of [1, 2, 4] as const) {
      const s = createSession("sandbox");
      accept(s.setSpeed(speed));
      s.advance(1);
      const snap = s.snapshot();
      expect(snap.speed).toBe(speed);
      expect(snap.t).toBeCloseTo(speed, 6);
    }
  });

  it("demolish în sandbox scoate o unitate online", () => {
    const s = createSession("sandbox");
    accept(s.build("solar"));
    s.advance(0.1);
    const id = builtIds(s.snapshot())[0] ?? "";
    accept(s.demolish(id));
    s.advance(0.1);
    expect(s.snapshot().units.some((u) => u.id === id)).toBe(false);
    expect(refusal(s.demolish("nu-exista")).length).toBeGreaterThan(0);
  });
});

describe("L8: consumatori în sandbox", () => {
  it("addConsumer pentru fiecare tip: apare cu MW-ul din LOAD_CATALOG și crește consumul", () => {
    const s = createSession("sandbox");
    for (const kind of CONSUMER_KINDS) {
      accept(s.addConsumer(kind), `addConsumer ${kind}`);
    }
    s.advance(0.05);
    const snap = s.snapshot();
    expect(snap.consumers).toHaveLength(1 + CONSUMER_KINDS.length);
    for (const kind of CONSUMER_KINDS) {
      const added = snap.consumers.filter((c) => c.id !== "town" && c.kind === kind);
      expect(added, `consumator ${kind}`).toHaveLength(1);
      expect(added[0]?.mw).toBe(LOAD_CATALOG[kind].typicalMW);
    }
    const expectedTotal = 570 + CONSUMER_KINDS.reduce((sum, k) => sum + LOAD_CATALOG[k].typicalMW, 0);
    expect(snap.consumers.reduce((sum, c) => sum + c.mw, 0)).toBe(expectedTotal);
  });

  it("removeConsumer scoate consumatorul; un id necunoscut e refuzat", () => {
    const s = createSession("sandbox");
    accept(s.addConsumer("factory"));
    s.advance(0.05);
    const id = s.snapshot().consumers.find((c) => c.id !== "town")?.id ?? "";
    expect(id).not.toBe("");
    accept(s.removeConsumer(id));
    s.advance(0.05);
    expect(s.snapshot().consumers.map((c) => c.id)).toEqual(["town"]);
    expect(refusal(s.removeConsumer("nu-exista")).length).toBeGreaterThan(0);
  });

  it("id-urile consumatorilor adăugați sunt unice", () => {
    const s = createSession("sandbox");
    accept(s.addConsumer("factory"));
    accept(s.addConsumer("factory"));
    s.advance(0.05);
    const ids = s.snapshot().consumers.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(3);
  });
});

describe("L8: restricțiile din nivel", () => {
  it("addConsumer / removeConsumer / setSpeed sunt refuzate în nivel, în prepare și în running", () => {
    const s = createSession("level1");
    expect(refusal(s.addConsumer("factory")).length).toBeGreaterThan(0);
    expect(refusal(s.removeConsumer("town")).length).toBeGreaterThan(0);
    expect(refusal(s.setSpeed(4)).length).toBeGreaterThan(0);

    accept(s.start());
    expect(refusal(s.addConsumer("factory")).length).toBeGreaterThan(0);
    expect(refusal(s.removeConsumer("town")).length).toBeGreaterThan(0);
    expect(refusal(s.setSpeed(2)).length).toBeGreaterThan(0);

    s.advance(1);
    const snap = s.snapshot();
    expect(snap.consumers.map((c) => c.id)).toEqual(["town"]);
    expect(snap.speed).toBe(1);
    expect(snap.t, "viteza a rămas 1x").toBeCloseTo(1, 6);
  });
});
