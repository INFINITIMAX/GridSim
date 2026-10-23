# L4 · coder — lecțiile 10–12 din „Hydro · Pelton” (Generator, Load controller, The whole chain)

Planner: Claude (sesiunea principală). Data: 23-10-2026. Raportul îl scrii în `docs/handoff/L4-coder-raport.md`.

## Sarcina

Adaugi ultimele trei lecții în pagina `/learn/`. Lecțiile 1–9 sunt gata și aprobate de Lucian. După tine, toate cele 12 lecții sunt deblocate. Stilul, layout-ul și mecanica paginii rămân exact cele de acum.

## Citește înainte (în ordinea asta)

1. `docs/learn/pelton/plan.md`: secțiunea „Plan: lecțiile 10–12” (fișiere, contractul DOM extins, riscuri) și secțiunile anterioare ale contractului.
2. `docs/learn/pelton/lectia-10.md`, `lectia-11.md`, `lectia-12.md`: **conținutul exact**:
   - obiectul central;
   - callout-urile: textele din coloana „Text”, verbatim;
   - tab-urile;
   - simulatorul, cu formule, intervale, valori implicite și nota de limită;
   - ID-urile afirmațiilor.
3. Codul existent, ca model de stil și ca bază de reutilizat:
   - `learn/lessons.ts`, `learn/ui.ts`, `learn/main.ts`, `learn/toon.ts`;
   - `learn/scenes/pelton.ts`: `makeUnit`, `makeRunner`, `makeGenerator`, `makeCabinet`;
   - `learn/scenes/plant.ts`: scena L1, pe care o refolosește L12;
   - `learn/scenes/runner.ts` și `penstock.ts`: modelul pentru `setLesson(n)` și pentru animațiile oprite la schimbarea lecției;
   - `learn/sim/*.ts`, în special `friction.ts`, `efficiency.ts`, `jet.ts`, `power.ts`;
   - curba SVG din `mountEfficiency` (L8) din `ui.ts`, ca model pentru graficul din L11.
4. `AGENTS.md`: regulile repo-ului.

## Ce trebuie să facă

### Simulatoare, cod pur în `learn/sim/`

Fără three, fără DOM, cu tipuri explicite și un comentariu-sursă în capul fișierului. g = 9,81.

- **`generator.ts`** (L10):
  - `frequencyHz(poles, rpm)` = p·n/120;
  - `syncSpeedRpm(poles, hz)` = 120·hz/p;
  - `ratioFor50Hz(poles, turbineRpm)` = `syncSpeedRpm(poles, 50) / turbineRpm`.
- **`governor.ts`** (L11):
  - `TM_S = 2` (timpul de pornire, parametru de model);
  - `turbinePowerPU(w)` = w·(2 − w);
  - `waterStartS(lengthM, velocityMs, headM)` = L·V/(g·H) (ESHA ec. 6.34);
  - `frequencyTrace(loadPU, elc, tmS): number[]`:
    - frecvența în Hz la t = 0; 0,1; …; 10 s, adică 101 valori;
    - integrare RK4 cu pas 0,001 s a ecuației t_m·w·dw/dt = `turbinePowerPU(w)` − P_sarcină, pornind de la w = 1;
    - fără ELC: P_sarcină = loadPU, constant;
    - cu ELC: P_sarcină = `turbinePowerPU(w)`, deci w rămâne 1;
    - f = 50·w;
  - `ballastKW(p0KW, loadPU, elc)` = elc ? p0·(1 − loadPU) : 0.
- **`chain.ts`** (L12):
  - `GROSS_HEAD_M` vine din `friction.ts`, nu se redefinește;
  - `GEN_EFF = { maker: 0.91, small: 0.8 }`, `SMALL_TURBINE_EFF = 0.75`, `type MachineSet = "maker" | "small"`;
  - `chainKW(flowRatio, machines)` → `{ gross, net, shaft, elec, overall }`:
    - Qd = `jetFlowLps(jetSpeedMs(59, CV), NOZZLE_MM, 1)`, iar Q = q·Qd;
    - hf din `friction.ts` pentru conducta PE de 200 mm și 150 m, la debitul Q (exact ca în L4);
    - gross = 9,81·Q[m³/s]·60;
    - net = gross·(60 − hf)/60;
    - shaft = net·η_t, cu η_t = `turbineEfficiency(q, 1)` la `maker` și `SMALL_TURBINE_EFF` la `small`;
    - elec = shaft·`GEN_EFF[machines]`;
    - overall = elec/gross;
  - `annualKWh(elecKW, loadFactor)` = elec·8760·lf.

### Date (`learn/lessons.ts`)

- L10, L11 și L12 complete, cu textele din `lectia-1N.md`.
- `UNLOCKED = 12`.
- `SceneId` primește `"unit"` (L10 și L11); L12 folosește `"plant"`. `SimId` primește `"generator"`, `"governor"` și `"chain"`.
- **Nu folosi J6, K7, L6** și nimic marcat „de găsit”. L5 apare doar ca definiție a factorului de încărcare, nu ca „40 % e tipic”.
- Orice text afișat care afirmă ceva poartă ID-urile lui de afirmație.

### Scene

- **`learn/scenes/unit.ts`** (L10 și L11). Agregatul refolosește `makeRunner`, `makeGenerator` și `makeCabinet`, nu le redesenează.
  - L10:
    - `setDrive(drive: "direct" | "belt", ratio)`: ax continuu, sau două roți de curea cu diametrele în raportul dat și cureaua între ele;
    - `setPoles(p)`: 2–12 pete de poli pe rotorul generatorului, vizibile printr-o fereastră decupată în carcasă;
    - `setSpeeds(turbineRpm, genRpm)`: cele două rotoare se învârt proporțional, încetinit vizual, cu eticheta „slowed down”;
    - `setFreqOk(ok)`: indicatorul de pe panou devine verde sau gri.
  - L11:
    - satul stilizat (3–4 case cu becuri) legat prin cablu;
    - cutia ELC cu rezistența de balast (spirale);
    - `setVillage(loadPU)`: becuri aprinse proporțional;
    - `setBallast(pu)`: spiralele se înroșesc proporțional;
    - `runTrace(hz: number[], onDone)`: animează rotorul și indicatorul de frecvență pe ~10 s reale, după valorile date, iar la sfârșit cheamă `onDone`;
    - `stopRun()`: oprește animația fără să cheme `onDone`.
  - `setLesson(n)` comută între L10 și L11: ancore, `extent`, `target`, obiectele vizibile.
  - ID-uri de piese:
    - L10: `generator`, `poles`, `coupling`, `belt`, `frequency`;
    - L11: `village`, `elc`, `ballast`, `generator`, `flywheel`, unde `flywheel` e un disc pe axul generatorului.
- **`learn/scenes/plant.ts`** (L12):
  - adaugă `setChain(p: { gross; net; shaft; elec } | null)`: o panglică lată care urmează traseul apei (priză → conductă → centrală → linie → sat);
  - lățimea fiecărei porțiuni e proporțională cu puterea rămasă, iar la fiecare treaptă se desprinde o fâșie gri subțire, care arată pierderea;
  - `null` ascunde banda, iar **L1 trebuie să arate exact ca acum**;
  - ID-uri noi pentru callout-urile L12: `stream`, `penstock`, `turbine`, `generator`, `village`. Refolosește ancorele existente unde se potrivesc.
- Miniaturile pentru 10–12: cum e mai simplu. Nu fac obiectul unui gate.

### Simulatoare în UI (cardul „Try it yourself”, același stil)

**L10:**
- intrări:
  - `<select name=turbine>` cu 3000, 1500, 1000, 750, 600, 500 (750);
  - `<select name=poles>` cu 2–12, doar numere pare (4);
  - `<select name=drive>` cu `direct` („Direct shaft”) și `belt` („Belt”) (belt);
  - `ratio` 1,0–4,0, pas 0,1 (2,0), dezactivat la `direct`.
- ieșiri:

| `data-out` | Format | Exemplu |
|---|---|---|
| `gen` | fără zecimale | „1500 rpm” |
| `freq` | 1 zecimală | „50.0 Hz” |
| `need` | 2 zecimale | „2.00” |
| `ok` | text, vizibil doar la \|f − 50\| < 0,5 | „50 Hz ✓” |

**L11:**
- intrări:
  - `load` 0–100 %, pas 5 (0);
  - `<input type=checkbox name=elc>`, bifat;
  - butonul `[data-run]` „Run 10 s”.
- Ieșirile se calculează **imediat** la orice schimbare de intrare, din `frequencyTrace`. Butonul doar pornește `runTrace` și desenează progresiv graficul.

| `data-out` | Format | Exemplu, fără ELC, consum 0 % | Exemplu, cu ELC, consum 0 % |
|---|---|---|---|
| `f1` | 1 zecimală | „69.7 Hz” | „50.0 Hz” |
| `f10` | 1 zecimală | „99.7 Hz” | „50.0 Hz” |
| `ballast` | 1 zecimală | „0.0 kW” | „14.6 kW” |
| `village` | 1 zecimală | „0.0 kW” | „0.0 kW” |
| `warn` | text, vizibil doar când max f > 55 Hz | textul din `lectia-11.md` | ascuns |

- P₀ = `powerKW(59, Qd, 0.6)`, cu Qd ca la L12.
- `<svg data-curve>`:
  - f(t) pe 0–10 s, axa 40–100 Hz;
  - o linie de referință la 50 Hz;
  - etichete „t (s)” și „f (Hz)”;
  - culori din variabilele CSS.

**L12:**
- intrări:
  - `flow` 10–100 %, pas 1 (100);
  - `<select name=machines>` cu `maker` și `small`, cu etichetele din `lectia-12.md`;
  - `load` 10–100 %, pas 5 (40).
- ieșiri:

| `data-out` | Format | Exemplu, maker, 100 % |
|---|---|---|
| `gross` | 1 zecimală | „24.7 kW” |
| `net` | 1 zecimală | „24.2 kW” |
| `shaft` | 1 zecimală | „21.1 kW” |
| `elec` | 1 zecimală | „19.2 kW” |
| `overall` | 1 zecimală | „77.7 %” |
| `energy` | rotunjit la 100, cu virgulă pentru mii | „67,200 kWh/yr” |

- scena urmează `setChain`.

Sub fiecare simulator pui nota de limită din documentul lecției.

### Pagina

- `main.ts` leagă scenele noi și oprește `runTrace` la schimbarea lecției. Lecțiile 1–9 nu trebuie să se schimbe vizual; L1 în special, deși folosește aceeași scenă ca L12.
- `window.__learnReady` și restul contractului rămân.
- Cu toate cele 12 lecții deblocate, nicio lecție nu mai apare cu lacăt.

## Constrângeri dure

- TypeScript strict. three din npm (0.180). Fără dependențe noi. Nu copia nimic de la learn-arduino-red.vercel.app.
- Nu inventa conținut tehnic: orice text vine din `lectia-10.md`, `lectia-11.md` sau `lectia-12.md`. Dacă lipsește ceva, scrie în raport.
- Fără cod mort, fără opțiuni nefolosite, fără abstracții noi dacă un pattern existent ajunge. Refolosește helperii din `toon.ts` și `ui.ts`, piesele din `pelton.ts`, funcțiile din `learn/sim/`.

## Ce nu ai voie să atingi

- `src/`, `2d/`, `map/`, `plant/` (folderul de la rădăcina repo-ului, nu `learn/scenes/plant.ts`), `art/`;
- `tests/`, inclusiv `tests/learn/`;
- `scripts/`;
- `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `package.json`;
- `docs/`, în afară de raportul tău.

## Rezultatul așteptat

- Fișierele noi și cele schimbate din `learn/`.
- `docs/handoff/L4-coder-raport.md` cu:
  - lista fișierelor;
  - ce ai refolosit și ce ai scris nou;
  - abaterile de la brief, cu motivul lor;
  - ce n-ai putut face.

Nu rulezi comenzi și nu poți spune că ceva „trece”; planner-ul rulează verificările.
