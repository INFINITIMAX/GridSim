// P4: nivelul 1. L1 (stări), L2 (stele), L3 (buget), L4 (reechilibrare), L5 (evenimente scriptate).
import { describe, expect, it } from "vitest";
import { createSession } from "../../src/game";
import type { BuildKind } from "../../src/game";
import {
  accept,
  advanceBy,
  advanceUntil,
  builtIds,
  playToEnd,
  refusal,
  startedLevel,
  sumP,
  unitOf,
} from "./helpers";

describe("L1: stările nivelului", () => {
  it("pornește în prepare, cu timpul oprit și bugetul de 100", () => {
    const s = createSession("level1");
    const snap = s.snapshot();
    expect(snap.state).toBe("prepare");
    expect(snap.mode).toBe("level1");
    expect(snap.budget).toBe(100);
    expect(snap.t).toBe(0);
    expect(s.result()).toBeNull();

    s.advance(5);
    expect(s.snapshot().t, "în prepare timpul nu curge").toBe(0);
    expect(s.snapshot().state).toBe("prepare");
  });

  it("start() duce în running; al doilea start() e refuzat", () => {
    const s = createSession("level1");
    accept(s.start());
    expect(s.snapshot().state).toBe("running");
    expect(refusal(s.start()).length).toBeGreaterThan(0);
    expect(s.snapshot().state).toBe("running");
  });

  it("după 120 s jucați ajunge în won, nu mai devreme, și apoi timpul se oprește", () => {
    const s = startedLevel();
    advanceBy(s, 100, 1);
    expect(s.snapshot().state).toBe("running");
    expect(s.result(), "rezultatul nu există cât jocul rulează").toBeNull();

    advanceBy(s, 19, 1); // t = 119 s
    expect(s.snapshot().state, "la 119 s ziua nu s-a terminat").toBe("running");

    advanceBy(s, 2, 1); // t ≈ 121 s
    const end = s.snapshot();
    expect(end.state).toBe("won");
    expect(end.t).toBeCloseTo(120, 1);
    expect(s.result()).not.toBeNull();

    advanceBy(s, 10, 1);
    expect(s.snapshot().t, "după won advance nu mai avansează").toBeCloseTo(end.t, 9);
  });

  it("după won nu se mai poate construi sau demola", () => {
    const s = startedLevel();
    playToEnd(s);
    expect(refusal(s.build("solar")).length).toBeGreaterThan(0);
    expect(refusal(s.demolish("hydro")).length).toBeGreaterThan(0);
  });
});

describe("L2: stelele (nimic -> 1, o baterie -> 2, două baterii -> 3)", () => {
  it("nimic construit: 1 stea, cu UFLS peste 5%", () => {
    const r = playToEnd(startedLevel());
    expect(r.stars).toBe(1);
    expect(r.maxShedFraction).toBeGreaterThan(0.05);
    expect(r.reason.length).toBeGreaterThan(10);
  });

  it("o baterie: 2 stele, UFLS sub 5% dar nenul", () => {
    const r = playToEnd(startedLevel(["battery"]));
    expect(r.stars).toBe(2);
    expect(r.maxShedFraction).toBeLessThanOrEqual(0.05 + 1e-9);
    expect(r.reason.length).toBeGreaterThan(10);
  });

  it("două baterii: 3 stele, fără UFLS și nadir >= 49,2 Hz", () => {
    const r = playToEnd(startedLevel(["battery", "battery"]));
    expect(r.stars).toBe(3);
    expect(r.maxShedFraction).toBe(0);
    expect(r.nadirHz).toBeGreaterThanOrEqual(49.2);
    expect(r.reason.length).toBeGreaterThan(10);
  });

  it("două baterii: măsurătorile din snapshot coincid cu rezultatul", () => {
    const s = startedLevel(["battery", "battery"]);
    const r = playToEnd(s);
    const m = s.snapshot().measurements;
    expect(m.nadirHz).toBe(r.nadirHz);
    expect(m.maxShedFraction).toBe(r.maxShedFraction);
    expect(m.elapsedS).toBeCloseTo(120, 1);
  });

  it("lecția solarului: 2x solar dispar la apus și dau tot 1 stea, cu UFLS mare", () => {
    const r = playToEnd(startedLevel(["solar", "solar"]));
    expect(r.stars).toBe(1);
    expect(r.maxShedFraction).toBeGreaterThan(0.05);
  });

  it("stelele cresc cu numărul de baterii", () => {
    const stars = [0, 1, 2].map((n) => {
      const builds: BuildKind[] = Array.from({ length: n }, () => "battery");
      return playToEnd(startedLevel(builds)).stars;
    });
    expect(stars).toEqual([1, 2, 3]);
  });
});

describe("L3: bugetul", () => {
  const costs: [BuildKind, number][] = [
    ["battery", 40],
    ["ocgt", 30],
    ["hydro", 35],
    ["solar", 15],
    ["wind", 15],
  ];

  it.each(costs)("%s scade bugetul cu %i (din level1.md)", (kind, cost) => {
    const s = createSession("level1");
    accept(s.build(kind));
    expect(s.snapshot().budget).toBe(100 - cost);
  });

  it("construcția apare imediat în snapshot, în prepare", () => {
    const s = createSession("level1");
    expect(s.snapshot().units.map((u) => u.id)).toEqual(["hydro", "gas"]);
    accept(s.build("battery"));
    const snap = s.snapshot();
    expect(snap.units).toHaveLength(3);
    expect(builtIds(snap)).toHaveLength(1);
  });

  it("peste buget e refuzat cu motiv, iar bugetul și unitățile rămân neschimbate", () => {
    const s = createSession("level1");
    accept(s.build("battery"));
    accept(s.build("ocgt")); // rămân 30
    const reason = refusal(s.build("hydro")); // costă 35
    expect(reason.length).toBeGreaterThan(0);
    const snap = s.snapshot();
    expect(snap.budget).toBe(30);
    expect(snap.units).toHaveLength(4);
  });

  it("un cost egal cu bugetul rămas e acceptat (marginea), apoi orice e refuzat", () => {
    const s = createSession("level1");
    accept(s.build("battery")); // 60
    accept(s.build("ocgt")); // 30
    accept(s.build("solar")); // 15
    accept(s.build("wind")); // 0
    expect(s.snapshot().budget).toBe(0);
    expect(refusal(s.build("solar")).length).toBeGreaterThan(0);
    expect(s.snapshot().budget).toBe(0);
  });

  it("demolarea în prepare returnează costul și scoate unitatea", () => {
    const s = createSession("level1");
    accept(s.build("battery"));
    accept(s.build("solar"));
    expect(s.snapshot().budget).toBe(45);
    const battery = builtIds(s.snapshot()).find((id) => id.startsWith("battery"));
    expect(battery).toBeDefined();
    accept(s.demolish(battery ?? ""));
    const snap = s.snapshot();
    expect(snap.budget).toBe(85);
    expect(snap.units.some((u) => u.kind === "battery")).toBe(false);
    expect(snap.units).toHaveLength(3);
  });

  it("după demolare se poate cheltui iar bugetul recuperat", () => {
    const s = createSession("level1");
    accept(s.build("battery"));
    accept(s.build("battery")); // 20 rămase
    expect(refusal(s.build("battery")).length).toBeGreaterThan(0);
    const [first] = builtIds(s.snapshot());
    accept(s.demolish(first ?? ""));
    accept(s.build("battery")); // 60 -> 20 din nou
    expect(s.snapshot().budget).toBe(20);
  });

  it("unitățile de start (hydro, gas) nu se pot demola; un id necunoscut e refuzat", () => {
    const s = createSession("level1");
    expect(refusal(s.demolish("hydro")).length).toBeGreaterThan(0);
    expect(refusal(s.demolish("gas")).length).toBeGreaterThan(0);
    expect(refusal(s.demolish("nu-exista")).length).toBeGreaterThan(0);
    const snap = s.snapshot();
    expect(snap.units.map((u) => u.id)).toEqual(["hydro", "gas"]);
    expect(snap.budget).toBe(100);
  });

  it("în running nu se poate construi și nu se poate demola în nivel", () => {
    const s = createSession("level1");
    accept(s.build("solar"));
    const solarId = builtIds(s.snapshot())[0] ?? "";
    accept(s.start());
    const budgetBefore = s.snapshot().budget;

    expect(refusal(s.build("battery")).length).toBeGreaterThan(0);
    expect(refusal(s.demolish(solarId)).length).toBeGreaterThan(0);
    s.advance(1);
    const snap = s.snapshot();
    expect(snap.units, "hydro, gas, solar; nimic în plus").toHaveLength(3);
    expect(snap.units.some((u) => u.id === solarId)).toBe(true);
    expect(snap.budget).toBe(budgetBefore);
  });
});

describe("L4: reechilibrarea la start()", () => {
  // Calcul de mână. Sarcina = 570 MW. Hidro (900 MW) are minimul tehnic 0,2·900 = 180 MW;
  // gazul CCGT (200 MW) are 0,45·200 = 90 MW. Setpoint-uri de start: hidro 420, gaz 150.
  // Programat = 420 + 150 + construcții; surplus = programat - 570; se taie întâi hidro.
  const cases: { name: string; builds: BuildKind[]; hydro: number; gas: number }[] = [
    { name: "solar + eolian (+140)", builds: ["solar", "wind"], hydro: 420 - 140, gas: 150 },
    { name: "OCGT (+60)", builds: ["ocgt"], hydro: 420 - 60, gas: 150 },
    { name: "hidro nou (+50): se taie hidroul mare", builds: ["hydro"], hydro: 420 - 50, gas: 150 },
    { name: "solar + OCGT (+140)", builds: ["solar", "ocgt"], hydro: 420 - 140, gas: 150 },
    { name: "3x solar (+240) = exact marja hidroului", builds: ["solar", "solar", "solar"], hydro: 180, gas: 150 },
    {
      name: "3x solar + eolian (+300): hidro la minim, apoi gazul",
      builds: ["solar", "solar", "solar", "wind"],
      hydro: 180,
      gas: 90,
    },
  ];

  it.each(cases)("$name: producția programată = consum (570 MW)", ({ builds, hydro, gas }) => {
    const s = createSession("level1");
    for (const b of builds) {
      accept(s.build(b));
    }
    accept(s.start());
    const snap = s.snapshot();
    expect(sumP(snap)).toBeCloseTo(570, 6);
    expect(unitOf(snap, "hydro").p).toBeCloseTo(hydro, 6);
    expect(unitOf(snap, "gas").p).toBeCloseTo(gas, 6);
  });

  it("hidroul nou (100 MW) rămâne la setpointul lui; se taie hidroul de 900 MW", () => {
    const s = createSession("level1");
    accept(s.build("hydro"));
    accept(s.start());
    const snap = s.snapshot();
    const extra = builtIds(snap)[0] ?? "";
    expect(unitOf(snap, extra).p).toBeCloseTo(50, 6);
  });

  it("bateria nu schimbă bilanțul: hidro 420, gaz 150, baterie 0", () => {
    const s = createSession("level1");
    accept(s.build("battery"));
    accept(s.start());
    const snap = s.snapshot();
    expect(unitOf(snap, "hydro").p).toBeCloseTo(420, 6);
    expect(unitOf(snap, "gas").p).toBeCloseTo(150, 6);
    expect(sumP(snap)).toBeCloseTo(570, 6);
  });

  it("fără construcții nu se schimbă nimic", () => {
    const s = startedLevel();
    const snap = s.snapshot();
    expect(unitOf(snap, "hydro").p).toBeCloseTo(420, 6);
    expect(unitOf(snap, "gas").p).toBeCloseTo(150, 6);
  });

  it("surplus neabsorbabil (4x solar, +320 > 300 de marjă): start() refuzat, starea rămâne prepare", () => {
    const s = createSession("level1");
    for (let i = 0; i < 4; i++) {
      accept(s.build("solar"));
    }
    const reason = refusal(s.start());
    expect(reason).toMatch(/uncontrollable/i);
    const snap = s.snapshot();
    expect(snap.state).toBe("prepare");
    expect(snap.budget).toBe(40);
    s.advance(10);
    expect(s.snapshot().t, "timpul nu curge după un start refuzat").toBe(0);
  });

  it("după un start refuzat, demolarea unui solar permite start()", () => {
    const s = createSession("level1");
    for (let i = 0; i < 4; i++) {
      accept(s.build("solar"));
    }
    refusal(s.start());
    accept(s.demolish(builtIds(s.snapshot())[0] ?? ""));
    accept(s.start());
    const snap = s.snapshot();
    expect(snap.state).toBe("running");
    expect(unitOf(snap, "hydro").p).toBeCloseTo(180, 6);
  });

  const stable: { name: string; builds: BuildKind[] }[] = [
    { name: "solar + eolian", builds: ["solar", "wind"] },
    { name: "OCGT", builds: ["ocgt"] },
    { name: "hidro", builds: ["hydro"] },
    { name: "3x solar", builds: ["solar", "solar", "solar"] },
    { name: "solar + OCGT + eolian", builds: ["solar", "ocgt", "wind"] },
  ];

  it.each(stable)("$name: fără blackout și f < 50,2 Hz în primele 9 s", ({ builds }) => {
    const s = startedLevel(builds);
    let fMax = 0;
    for (let i = 0; i < 180; i++) {
      s.advance(0.05);
      const snap = s.snapshot();
      fMax = Math.max(fMax, snap.f);
      expect(snap.blackout, `blackout la t=${snap.t}`).toBeNull();
    }
    expect(fMax).toBeLessThan(50.2);
    expect(s.snapshot().t).toBeCloseTo(9, 1);
  });
});

describe("L5: evenimentele scriptate se aplică exact o dată, la timpul lor", () => {
  const slices = [0.016, 0.05, 0.1, 1.0];

  it.each(slices)("feliere %f s: fabrica (+40 MW) la 10 s, gazul offline după 50 s", (slice) => {
    const s = startedLevel();
    const messages: string[] = [];

    let snap = advanceUntil(s, 9, slice, messages);
    expect(snap.consumers.map((c) => c.id)).toEqual(["town"]);
    expect(unitOf(snap, "gas").online).toBe(true);

    snap = advanceUntil(s, 11, slice, messages);
    const factories = snap.consumers.filter((c) => c.id === "factory");
    expect(factories).toHaveLength(1);
    expect(factories[0]?.mw).toBe(40);
    expect(snap.consumers.reduce((sum, c) => sum + c.mw, 0)).toBe(610);
    expect(unitOf(snap, "gas").online).toBe(true);

    snap = advanceUntil(s, 49, slice, messages);
    expect(unitOf(snap, "gas").online, "gazul încă online la 49 s").toBe(true);

    snap = advanceUntil(s, 51, slice, messages);
    expect(unitOf(snap, "gas").online, "gazul offline la 51 s").toBe(false);
    expect(unitOf(snap, "gas").p).toBe(0);

    snap = advanceUntil(s, 60, slice, messages);
    expect(snap.consumers.filter((c) => c.id === "factory")).toHaveLength(1);
    expect(snap.units.filter((u) => u.id === "gas")).toHaveLength(1);

    expect(messages.filter((m) => /factory/i.test(m)), "mesajul fabricii o singură dată").toHaveLength(1);
    // The intro also mentions the gas plant, so match the trip message itself.
    expect(messages.filter((m) => /gas plant tripped/i.test(m)), "mesajul gazului o singură dată").toHaveLength(1);
    expect(snap.log.filter((e) => e.type === "unit-tripped" && e.detail.startsWith("gas"))).toHaveLength(1);
  });

  it.each([0.016, 0.05, 0.1])("feliere %f s: fabrica apare la t >= 10 s (niciodată mai devreme)", (slice) => {
    const s = startedLevel();
    let t = -1;
    for (let i = 0; i < 100_000 && t < 0; i++) {
      s.advance(slice);
      const snap = s.snapshot();
      if (snap.consumers.some((c) => c.id === "factory")) {
        t = snap.t;
      }
    }
    expect(t, "fabrica nu a apărut").toBeGreaterThan(0);
    expect(t).toBeGreaterThanOrEqual(10 - 1e-6);
    expect(t).toBeLessThanOrEqual(10 + slice + 2 * 0.05 + 1e-6);
  });

  it.each([0.016, 0.05, 0.1])("feliere %f s: gazul pică la t >= 50 s (niciodată mai devreme)", (slice) => {
    const s = startedLevel();
    let t = -1;
    for (let i = 0; i < 100_000 && t < 0; i++) {
      s.advance(slice);
      const snap = s.snapshot();
      if (!unitOf(snap, "gas").online) {
        t = snap.t;
      }
    }
    expect(t, "gazul nu a picat").toBeGreaterThan(0);
    expect(t).toBeGreaterThanOrEqual(50 - 1e-6);
    expect(t).toBeLessThanOrEqual(50 + slice + 2 * 0.05 + 1e-6);
  });

  it("mesajele narative au timpul scriptat (10 s și 50 s), în ordine", () => {
    const s = startedLevel();
    advanceBy(s, 55, 1);
    const msgs = s.snapshot().newMessages;
    // intro (creare), start, fabrică, gaz
    expect(msgs).toHaveLength(4);
    expect(msgs.map((m) => m.t)).toEqual([0, 0, 10, 50]);
    expect(msgs[2]?.text).toMatch(/factory/i);
    expect(msgs[3]?.text).toMatch(/gas/i);
  });
});
