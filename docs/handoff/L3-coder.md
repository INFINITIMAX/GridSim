# L3 · coder — lecțiile 7–9 din „Hydro · Pelton” (Pelton runner, Efficiency, Speed, size, choice)

Planner: Claude (sesiunea principală). Data: 23-10-2026. Raportul îl scrii în `docs/handoff/L3-coder-raport.md`.

## Sarcina

Adaugi lecțiile 7–9 în pagina `/learn/` existentă. Lecțiile 1–6 sunt gata și aprobate de Lucian. După tine, lecțiile 1–9 sunt deblocate și 10–12 rămân blocate. Stilul, layout-ul și mecanica paginii rămân exact cele de acum.

## Citește înainte (în ordinea asta)

1. `docs/learn/pelton/plan.md`: secțiunea „Plan: lecțiile 7–9” (fișiere, contractul DOM extins, riscuri) și secțiunile anterioare ale contractului.
2. `docs/learn/pelton/lectia-07.md`, `lectia-08.md`, `lectia-09.md`: **conținutul exact**:
   - obiectul central;
   - callout-urile: textele din coloana „Text”, verbatim;
   - tab-urile;
   - simulatorul, cu formulele, intervalele, valorile implicite și nota de limită;
   - ID-urile afirmațiilor.
3. Codul existent, ca model de stil și ca bază de reutilizat:
   - `learn/lessons.ts`, `learn/ui.ts`, `learn/main.ts`, `learn/toon.ts`;
   - `learn/scenes/pelton.ts`: `makeRunner`, `makeNozzle`, `makeGenerator`, `RUN`, `R`;
   - `learn/scenes/nozzle.ts`, `learn/scenes/penstock.ts`: ca model pentru o scenă nouă cu `setX` și animație oprită la schimbarea lecției;
   - `learn/sim/*.ts`.
4. `AGENTS.md`: regulile repo-ului.

## Ce trebuie să facă

### Simulatoare, cod pur în `learn/sim/`

Fără three, fără DOM, cu tipuri explicite și un comentariu-sursă în capul fișierului, ca în `jet.ts`. g = 9,81 și ρ = 1000.

- **`bucket.ts`** (L7):
  - `DEFLECTION_DEG = 165`, `K_IDEAL = 1`;
  - `bucketEfficiency(ratio, deflectionDeg, k)` = 2·(1 − r)·r·(1 + k·cos φ), cu φ = 180° − θ, în radiani la calcul;
  - `exitSpeedMs(jetMs, ratio, deflectionDeg, k)`: cu u = r·v₁ și w = k·(v₁ − u), întoarce √[(u − w·cos φ)² + (w·sin φ)²];
  - `jetPowerKW(flowLps, jetMs)` = ½·ρ·Q·v₁² / 1000, cu Q în m³/s.
- **`efficiency.ts`** (L8), curba RETScreen Pelton:
  - `peakEfficiency(jets)`: 0,89 pentru 1 jet, 0,90 pentru 2 sau mai multe (ESHA tab. 6.7);
  - `peakFlowRatio(jets)` = 0,662 + 0,001·j;
  - `relativeEfficiency(flowRatio, jets)` = 1 − (1,31 + 0,025·j) · |(qp − q)/qp|^(5,6 + 0,4·j), cu qp = `peakFlowRatio(jets)`. **Atenție:** coeficientul (1,31 + 0,025j) **înmulțește** puterea, nu e ridicat la ea;
  - `turbineEfficiency(flowRatio, jets)` = `relativeEfficiency` × `peakEfficiency`.
  - Puterea la ax se calculează cu `powerKW(59, Q_Lps, η)` din `power.ts`, nu cu o funcție nouă.
- **`specific.ts`** (L9):
  - `specificSpeed(rpm, flowM3s, headM)` = (rpm/60)·√Q / (9,81·H)^0,75;
  - `peltonDiameterM(headM, rpm)` = 0,68·√H / (rpm/60);
  - `type Turbine = "pelton" | "francis" | "kaplan"`;
  - `fittingTurbines(nqe, headM, jets): Turbine[]`, cu benzile și domeniile de cădere din tabelul din `lectia-09.md`. Limitele sunt inclusive. Ordinea rezultatului e pelton, francis, kaplan.

### Date (`learn/lessons.ts`)

- L7, L8 și L9 complete, cu textele din `lectia-0N.md`.
- `UNLOCKED = 9`.
- `SceneId` primește `"runner"` (L7, L8) și `"chart"` (L9). `SimId` primește `"bucket"`, `"efficiency"` și `"specific"`.
- **Nu folosi G8 (partea cu 1,8–1,9), G9, I7** și nimic marcat „de găsit”. G8 se poate folosi doar pentru „power is zero when the bucket runs as fast as the jet”.
- Orice text afișat care afirmă ceva poartă ID-urile lui de afirmație.

### Scene

- **`learn/scenes/runner.ts`** (L7 și L8): rotorul mare, ca obiect de birou, în aceeași paletă, cu același contur și aceleași materiale. Refolosește `makeRunner` și `makeNozzle`, nu le redesena.
  - L7:
    - o cupă decupată în secțiune, cu muchia despărțitoare vizibilă;
    - jetul din duză lovește cupa;
    - o săgeată pentru apa de la ieșire, cu lungimea proporțională cu v₂/v₁ (minim vizibil, maxim când v₂ = v₁);
    - `setSpin(ratio)`: rotorul se învârte proporțional cu ratio, încetinit vizual, cu o etichetă „slowed down” (`wordSprite`). La ratio = 0 stă pe loc;
    - `setExit(fraction)` (0..1) actualizează săgeata.
  - L8:
    - `setJets(j)`: 1–6 duze așezate egal în jurul rotorului; doar ele sunt vizibile;
    - `setFlow(q)` (0..1): grosimea fiecărui jet ∝ √q, adică aria ∝ q.
  - `stopSpin()` oprește rotația la schimbarea lecției, ca `stopHammer`.
  - ID-uri de piese: `bucket`, `splitter`, `jet`, `exit`, `runner` (L7); `runner`, `nozzles`, `jet`, `curve` (L8). `curve` nu are obiect 3D, deci callout-ul lui se ancorează pe rotor.
- **`learn/scenes/chart.ts`** (L9):
  - o tablă cu harta n_QE (vertical, log, 0,001–2) în funcție de H (orizontal, log, 1–1000 m);
  - benzile Pelton, Francis și Kaplan din tabelul din `lectia-09.md`, tăiate pe orizontală la domeniul de cădere al fiecăruia, câte o culoare din paletă pentru fiecare;
  - etichete scurte „Pelton”, „Francis”, „Kaplan” (`wordSprite`);
  - un punct roșu (ACCENT) la (H, n_QE);
  - lângă tablă, `makeRunner` scalat după D1 și `makeGenerator` la mărime fixă.
  - Funcții:
    - `setPoint(headM, nqe)`;
    - `setJets(j)`: banda Pelton se lărgește ×√j;
    - `setRunner(d1M | null)`: scala rotorului, limitată vizual la un interval rezonabil; ascuns la `null`.
  - ID-uri: `map`, `pelton`, `francis`, `kaplan`, `runner`, `generator`.
- Miniaturile pentru 7–9 în coloana de lecții: cum e mai simplu. Nu fac obiectul unui gate.

### Simulatoare în UI (cardul „Try it yourself”, același stil)

**L7:**
- intrări:
  - `ratio` 0–1, pas 0,01 (0,25);
  - `angle` 90–180, pas 1 (165).
- fixe: v₁ = `jetSpeedMs(59, CV)`; Q = `jetFlowLps(v₁, NOZZLE_MM, 1)`; k = `K_IDEAL`.
- ieșiri:

| `data-out` | Format | Exemplu la r = 0,25 | La r = 0,5 |
|---|---|---|---|
| `u` | 2 zecimale | „8.34 m/s” | „16.67 m/s” |
| `eta` | 1 zecimală | „73.7 %” | „98.3 %” |
| `power` | 1 zecimală | „17.2 kW” | „22.9 kW” |
| `exit` | 1 zecimală | „17.1 m/s” | „4.4 m/s” |

- scena urmează `setSpin(ratio)` și `setExit(v₂/v₁)`.

**L8:**
- intrări:
  - `flow` 10–100 %, pas 1 (50);
  - `<select name=jets>` cu valorile 1–6 (1).
- fixe: H = 59 m, Qd = `jetFlowLps(jetSpeedMs(59, CV), NOZZLE_MM, 1)`.
- ieșiri:

| `data-out` | Format | Exemplu |
|---|---|---|
| `eta` | 1 zecimală | „89.0 %” |
| `peak` | 1 zecimală | „66.3 %” |
| `power` | 1 zecimală | „10.8 kW” |

- o curbă SVG inline `<svg data-curve>`:
  - η(q) de la 10 % la 100 %, din `turbineEfficiency`, pentru j-ul ales;
  - un `<circle data-dot>` la debitul ales;
  - axe minimale etichetate „Q / Qd” și „η”;
  - culorile din variabilele CSS existente, ca să meargă în ambele teme. Fără biblioteci.
- scena urmează `setJets` și `setFlow`.

**L9:**
- intrări:
  - `<input type=number name=head>` 2–1000 (59);
  - `<input type=number name=flow>` 10–50 000 L/s (41.9);
  - `<select name=speed>` cu 3000, 1500, 1000, 750, 600, 500 (750);
  - `<select name=jets>` cu 1–4 (1).
  - Valorile în afara intervalului se limitează la capete la calcul; câmpul gol nu strică nimic.
- ieșiri:

| `data-out` | Format | Exemplu |
|---|---|---|
| `nqe` | 4 zecimale | „0.0217” |
| `d1` | 2 zecimale | „0.42 m”, gol când Pelton nu se potrivește |
| `verdict` | text | „Pelton (1 jet)”, „Pelton (4 jets)”, „Francis”, „Francis, Kaplan”; altfel: „No standard runner — try another speed or more jets” |

- scena urmează `setPoint`, `setJets` și `setRunner`.

Sub fiecare simulator pui nota de limită din documentul lecției.

### Pagina

- `main.ts` leagă scenele noi: aceeași logică de `fit()`, callout-uri, ground și oprirea animațiilor la schimbarea lecției. Lecțiile 1–6 nu trebuie să se schimbe vizual.
- `window.__learnReady` și restul contractului rămân.

## Constrângeri dure

- TypeScript strict. three din npm (0.180). Fără dependențe noi. Nu copia nimic de la learn-arduino-red.vercel.app.
- Nu inventa conținut tehnic: orice text vine din `lectia-07.md`, `lectia-08.md` sau `lectia-09.md`. Dacă lipsește ceva, scrie în raport.
- Fără cod mort, fără opțiuni nefolosite, fără abstracții noi dacă un pattern existent ajunge. Refolosește helperii din `toon.ts`, `ui.ts` (`selectHtml`, `cell`, `setOut`, `setWarn` etc.) și piesele din `pelton.ts`.

## Ce nu ai voie să atingi

- `src/`, `2d/`, `map/`, `plant/`, `art/`;
- `tests/`, inclusiv `tests/learn/`;
- `scripts/`;
- `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `package.json`;
- `docs/`, în afară de raportul tău.

## Rezultatul așteptat

- Fișierele noi și cele schimbate din `learn/`.
- `docs/handoff/L3-coder-raport.md` cu:
  - lista fișierelor;
  - ce ai refolosit și ce ai scris nou;
  - orice abatere de la brief și motivul ei;
  - ce n-ai putut face.

Nu rulezi comenzi și nu poți spune că ceva „trece”; planner-ul rulează verificările.
