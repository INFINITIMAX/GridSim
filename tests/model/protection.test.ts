// Teste P1-P11 (P2b): blackout-uri, protecții, anti-windup aFRR, rampe, restoreShedLoad,
// evenimente invalide, livrare efectivă. Valorile așteptate vin din calcule de mână
// (vezi docs/handoff/P2b-tester-raport.md), nu din rularea modelului.
import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../src/model/config";
import type { GridConfig } from "../../src/model/config";
import { createGrid, step } from "../../src/model/grid";
import type { GridEvent, GridState, UnitInit } from "../../src/model/grid";
import { expectWithinPct, getUnit, homes, simulate } from "./helpers";

const CFG: GridConfig = DEFAULT_CONFIG;
const F0 = 50;

/** OCGT sincron 1 000 MW (H = 5 s) la 500 MW + 500 MW solar, sarcină 1 000 MW. Fără FCR, fără aFRR. */
function lossGrid(): GridState {
  return createGrid(
    CFG,
    [
      { id: "sync", kind: "ocgt", pMax: 1000, setpoint: 500 },
      { id: "solar", kind: "solar", pMax: 500, setpoint: 500 },
    ],
    homes(1000),
  );
}

/** Rulează până la blackout (sau cel mult `maxSeconds`). */
function runUntilBlackout(state: GridState, maxSeconds: number, events: readonly GridEvent[]): void {
  simulate(state, CFG, maxSeconds, events);
}

// ---------------------------------------------------------------- P1, P2, P3, P4

describe("P1-P4: blackout-uri", () => {
  it("P1: losing 500 MW of 1000 MW with no FCR and too little load to shed ends in under-frequency blackout", () => {
    // Calcul de mână: după pierderea solarului, generarea = 500 MW (OCGT), sarcina = 1 000 MW.
    // ROCOF inițial = 50 · (-500) / (2 · 5 · 1000) = -2,5 Hz/s. UFLS poate deconecta cel mult 45%:
    // sarcina rămasă 550 MW > 500 MW, deci rămâne un deficit de cel puțin ~36 MW (≈ 536 MW la 47,5 Hz,
    // cu autoreglajul 1 %/Hz) pentru orice f >= 47,5 Hz. Nimic nu îl acoperă (fără FCR/aFRR),
    // deci f scade monoton sub 47,5 Hz.
    const state = lossGrid();
    runUntilBlackout(state, 60, [{ type: "tripUnit", id: "solar" }]);

    expect(state.blackout).not.toBeNull();
    expect(state.blackout?.reason).toBe("under-frequency");
    expect(state.f).toBeLessThan(47.5);
    // |ROCOF| < 2,5 Hz/s în orice moment (deficitul scade cu f și cu UFLS), deci 2,5 Hz durează > 1 s
    expect(state.blackout?.t ?? 0).toBeGreaterThan(1.0);
    expect(state.blackout?.t ?? Infinity).toBeLessThan(60);
    // toate cele 6 trepte UFLS au fost parcurse înainte de 47,5 Hz, și tot n-a fost destul
    expect(state.uflsTripped.every((t) => t)).toBe(true);
    expect(state.shedFraction).toBeCloseTo(0.45, 9);
    // unitatea sincronă e offline, rețeaua nu mai produce nimic
    const sync = getUnit(state, "sync");
    expect(sync.online).toBe(false);
    expect(sync.p).toBe(0);
    expect(state.sSys).toBe(0);
    expect(state.pGen).toBe(0);
    // jurnal: deconectarea unității sincrone + blackout-ul
    expect(state.log.some((e) => e.type === "unit-tripped" && e.detail.includes("sync"))).toBe(true);
    const blackoutEntries = state.log.filter((e) => e.type === "blackout");
    expect(blackoutEntries).toHaveLength(1);
    expect(blackoutEntries[0]?.t).toBe(state.blackout?.t);
  }, 30_000);

  it("P2: dropping 400 of 500 MW load with no FCR ends in over-frequency blackout at ~0.8 s", () => {
    // OCGT 1 000 MW (H = 5 s) la 500 MW, sarcini 400 + 100 MW. Se scoate sarcina de 400 MW.
    // Surplus = 500 - 100 · (1 + 0,01·Δf) ≈ 400 MW. ROCOF = 50 · 400 / (2 · 5 · 1000) = +2,0 Hz/s (1,995 cu autoreglajul).
    // De la 50 la 51,5 Hz: 1,5 / 1,995 = 0,75 s, deci primul pas Euler peste prag e pasul 16 (t = 0,80 s).
    const state = createGrid(
      CFG,
      [{ id: "sync", kind: "ocgt", pMax: 1000, setpoint: 500 }],
      [
        { id: "big", kind: "factory", mw: 400 },
        { id: "small", kind: "homes", mw: 100 },
      ],
    );
    simulate(state, CFG, 10, [{ type: "removeLoad", id: "big" }]);

    expect(state.blackout?.reason).toBe("over-frequency");
    expect(state.f).toBeGreaterThan(51.5);
    expect(state.f).toBeLessThan(52); // detectat la primul pas peste prag, nu mult mai târziu
    expect(state.blackout?.t ?? 0).toBeGreaterThan(0.6);
    expect(state.blackout?.t ?? Infinity).toBeLessThan(1.0);
    expect(state.uflsTripped.some((t) => t)).toBe(false); // UFLS nu are rost la supra-frecvență
    expect(getUnit(state, "sync").online).toBe(false);
    expect(state.log.some((e) => e.type === "blackout" && e.detail === "over-frequency")).toBe(true);
  });

  it("P3: a grid with only solar and battery blacks out on the first step (no-synchronous-machines)", () => {
    const state = createGrid(
      CFG,
      [
        { id: "solar", kind: "solar", pMax: 100, setpoint: 100 },
        { id: "bat", kind: "battery", pMax: 50, setpoint: 0, battery: { capacityMWh: 100, soc: 0.5 } },
      ],
      homes(100),
    );
    expect(state.blackout).toBeNull(); // createGrid nu declară blackout, doar step
    step(state, CFG);
    expect(state.blackout?.reason).toBe("no-synchronous-machines");
    expect(state.blackout?.t).toBeCloseTo(CFG.dt, 9);
    expect(state.f).toBe(F0); // frecvența nu e definită fără mașini sincrone: nu se atinge (și nu devine NaN)
    expect(state.rocof).toBe(0);
    expect(state.log.some((e) => e.type === "blackout" && e.detail === "no-synchronous-machines")).toBe(true);
  });

  it("P3: tripping the last synchronous unit causes no-synchronous-machines blackout, not a frequency one", () => {
    const state = lossGrid();
    step(state, CFG, { events: [{ type: "tripUnit", id: "sync" }] });
    expect(state.blackout?.reason).toBe("no-synchronous-machines");
    expect(state.f).toBe(F0);
    expect(state.log.filter((e) => e.type === "unit-tripped")).toHaveLength(1);
  });

  it("P3 (negativ): tripping a small synchronous unit while another one stays online is not a blackout", () => {
    // A: hidro 1 000 MW la 400 MW; B: hidro 100 MW la 20 MW (minim tehnic 20%); sarcină 420 MW.
    // După deconectarea lui B rămâne S = 1 000 MW > 0. Deficit 20 MW: ROCOF = 50 · (-20) / (2 · 3 · 1000) = -0,17 Hz/s,
    // deci într-un pas f scade cu ~0,008 Hz.
    const state = createGrid(
      CFG,
      [
        { id: "a", kind: "hydro", pMax: 1000, setpoint: 400 },
        { id: "b", kind: "hydro", pMax: 100, setpoint: 20 },
      ],
      homes(420),
    );
    step(state, CFG, { events: [{ type: "tripUnit", id: "b" }] });
    expect(state.blackout).toBeNull();
    expect(state.sSys).toBe(1000);
    expect(state.f).toBeGreaterThan(49.9);
  });

  it("P4: after a blackout, step changes nothing (not time, frequency, power, units, loads or log), even with events", () => {
    const state = lossGrid();
    runUntilBlackout(state, 60, [{ type: "tripUnit", id: "solar" }]);
    expect(state.blackout).not.toBeNull();
    const before = structuredClone(state);

    for (let i = 0; i < 100; i++) {
      const returned = step(state, CFG, {
        events: [
          { type: "addUnit", unit: { id: "late", kind: "hydro", pMax: 100, setpoint: 50 } },
          { type: "setLoad", id: "load", mw: 5 },
          { type: "restoreShedLoad" },
        ],
      });
      expect(returned).toBe(state);
    }
    // toEqual compară toată starea: t, f, rocof, pGen, pLoad, units (fără "late"), loads, shedFraction, log, blackout
    expect(state).toEqual(before);
  }, 30_000);
});

// ---------------------------------------------------------------- P5

describe("P5: anti-windup aFRR", () => {
  // Sistem: OCGT 20 000 MW (H = 5 s) la 9 900 MW cu rezervă aFRR R = 30 MW; solar 100 MW; sarcină L = 10 000 MW.
  // Se pierde solarul (deficit 100 MW >> R = 30 MW). Fără FCR.
  const L = 10_000;
  const R = 30;
  const DEFICIT_PHASE_S = 240;
  const RECOVERY_PHASE_S = 300;

  function build(): GridState {
    return createGrid(
      CFG,
      [
        { id: "ocgt", kind: "ocgt", pMax: 20_000, setpoint: 9_900, afrrReserveMW: R },
        { id: "lost", kind: "solar", pMax: 100, setpoint: 100 },
      ],
      homes(L),
    );
  }

  it("P5: saturated aFRR keeps the integrator bounded and the frequency recovers soon after the deficit disappears", () => {
    // Faza 1 (deficit): aFRR saturat la R = 30 MW; deficit net 70 MW. Autoreglaj D·L = 0,01 · 10 000 = 100 MW/Hz,
    //   deci abaterea staționară = 70 / 100 = 0,7 Hz (f = 49,3 Hz, peste 49,0 Hz: UFLS nu intră).
    //   Constanta de timp: 2·H·S / f0 / (D·L) = 2·5·20 000 / 50 / 100 = 40 s; după 240 s = 6 tau, practic staționar.
    // Integratorul cu back-calculation: dI/dt = ki·L·e + (livrat - raw)/Tt, unde raw = kp·L·e + I.
    //   La echilibru: I = R + (Tt·ki - kp)·L·e = 30 + (30·0,001 - 0,01) · 10 000 · 0,7 = 170 MW.
    //   Limită de test (cu e <= 1 Hz): R + (Tt·ki - kp)·L·1 = 230 MW. FĂRĂ anti-windup, I ar crește cu
    //   ki·L·e = 0,001 · 10 000 · 0,7 = 7 MW/s, adică ~1 400 MW după 240 s: de 6 ori peste limită.
    const state = build();
    let minF = Infinity;
    let maxAbsIntegral = 0;
    let maxAfrr = 0;
    simulate(state, CFG, DEFICIT_PHASE_S, [{ type: "tripUnit", id: "lost" }], (s) => {
      minF = Math.min(minF, s.f);
      maxAbsIntegral = Math.max(maxAbsIntegral, Math.abs(s.afrrIntegralMW));
      maxAfrr = Math.max(maxAfrr, Math.abs(s.afrrDeployed));
    });

    // precondiții: scenariul chiar saturează aFRR și rămâne în regim liniar (fără UFLS)
    expectWithinPct(state.afrrDeployed, R, 1, "aFRR livrat la finalul fazei de deficit");
    expectWithinPct(F0 - state.f, 0.7, 10, "abatere staționară cu aFRR saturat");
    expect(minF).toBeGreaterThan(49.0);
    expect(state.shedFraction).toBe(0);
    // aFRR nu depășește niciodată rezerva
    expect(maxAfrr).toBeLessThanOrEqual(R + 1e-9);
    // integratorul rămâne mărginit
    const bound = R + (CFG.afrr.trackingTimeS * CFG.afrr.ki - CFG.afrr.kp) * L * 1.0;
    expect(maxAbsIntegral, `integrala maximă ${maxAbsIntegral} MW vs limita ${bound} MW`).toBeLessThanOrEqual(bound);

    // Faza 2: deficitul dispare (vânt de 100 MW). Bilanț: 9 900 + 100 = 10 000 MW = sarcina.
    // Cu anti-windup, I ≈ 170 MW se descarcă (tau = Tt = 30 s) iar bucla PI (ωn = 0,05 rad/s, ζ = 0,5,
    // decădere exp(-0,025·t)) readuce f la 50 Hz. După 300 s: abatere reziduală ~0,7 · e^(-0,025 · 226) ≈ 0,003 Hz.
    // FĂRĂ anti-windup, I ≈ 1 400 MW scade cu doar ki·L·|e| = 3 MW/s, aFRR rămâne la +R, iar f stă la
    // 50 + R/(D·L) = 50,3 Hz încă ~400 s. Pragul 0,05 Hz separă net cele două (vârful f nu separă: ambele rămân sub 50,3).
    simulate(state, CFG, RECOVERY_PHASE_S, [
      { type: "addUnit", unit: { id: "wind", kind: "wind", pMax: 100, setpoint: 100 } },
    ]);
    expect(state.blackout).toBeNull();
    expect(Math.abs(state.f - F0), `f=${state.f} la ${RECOVERY_PHASE_S} s după dispariția deficitului`).toBeLessThan(0.05);
    expect(Math.abs(state.afrrIntegralMW), `integrala finală ${state.afrrIntegralMW} MW`).toBeLessThan(R);
  }, 60_000);
});

// ---------------------------------------------------------------- P6

describe("P6: rampa pe setSetpoint", () => {
  // CCGT 1 000 MW, 4 %/min = 40 MW/min; cere +400 MW (500 -> 900), deci ~10 min.
  // Barul OCGT + sarcina mare țin abaterea de frecvență mică (maxim 400 / (0,01 · 200 500) = 0,2 Hz), fără blackout.
  function build(): GridState {
    return createGrid(
      CFG,
      [
        { id: "bus", kind: "ocgt", pMax: 400_000, setpoint: 200_000 },
        { id: "ccgt", kind: "ccgt", pMax: 1000, setpoint: 500 },
      ],
      homes(200_500),
    );
  }
  const RAISE: GridEvent = { type: "setSetpoint", id: "ccgt", mw: 900 };

  it("P6: a +400 MW request moves a 4 %/min CCGT by ~40 MW in 60 s, not instantly, and needs ~10 min", () => {
    const state = build();

    step(state, CFG, { events: [RAISE] });
    const afterOneStep = getUnit(state, "ccgt");
    expect(afterOneStep.setpoint).toBe(900); // ținta se schimbă imediat
    // un pas: 40 MW/min · 0,05 s / 60 = 0,0333 MW; puterea nu sare la 900
    expect(afterOneStep.p - 500).toBeGreaterThan(0);
    expect(afterOneStep.p - 500).toBeLessThan(0.04);

    simulate(state, CFG, 60 - CFG.dt); // total 60 s
    expectWithinPct(getUnit(state, "ccgt").p - 500, 40, 10, "creștere după 60 s");

    simulate(state, CFG, 240); // 300 s: 5 min · 40 = 200 MW
    expectWithinPct(getUnit(state, "ccgt").p - 500, 200, 5, "creștere după 300 s");

    simulate(state, CFG, 240); // 540 s: 9 min · 40 = 360 MW, încă nu a ajuns
    const at540 = getUnit(state, "ccgt").p;
    expectWithinPct(at540 - 500, 360, 2, "creștere după 540 s");
    expect(at540).toBeLessThan(880);

    simulate(state, CFG, 120); // 660 s > 600 s: a ajuns la țintă
    expect(getUnit(state, "ccgt").p).toBeCloseTo(900, 6);
    expect(state.blackout).toBeNull();
  }, 60_000);

  it("P6 (negativ): lowering the setpoint is also rate-limited (-40 MW/min)", () => {
    const state = createGrid(
      CFG,
      [
        { id: "bus", kind: "ocgt", pMax: 400_000, setpoint: 200_000 },
        { id: "ccgt", kind: "ccgt", pMax: 1000, setpoint: 900 },
      ],
      homes(200_900),
    );
    simulate(state, CFG, 60, [{ type: "setSetpoint", id: "ccgt", mw: 500 }]);
    expectWithinPct(900 - getUnit(state, "ccgt").p, 40, 10, "scădere după 60 s");
  }, 30_000);
});

// ---------------------------------------------------------------- P7

/** Insulă: hidro 500 MW (300) + OCGT 500 MW (250) + 250 MW solar, sarcină 800 MW, FCR 50 MW total. */
function island(): GridState {
  return createGrid(
    CFG,
    [
      { id: "hydro", kind: "hydro", pMax: 500, setpoint: 300, fcrReserveMW: 25 },
      { id: "ocgt", kind: "ocgt", pMax: 500, setpoint: 250, fcrReserveMW: 25 },
      { id: "lost", kind: "solar", pMax: 250, setpoint: 250 },
    ],
    homes(800),
  );
}

describe("P7: restoreShedLoad", () => {
  it("P7: after UFLS, restoreShedLoad resets shedFraction and stages and the consumption returns to the unshed value", () => {
    const state = island();
    simulate(state, CFG, 60, [{ type: "tripUnit", id: "lost" }]);
    expect(state.blackout).toBeNull();
    // precondiție (calcule.md, T3): deficit 25% -> cel puțin 25% deconectat = 200 MW din 800 MW
    expect(state.shedFraction).toBeGreaterThanOrEqual(0.25);
    expect(state.pShed).toBeGreaterThanOrEqual(200);
    expect(state.uflsTripped.some((t) => t)).toBe(true);
    const shedLoadBefore = state.pLoad;
    const fBefore = state.f;
    // precondiție: după treapta 4 f se stabilizează la ~49,92 Hz (calcul de mână: 550 + 250·(-Δf-0,01) = 568 + 5,68·Δf),
    // deci un pas fără UFLS nu coboară sub 49,0 Hz și nu redeclanșează treapta 1
    expect(fBefore).toBeGreaterThan(49.5);

    step(state, CFG, { events: [{ type: "restoreShedLoad" }] });

    expect(state.shedFraction).toBe(0);
    expect(state.uflsTripped.every((t) => !t)).toBe(true);
    expect(state.pShed).toBe(0);
    // consumul revine la 800 MW · (1 + 0,01 · (f - 50)); f din pasul anterior (autoreglajul)
    expectWithinPct(state.pLoad, 800 * (1 + 0.01 * (fBefore - F0)), 0.1, "consum după restore");
    expect(state.pLoad).toBeGreaterThan(shedLoadBefore + 150); // a revenit cel puțin sarcina deconectată
    expect(state.blackout).toBeNull();
  }, 30_000);

  it("P7 (negativ): without restoreShedLoad the shed load stays shed", () => {
    const state = island();
    simulate(state, CFG, 60, [{ type: "tripUnit", id: "lost" }]);
    const shed = state.shedFraction;
    expect(shed).toBeGreaterThan(0);
    simulate(state, CFG, 5);
    expect(state.shedFraction).toBeGreaterThanOrEqual(shed);
    expect(state.pShed).toBeGreaterThan(0);
  }, 30_000);
});

// ---------------------------------------------------------------- P8

describe("P8: evenimente invalide", () => {
  function simpleGrid(): GridState {
    return createGrid(
      CFG,
      [
        { id: "sync", kind: "ocgt", pMax: 1000, setpoint: 600 },
        { id: "bat", kind: "battery", pMax: 50, setpoint: 10, battery: { capacityMWh: 100, soc: 0.5 } },
      ],
      homes(610),
    );
  }

  it("P8: events with a nonexistent id are ignored (state equals a run without events)", () => {
    const withEvents = simpleGrid();
    const reference = simpleGrid();
    step(withEvents, CFG, {
      events: [
        { type: "tripUnit", id: "nope" },
        { type: "removeUnit", id: "nope" },
        { type: "setSetpoint", id: "nope", mw: 123 },
        { type: "removeLoad", id: "nope" },
        { type: "setLoad", id: "nope", mw: 5 },
        { type: "setAvailability", id: "nope", mw: 5 },
      ],
    });
    step(reference, CFG);
    expect(withEvents).toEqual(reference);
    expect(withEvents.log).toHaveLength(0);
  });

  it("P8: an event on an existing id does change the state (so the equality above is not trivial)", () => {
    const changed = simpleGrid();
    const reference = simpleGrid();
    step(changed, CFG, { events: [{ type: "setLoad", id: "load", mw: 5 }] });
    step(reference, CFG);
    expect(changed).not.toEqual(reference);
  });

  it("P8: duplicate unit id throws in createGrid and in the addUnit event", () => {
    const dup: UnitInit[] = [
      { id: "dup-unit", kind: "ocgt", pMax: 1000, setpoint: 600 },
      { id: "dup-unit", kind: "ocgt", pMax: 1000, setpoint: 600 },
    ];
    expect(() => createGrid(CFG, dup, homes(1200))).toThrow(/dup-unit/);

    const state = simpleGrid();
    expect(() =>
      step(state, CFG, {
        events: [{ type: "addUnit", unit: { id: "sync", kind: "ocgt", pMax: 1000, setpoint: 600 } }],
      }),
    ).toThrow(/sync/);
  });

  it("P8: duplicate load id throws in createGrid and in the addLoad event", () => {
    const sync: UnitInit = { id: "sync", kind: "ocgt", pMax: 1000, setpoint: 600 };
    expect(() =>
      createGrid(CFG, [sync], [
        { id: "dup-load", kind: "homes", mw: 300 },
        { id: "dup-load", kind: "homes", mw: 300 },
      ]),
    ).toThrow(/dup-load/);

    const state = simpleGrid();
    expect(() =>
      step(state, CFG, { events: [{ type: "addLoad", load: { id: "load", kind: "homes", mw: 10 } }] }),
    ).toThrow(/load/);
  });

  it("P8: a battery without battery parameters (or with capacity 0) throws", () => {
    expect(() =>
      createGrid(CFG, [{ id: "bad", kind: "battery", pMax: 10, setpoint: 0 }], homes(10)),
    ).toThrow(/bad/);
    expect(() =>
      createGrid(
        CFG,
        [{ id: "bad0", kind: "battery", pMax: 10, setpoint: 0, battery: { capacityMWh: 0, soc: 0.5 } }],
        homes(10),
      ),
    ).toThrow(/bad0/);
  });
});

// ---------------------------------------------------------------- P9, P10

/** Ca ceSystem(0) din grid.test.ts: sarcină 150 000 MW, hidro + OCGT 100 000 MW fiecare cu FCR 1 500 MW, 3 000 MW solar. */
function ceLike(): GridState {
  return createGrid(
    CFG,
    [
      { id: "hydro", kind: "hydro", pMax: 100_000, setpoint: 60_000, fcrReserveMW: 1500 },
      { id: "ocgt", kind: "ocgt", pMax: 100_000, setpoint: 87_000, fcrReserveMW: 1500 },
      { id: "lost", kind: "solar", pMax: 3000, setpoint: 3000 },
    ],
    homes(150_000),
  );
}

describe("P9: unitate deconectată cu FCR activ", () => {
  it("P9: tripping a unit that delivers FCR removes its contribution from fcrDeployed immediately", () => {
    // Pierdere 3 000 MW: abaterea (calcul de mână, ecuația din reviewer) ≈ 0,75 Hz la 18,7 s, ≈ 0,58 Hz la 30 s,
    // apoi decădere cu tau = 2·H·S/f0/(D·L) = 2·4·200 000/50/1 500 = 21 s -> ≈ 0,46 Hz la 35 s. Peste 0,21 Hz FCR-ul
    // țintă e plin, iar rampa (1 500 MW / 30 s) l-a adus la 1 500 MW pe unitate înainte de 35 s.
    const state = ceLike();
    simulate(state, CFG, 35, [{ type: "tripUnit", id: "lost" }]);
    expect(F0 - state.f).toBeGreaterThan(0.25); // precondiție: FCR cerut la maxim
    expectWithinPct(getUnit(state, "hydro").fcr, 1500, 1, "FCR hidro înainte de deconectare");
    expectWithinPct(getUnit(state, "ocgt").fcr, 1500, 1, "FCR OCGT înainte de deconectare");
    expectWithinPct(state.fcrDeployed, 3000, 1, "fcrDeployed înainte de deconectare");

    step(state, CFG, { events: [{ type: "tripUnit", id: "hydro" }] });

    const hydro = getUnit(state, "hydro");
    expect(hydro.online).toBe(false);
    expect(hydro.fcr).toBe(0);
    expect(hydro.p).toBe(0);
    // a rămas doar contribuția OCGT (1 500 MW; într-un pas se poate schimba cu cel mult 2,5 MW)
    expectWithinPct(state.fcrDeployed, 1500, 1, "fcrDeployed după deconectare");
    expect(state.fcrDeployed).toBeCloseTo(getUnit(state, "ocgt").fcr, 9);
  }, 30_000);

  it("P9: tripping an already tripped unit again does not log twice", () => {
    const state = ceLike();
    step(state, CFG, { events: [{ type: "tripUnit", id: "lost" }] });
    step(state, CFG, { events: [{ type: "tripUnit", id: "lost" }] });
    expect(state.log.filter((e) => e.type === "unit-tripped")).toHaveLength(1);
  });
});

describe("P10: livrarea efectivă de FCR la limită", () => {
  it("P10: a unit near pMax reports only the FCR it can actually deliver (<= pMax - initial p)", () => {
    // Hidro 1 000 MW la 950 MW cu rezervă FCR 200 MW; headroom = 50 MW. Bar OCGT 40 000 MW la 20 000 MW (fără FCR);
    // solar 100 MW se pierde; sarcină 21 050 MW; D·L = 0,01 · 21 050 = 210,5 MW/Hz.
    // FCR efectiv maxim 50 MW -> deficit net 50 MW -> abatere staționară 50 / 210,5 = 0,2375 Hz,
    // tau = 2·H·S/f0/(D·L) = 2 · 4,95 · 41 000 / 50 / 210,5 = 38,6 s; la 150 s abaterea ≈ 0,23 Hz.
    // Abatere > 0,06 Hz înseamnă FCR cerut > 50 MW (devEff · 200 / 0,2 > 50), deci cererea depășește headroom-ul.
    const state = createGrid(
      CFG,
      [
        { id: "bus", kind: "ocgt", pMax: 40_000, setpoint: 20_000 },
        { id: "hydro", kind: "hydro", pMax: 1000, setpoint: 950, fcrReserveMW: 200 },
        { id: "lost", kind: "solar", pMax: 100, setpoint: 100 },
      ],
      homes(21_050),
    );
    simulate(state, CFG, 150, [{ type: "tripUnit", id: "lost" }]);

    expect(state.blackout).toBeNull();
    expect(F0 - state.f).toBeGreaterThan(0.1); // precondiție: cererea FCR depășește clar 50 MW
    const hydro = getUnit(state, "hydro");
    expect(hydro.p).toBeLessThanOrEqual(1000 + 1e-9);
    expectWithinPct(hydro.p, 1000, 0.1, "puterea hidro la pMax");
    expect(hydro.fcr, `fcr raportat ${hydro.fcr} MW vs headroom 50 MW`).toBeLessThanOrEqual(50 + 1e-6);
    expectWithinPct(hydro.fcr, 50, 1, "fcr efectiv");
    expect(state.fcrDeployed).toBeCloseTo(hydro.fcr, 9);
    expect(state.fcrDeployed).toBeLessThanOrEqual(50 + 1e-6);
  }, 30_000);

  it("P10 (negativ): with enough headroom the unit delivers the whole FCR it is asked for", () => {
    // Același sistem, dar hidro la 500 MW (headroom 500 MW > 200 MW rezervă). Bar la 20 450 -> sarcină 21 050 MW.
    // FCR poate livra până la 200 MW (rampă 6,67 MW/s), deci se vede un FCR > 50 MW (nu e tăiat artificial).
    const state = createGrid(
      CFG,
      [
        { id: "bus", kind: "ocgt", pMax: 40_000, setpoint: 20_450 },
        { id: "hydro", kind: "hydro", pMax: 1000, setpoint: 500, fcrReserveMW: 200 },
        { id: "lost", kind: "solar", pMax: 100, setpoint: 100 },
      ],
      homes(21_050),
    );
    simulate(state, CFG, 150, [{ type: "tripUnit", id: "lost" }]);
    // deficit 100 MW, FCR = 1000·(Δf-0,01) MW/Hz (200 MW la 0,2 Hz): 100 = 1000·(Δf-0,01) + 210,5·Δf
    // -> Δf = 110 / 1210,5 = 0,0909 Hz, FCR ≈ 81 MW (> 50 MW); tau ≈ 6,7 s, deci stabil la 150 s.
    // Verificăm doar că depășește clar headroom-ul de 50 MW al cazului limitat.
    expect(getUnit(state, "hydro").fcr).toBeGreaterThan(60);
    expect(getUnit(state, "hydro").fcr).toBeLessThanOrEqual(200 + 1e-6);
  }, 30_000);
});

// ---------------------------------------------------------------- P11

describe("P11: baterie creată la limita SOC", () => {
  const bus: UnitInit = { id: "bus", kind: "ocgt", pMax: 100_000, setpoint: 50_000 };

  it("P11: a battery created with SOC 0 and a discharge setpoint has p = 0 from creation", () => {
    const state = createGrid(
      CFG,
      [bus, { id: "bat", kind: "battery", pMax: 50, setpoint: 50, battery: { capacityMWh: 100, soc: 0 } }],
      homes(50_000),
    );
    const bat = getUnit(state, "bat");
    expect(Math.abs(bat.p)).toBe(0); // înainte de orice step
    expect(bat.setpoint).toBe(50); // ținta cerută rămâne
    expect(state.pGen).toBe(50_000); // doar OCGT contribuie
  });

  it("P11: a battery created with SOC 1 and a charge setpoint has p = 0 from creation", () => {
    const state = createGrid(
      CFG,
      [bus, { id: "bat", kind: "battery", pMax: 50, setpoint: -50, battery: { capacityMWh: 100, soc: 1 } }],
      homes(50_000),
    );
    expect(Math.abs(getUnit(state, "bat").p)).toBe(0);
    expect(state.pGen).toBe(50_000);
  });

  it("P11 (negativ): a half-charged battery starts delivering its setpoint at creation", () => {
    const state = createGrid(
      CFG,
      [bus, { id: "bat", kind: "battery", pMax: 50, setpoint: 20, battery: { capacityMWh: 100, soc: 0.5 } }],
      homes(50_020),
    );
    expect(getUnit(state, "bat").p).toBe(20);
    expect(state.pGen).toBe(50_020);
  });
});
