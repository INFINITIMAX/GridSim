// Teste X1-X6 pentru extensiile P4a: FFR la baterii, ISLAND_CONFIG, prioritatea FCR la limită,
// setSetpoint limitat. Valorile așteptate vin din calcule de mână (vezi docs/handoff/P4a-tester-raport.md),
// nu din rularea modelului.
//
// Metodă: pentru FCR/aFRR la limită, frecvența se ține fixă (runPinned), ca cererea să fie constantă
// și calculul de mână exact. Fiecare grilă are o bară OCGT de 100 000 MW (H = 5 s), ca un singur pas
// să nu poată declanșa protecții. dt = 0,05 s.
import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, ISLAND_CONFIG } from "../../src/model/config";
import type { GridConfig } from "../../src/model/config";
import { createGrid } from "../../src/model/grid";
import type { GridState, UnitInit } from "../../src/model/grid";
import { getUnit, homes, runPinned, simulate } from "./helpers";

const BUS: UnitInit = { id: "bus", kind: "ocgt", pMax: 100_000, setpoint: 50_000 };

/** Bara + `units`; sarcina = 50 000 MW + `extraLoadMW` (suma setpoint-urilor unităților), deci aproape echilibrat. */
function gridWith(cfg: GridConfig, units: UnitInit[], extraLoadMW: number): GridState {
  return createGrid(cfg, [BUS, ...units], homes(50_000 + extraLoadMW));
}

// ---------------------------------------------------------------- X1

describe("X1: FFR la baterii (spec.fcrFullTimeS = 1 s)", () => {
  // Frecvență fixă 49,3 Hz: dev = -0,7 Hz. Cu DEFAULT: devEff = -0,69, /0,2 > 1 -> țintă plină (+100 MW).
  // Cu ISLAND: devEff = -0,69, /0,5 = 1,38 > 1 -> țintă plină. Deci ținta e 100 MW în ambele configurări.
  // Bateria (rezervă 100 MW, fcrFullTimeS 1): pas = 100/1 · 0,05 = 5 MW -> 20 pași (1 s) = 100 MW; 10 pași = 50 MW.
  // OCGT cu aceeași rezervă: pas = 100/T · 0,05; după 1 s livrează 100/T (T = 30 DEFAULT, T = 10 ISLAND).
  const cases: ReadonlyArray<[string, GridConfig, number]> = [
    ["DEFAULT_CONFIG", DEFAULT_CONFIG, 100 / 30],
    ["ISLAND_CONFIG", ISLAND_CONFIG, 100 / 10],
  ];

  function build(cfg: GridConfig): GridState {
    return gridWith(
      cfg,
      [
        { id: "peaker", kind: "ocgt", pMax: 200, setpoint: 100, fcrReserveMW: 100 },
        {
          id: "bat",
          kind: "battery",
          pMax: 200,
          setpoint: 0,
          fcrReserveMW: 100,
          battery: { capacityMWh: 1000, soc: 0.5 },
        },
      ],
      100,
    );
  }

  for (const [name, cfg, peakerAfter1s] of cases) {
    it(`X1: with ${name}, a 100 MW battery delivers 100% FCR in 1 s (50% at 0.5 s), an OCGT with the same reserve only ${peakerAfter1s.toFixed(2)} MW`, () => {
      const state = build(cfg);
      runPinned(state, cfg, 0.5, 49.3);
      expect(getUnit(state, "bat").fcr).toBeCloseTo(50, 6);

      runPinned(state, cfg, 0.5, 49.3);
      const bat = getUnit(state, "bat");
      const peaker = getUnit(state, "peaker");
      expect(bat.fcr).toBeCloseTo(100, 6);
      expect(bat.p).toBeCloseTo(100, 6); // livrat efectiv, nu doar raportat (setpoint 0 + FCR)
      expect(peaker.fcr).toBeCloseTo(peakerAfter1s, 6);
      expect(state.fcrDeployed).toBeCloseTo(100 + peakerAfter1s, 6);
      expect(state.blackout).toBeNull();

      // rămâne la 100 MW (ținta), nu depășește
      runPinned(state, cfg, 1, 49.3);
      expect(getUnit(state, "bat").fcr).toBeCloseTo(100, 6);
    });
  }

  it("X1 (negativ): a battery without its own ramp spec would follow config.fcrFullTimeS; an OCGT does", () => {
    // Același scenariu cu fcrFullTimeS = 4 s în config: OCGT-ul livrează după 1 s 100/4 = 25 MW (urmează config-ul),
    // bateria tot 100 MW (specificația ei bate config-ul). Prinde o implementare care aplică 1 s tuturor sau nimănui.
    const cfg: GridConfig = { ...DEFAULT_CONFIG, fcrFullTimeS: 4 };
    const state = build(cfg);
    runPinned(state, cfg, 1, 49.3);
    expect(getUnit(state, "peaker").fcr).toBeCloseTo(25, 6);
    expect(getUnit(state, "bat").fcr).toBeCloseTo(100, 6);
  });
});

// ---------------------------------------------------------------- X2

describe("X2: ISLAND_CONFIG", () => {
  it("X2: differs from DEFAULT_CONFIG only in fcrFullTimeS (10 s) and fcrFullDeviationHz (0.5 Hz)", () => {
    expect(ISLAND_CONFIG.fcrFullTimeS).toBe(10);
    expect(ISLAND_CONFIG.fcrFullDeviationHz).toBe(0.5);
    expect({ ...ISLAND_CONFIG, fcrFullTimeS: 30, fcrFullDeviationHz: 0.2 }).toEqual(DEFAULT_CONFIG);
  });

  function build(cfg: GridConfig): GridState {
    return gridWith(cfg, [{ id: "peaker", kind: "ocgt", pMax: 200, setpoint: 100, fcrReserveMW: 100 }], 100);
  }

  // țintă = -clamp(devEff / 0,5, -1, 1) · 100; devEff = |dev| - 0,01.
  // Rampa: 100/10 · 0,05 = 0,5 MW/pas = 10 MW/s.
  it("X2: at -0.6 Hz an OCGT with FCR 100 MW reaches 50 MW at 5 s and the full 100 MW at 10 s (DEFAULT would give 16.7 and 33.3)", () => {
    const state = build(ISLAND_CONFIG);
    runPinned(state, ISLAND_CONFIG, 5, 49.4);
    expect(getUnit(state, "peaker").fcr).toBeCloseTo(50, 6);
    runPinned(state, ISLAND_CONFIG, 5, 49.4);
    expect(getUnit(state, "peaker").fcr).toBeCloseTo(100, 6);
    expect(state.blackout).toBeNull();
  });

  it("X2: at -0.3 Hz the FCR target is 58 MW (0.29 / 0.5 · 100), not the full reserve", () => {
    // devEff = 0,29 -> 0,58 · 100 = 58 MW; atins la 5,8 s, deci la 20 s e stabil. Cu fcrFullDeviationHz = 0,2 ar fi 100 MW.
    const state = build(ISLAND_CONFIG);
    runPinned(state, ISLAND_CONFIG, 20, 49.7);
    expect(getUnit(state, "peaker").fcr).toBeCloseTo(58, 6);
  });

  it("X2: at exactly -0.2 Hz the FCR is not full: target 38 MW (0.19 / 0.5 · 100)", () => {
    const state = build(ISLAND_CONFIG);
    runPinned(state, ISLAND_CONFIG, 20, 49.8);
    expect(getUnit(state, "peaker").fcr).toBeCloseTo(38, 6);
  });

  it("X2 (control): with DEFAULT_CONFIG the same 20 s at -0.3 Hz gives the ramp-limited 66.7 MW (30 s ramp, full target 100)", () => {
    // 100/30 · 20 = 66,67 MW < 100 (ținta plină la 0,2 Hz): confirmă că diferențele de mai sus vin din preset.
    const state = build(DEFAULT_CONFIG);
    runPinned(state, DEFAULT_CONFIG, 20, 49.7);
    expect(getUnit(state, "peaker").fcr).toBeCloseTo(100 * (20 / 30), 6);
  });
});

// ---------------------------------------------------------------- X3 / X4

/** Hidro 1 000 MW (rampă 5 MW/s la aFRR), setpoint dat; bară + sarcină echilibrată. */
function hydroGrid(setpoint: number, fcrReserveMW: number, afrrReserveMW: number): GridState {
  return gridWith(
    DEFAULT_CONFIG,
    [{ id: "h", kind: "hydro", pMax: 1000, setpoint, fcrReserveMW, afrrReserveMW }],
    setpoint,
  );
}

describe("X3: prioritate FCR la limită, semne egale", () => {
  // Hidro pMax 1 000 la setpoint 950 (headroom 50 MW), FCR 40 MW, aFRR 60 MW; f fixă 49,5 Hz.
  // FCR: țintă +40 (devEff 0,49 / 0,2 > 1); rampa 40/30 = 1,333 MW/s -> 40 MW după 30 s.
  // aFRR: sarcina L = 50 950 MW, e = 0,5 Hz -> kp·L·e = 254,9 MW >= 60, integrala nu coboară sub 0 -> comanda = +60
  //   (saturată); rampa hidro 0,3·1000/60 = 5 MW/s -> 60 MW cerut după 12 s.
  // La 15 s: FCR nu e tăiat încă (950 + 20 < 1000): fcr = 1,333·15 = 20 MW; aFRR primește restul: 1000 - 970 = 30 MW.
  // Staționar: FCR 40 (intră întreg: 990 <= 1000), aFRR = 1000 - 990 = 10 MW. Tăierea proporțională veche
  //   ar fi dat FCR 20 / aFRR 30 (k = 50/100).
  it("X3: with headroom 50 MW, FCR asks 40 and aFRR asks 60, FCR is delivered whole (40) and aFRR gets 10", () => {
    const state = hydroGrid(950, 40, 60);

    runPinned(state, DEFAULT_CONFIG, 15, 49.5);
    let h = getUnit(state, "h");
    expect(h.fcr, "fcr la 15 s").toBeCloseTo(20, 6);
    expect(h.afrr, "afrr la 15 s").toBeCloseTo(30, 6);
    expect(h.p).toBeCloseTo(1000, 6);

    runPinned(state, DEFAULT_CONFIG, 45, 49.5);
    h = getUnit(state, "h");
    expect(h.fcr, "fcr la 60 s").toBeCloseTo(40, 6);
    expect(h.afrr, "afrr la 60 s").toBeCloseTo(10, 6);
    expect(h.p).toBeCloseTo(1000, 6);
    expect(h.p).toBeLessThanOrEqual(1000 + 1e-9);
    // raportarea e coerentă cu livrarea: fcr + afrr = p - setpoint
    expect(h.fcr + h.afrr).toBeCloseTo(h.p - 950, 6);
    expect(state.fcrDeployed).toBeCloseTo(40, 6);
    expect(state.afrrDeployed).toBeCloseTo(10, 6);
    expect(state.blackout).toBeNull();
  });

  it("X3 (negativ): with enough headroom (150 MW) nothing is cut: FCR 40 and aFRR 60", () => {
    // 800 + 40 + 60 = 900 <= 1000: p = raw, deci nicio tăiere.
    const state = hydroGrid(800, 40, 60);
    runPinned(state, DEFAULT_CONFIG, 60, 49.5);
    const h = getUnit(state, "h");
    expect(h.fcr).toBeCloseTo(40, 6);
    expect(h.afrr).toBeCloseTo(60, 6);
    expect(h.p).toBeCloseTo(900, 6);
  });
});

describe("X4: prioritate FCR la limită, semne opuse (fcr +, aFRR -)", () => {
  // f fixă 49,7 Hz (FCR +). Pentru aFRR negativ pe o frecvență sub nominal, integrala se pune de la început la
  // -1e6 MW (stare publică): comanda = clamp(kp·L·e + I, -R, R) = -R. Integrala revine spre ~+296 MW cu
  // tau = trackingTimeS = 30 s; raw >= -R abia după ~30·ln(1e6/460) = ~230 s, deci pe toată fereastra de test
  // (<= 120 s) aFRR rămâne la -R. Rampa aFRR: 5 MW/s; rampa FCR: 40/30 MW/s.
  const I0 = -1e6;

  // Netul e livrabil: setpoint 980, FCR +40, aFRR -30 -> raw = 990 <= 1000, deci p = raw și nimic nu se taie,
  // deși FCR singur (980 + 40 = 1 020) ar depăși limita. Livrare: fcr 40, aFRR -30, p 990.
  it("X4a: net deliverable (980 + 40 - 30 = 990 <= 1000): both are delivered whole, nothing is cut", () => {
    const state = hydroGrid(980, 40, 30);
    state.afrrIntegralMW = I0;
    let maxP = -Infinity;
    runPinned(state, DEFAULT_CONFIG, 100, 49.7, [], (s) => {
      maxP = Math.max(maxP, getUnit(s, "h").p);
    });
    const h = getUnit(state, "h");
    expect(h.fcr).toBeCloseTo(40, 6);
    expect(h.afrr).toBeCloseTo(-30, 6);
    expect(h.p).toBeCloseTo(990, 6);
    expect(maxP).toBeLessThanOrEqual(990 + 1e-6);
    expect(state.fcrDeployed).toBeCloseTo(40, 6);
    expect(state.afrrDeployed).toBeCloseTo(-30, 6);
    expect(state.blackout).toBeNull();
  });

  // Net peste limită: setpoint 980, FCR +40, aFRR -10 -> cerut net +30, livrabil +20 (p = 1 000).
  // Regulă: la limită se taie doar componentele care împing spre limita depășită (întâi aFRR, apoi FCR);
  // cele în sens opus nu se taie. Aici limita de sus e depășită: FCR (+) împinge spre ea, aFRR (-) nu.
  // Deci aFRR rămâne -10 (neatins), iar FCR se taie la 30: 980 + 30 - 10 = 1 000.
  // Maximul posibil: p = 1 000 la fiecare pas după ce FCR a ajuns la rampă (> 30 s).
  it("X4b: net above the limit: delivery is the maximum possible (p = 1000 at every step in 60-120 s), afrr untouched (-10), fcr = 30", () => {
    const state = hydroGrid(980, 40, 10);
    state.afrrIntegralMW = I0;
    let minP = Infinity;
    let maxP = -Infinity;
    runPinned(state, DEFAULT_CONFIG, 120, 49.7, [], (s) => {
      if (s.t > 60) {
        const p = getUnit(s, "h").p;
        minP = Math.min(minP, p);
        maxP = Math.max(maxP, p);
      }
    });
    expect(maxP).toBeLessThanOrEqual(1000 + 1e-9);
    expect(minP, `puterea minimă în 60-120 s: ${minP} MW (maximul posibil e 1000)`).toBeGreaterThanOrEqual(1000 - 1e-6);
    const h = getUnit(state, "h");
    expect(h.fcr + h.afrr).toBeCloseTo(20, 6);
    expect(h.afrr).toBeCloseTo(-10, 6);
    expect(h.fcr).toBeCloseTo(30, 6);
  });

  // Oglinda la limita de jos (minLoad). Hidro minLoad 20% = 200 MW, setpoint 220 (spațiu în jos: 20 MW).
  // f fixă 50,3 Hz: FCR țintă -40 (devEff 0,29 / 0,2 > 1). aFRR +10: e = -0,3, integrala +1e6 -> comanda = +10
  // (integrala revine spre ~-296 cu tau = 30 s; raw >= 10 încă ~230 s, deci pe toată fereastra).
  // Cerut net: 220 - 40 + 10 = 190 < 200; livrabil: 200. FCR (-) împinge spre limita depășită, aFRR (+) nu.
  // Deci aFRR rămâne +10, iar FCR se taie la -30: 220 - 30 + 10 = 200.
  it("X4c: mirror at minLoad: fcr negative, afrr positive; afrr untouched (+10), fcr cut to -30, p = 200", () => {
    const state = hydroGrid(220, 40, 10);
    state.afrrIntegralMW = -I0;
    let maxP = -Infinity;
    runPinned(state, DEFAULT_CONFIG, 120, 50.3, [], (s) => {
      if (s.t > 60) {
        maxP = Math.max(maxP, getUnit(s, "h").p);
      }
    });
    const h = getUnit(state, "h");
    expect(h.p).toBeCloseTo(200, 6);
    expect(maxP).toBeLessThanOrEqual(200 + 1e-6);
    expect(h.afrr).toBeCloseTo(10, 6);
    expect(h.fcr).toBeCloseTo(-30, 6);
    expect(h.fcr + h.afrr).toBeCloseTo(-20, 6);
    expect(state.blackout).toBeNull();
  });
});

// ---------------------------------------------------------------- X5

describe("X5: setSetpoint limitat la [minLoad·pMax, pMax] pentru unități online", () => {
  // OCGT 1 000 MW: minLoad 45% = 450 MW, rampă 10%/min = 100 MW/min = 1,667 MW/s = 0,0833 MW/pas.
  // Pornește la 460, i se cere 0 -> setpoint raportat 450. Rampa coboară 460 -> 450 în 6 s și se oprește la 450.
  // Fără clamp pe ținta de rampă, ea ar continua spre 0 (în 20 s: 460 - 33,3 = 426,7), iar la o cerere de urcare
  // p ar sta la 450 încă (450 - 426,7) / 1,667 = 14 s (timp mort). Cu clamp: după 1 s de urcare p = 450 + 20·0,0833 = 451,667.
  function build(): GridState {
    return gridWith(DEFAULT_CONFIG, [{ id: "u", kind: "ocgt", pMax: 1000, setpoint: 460 }], 460);
  }

  it("X5: setpoint 0 on an online OCGT is reported as 450 MW (minLoad · pMax) and the ramp target stops there", () => {
    const state = build();
    simulate(state, DEFAULT_CONFIG, 20, [{ type: "setSetpoint", id: "u", mw: 0 }]);
    const u = getUnit(state, "u");
    expect(u.setpoint).toBeCloseTo(450, 9);
    expect(u.setpointRamped).toBeCloseTo(450, 6);
    expect(u.p).toBeCloseTo(450, 6);
    expect(u.online).toBe(true);
  });

  it("X5: after being held at the minimum, a raise request moves p immediately (no dead time)", () => {
    const state = build();
    simulate(state, DEFAULT_CONFIG, 20, [{ type: "setSetpoint", id: "u", mw: 0 }]);
    simulate(state, DEFAULT_CONFIG, 1, [{ type: "setSetpoint", id: "u", mw: 800 }]);
    // 20 pași · 0,08333 MW = 1,6667 MW
    expect(getUnit(state, "u").p).toBeCloseTo(450 + 100 / 60, 3);
    expect(getUnit(state, "u").setpoint).toBe(800);
  });

  // [kind, pMax, setpoint inițial, cerut, așteptat]
  const clampCases: ReadonlyArray<[string, UnitInit["kind"], number, number, number, number]> = [
    ["OCGT above pMax -> pMax", "ocgt", 1000, 500, 5000, 1000],
    ["hydro below minimum 20% -> 200", "hydro", 1000, 500, 10, 200],
    ["coal below minimum 35% -> 350", "coal", 1000, 500, 0, 350],
    ["solar negative -> 0 (minLoad 0)", "solar", 100, 50, -5, 0],
    ["wind negative -> 0 (minLoad 0)", "wind", 100, 50, -5, 0],
    ["solar above pMax -> pMax", "solar", 100, 50, 500, 100],
  ];
  for (const [label, kind, pMax, init, requested, expected] of clampCases) {
    it(`X5: ${label}`, () => {
      const state = gridWith(DEFAULT_CONFIG, [{ id: "u", kind, pMax, setpoint: init }], init);
      simulate(state, DEFAULT_CONFIG, 0.05, [{ type: "setSetpoint", id: "u", mw: requested }]);
      expect(getUnit(state, "u").setpoint).toBeCloseTo(expected, 9);
    });
  }

  it("X5 (negativ): a request inside [min, pMax] is taken as is", () => {
    const state = build();
    simulate(state, DEFAULT_CONFIG, 0.05, [{ type: "setSetpoint", id: "u", mw: 700 }]);
    expect(getUnit(state, "u").setpoint).toBe(700);
  });
});

// ---------------------------------------------------------------- X6

describe("X6: setSetpoint la baterie (încărcare până la -pMax)", () => {
  // Baterie 50 MW, 100 MWh, SOC 0,5. Rampă 60·50/60 = 50 MW/s = 2,5 MW/pas.
  // -30 MW: 12 pași (0,6 s), la 1 s p = -30. -100 -> -50 (pMax); +100 -> +50.
  function build(): GridState {
    return gridWith(
      DEFAULT_CONFIG,
      [{ id: "bat", kind: "battery", pMax: 50, setpoint: 0, battery: { capacityMWh: 100, soc: 0.5 } }],
      0,
    );
  }

  it("X6: a negative setpoint (-30 MW) is accepted, the battery charges at -30 MW and SOC rises", () => {
    const state = build();
    simulate(state, DEFAULT_CONFIG, 1, [{ type: "setSetpoint", id: "bat", mw: -30 }]);
    const bat = getUnit(state, "bat");
    expect(bat.setpoint).toBe(-30);
    expect(bat.p).toBeCloseTo(-30, 6);
    expect(bat.battery?.soc ?? 0).toBeGreaterThan(0.5);
  });

  it("X6: the setpoint is limited to -pMax (-100 -> -50) and to +pMax (100 -> 50)", () => {
    const state = build();
    simulate(state, DEFAULT_CONFIG, 2, [{ type: "setSetpoint", id: "bat", mw: -100 }]);
    expect(getUnit(state, "bat").setpoint).toBe(-50);
    expect(getUnit(state, "bat").p).toBeCloseTo(-50, 6);

    simulate(state, DEFAULT_CONFIG, 4, [{ type: "setSetpoint", id: "bat", mw: 100 }]);
    expect(getUnit(state, "bat").setpoint).toBe(50);
    expect(getUnit(state, "bat").p).toBeCloseTo(50, 6);
  });
});
