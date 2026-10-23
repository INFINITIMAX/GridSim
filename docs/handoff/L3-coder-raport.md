# L3 · coder: raport (lecțiile 7–9)

Nu am rulat nimic (nu am shell). Nu pot spune că ceva compilează sau trece; verificările rămân la planner.

## Fișiere

Noi:
- `learn/sim/bucket.ts`: `DEFLECTION_DEG`, `K_IDEAL`, `bucketEfficiency`, `exitSpeedMs`, `jetPowerKW`.
- `learn/sim/efficiency.ts`: `peakEfficiency`, `peakFlowRatio`, `relativeEfficiency`, `turbineEfficiency`. Coeficientul (1,31 + 0,025j) înmulțește puterea.
- `learn/sim/specific.ts`: `specificSpeed`, `peltonDiameterM`, `Turbine`, `fittingTurbines`, plus `BANDS` și `bandFor` (exportate ca să le folosească și `chart.ts`, ca benzile să nu fie scrise de două ori). Limite inclusive, ordinea pelton, francis, kaplan.
- `learn/scenes/runner.ts`: L7 și L8.
- `learn/scenes/chart.ts`: L9.

Schimbate:
- `learn/lessons.ts`: L7, L8 și L9 complete, `UNLOCKED = 9`, `SceneId` + `"runner" | "chart"`, `SimId` + `"bucket" | "efficiency" | "specific"`.
- `learn/ui.ts`: `SimHooks` extins cu `setSpin`, `setExit`, `setJets`, `setFlow`, `setPoint`, `setRunner`. Trei simulatoare noi: `mountBucket`, `mountEfficiency` (cu curba SVG), `mountSpecific`. Helperi noi: `curveHtml`, `numberHtml`, `verdictText`.
- `learn/main.ts`: `getRunner` și `getChart` (lazy, ca la celelalte), `GROUND_Y` cu `runner: -3.7` și `chart: -0.2`, `stopSpin()` și `setLesson(n)` la schimbarea lecției, hook-urile noi.
- `learn/style.css`: reguli pentru `.curve` (SVG-ul, cu variabilele CSS existente), `.outs .wide`, `.outs .v.txt`, și `input[type=number]` stilizat ca `select`.
- `learn/scenes/nozzle.ts`: doar `stream()` a primit `export`. Nicio altă schimbare.

## Refolosit și scris nou

- Refolosit: `makeRunner`, `makeNozzle`, `makeGenerator`, `R` din `pelton.ts`; `stream()` din `nozzle.ts`; `tube`, `part`, `wordSprite`, `setGlow`, `disposeObject`, `withThickMul` din `toon.ts`; `selectHtml`, `cell`, `setOut`, `sliderHtml`, `bindSliders`, `head`, `resetBtn` din `ui.ts`; `jetSpeedMs`, `jetFlowLps`, `powerKW`.
- Scris nou:
  - Secțiunea cupei: arc de cerc de 165°, extrudat și decupat în planul jetului; muchia despărțitoare e o pană separată.
  - Cele două jumătăți ale jetului, ca tuburi pe arc.
  - Săgețile de ieșire.
  - Cele 6 perechi duză + jet din L8.
  - Tabla cu axe log, benzile și punctul din L9.

## Decizii care nu erau în brief

- `RunnerScene` are în plus `setLesson(n)` (ca la `PenstockScene`): comută L7/L8, schimbă ancorele, `extent` și `target`, care se mută între cele două lecții.
- L7 are două săgeți de ieșire (câte una pe fiecare jumătate a cupei), cu aceeași lungime, într-un singur obiect `exit`. Brieful zicea „o săgeată". Fizic ies două fluxuri.
- L7: cupa decupată e un model mărit, pe axa jetului, între duză și rotor. Rotorul care se învârte e separat, la dreapta. Nu e cupa de pe rotor.
- L8: rotorul stă nemișcat, orientat spre cameră (grup rotit cu 45° pe y). Duzele sunt așezate pe cerc, în sensul acelor de ceasornic de sus. Grosimea jetului e ∝ √q.
- L9: banda Pelton la j jeturi are ambele limite ×√j, exact ca în tabelul din `lectia-09.md`. Ridicarea benzii în scară log păstrează înălțimea, nu o mărește. Cu numărul de jeturi, banda se mută în sus.
- L9: tabla stă cu fața spre cameră (grup rotit cu 45°), iar agregatul rotor + generator e rotit încă 45° față de ea. Rotorul e scalat cu 2 unități/m, limitat între 0,25 și 1,2.
- Intro-ul L7 poartă și G8 (propoziția „no push at all"), conform brief-ului (G8 doar pentru puterea zero). Pasul „As fast as the jet" din How it works are tot G8. G8 are un rând marcat „de găsit" în `lectia-07.md`, deci testul de integritate al tester-ului trebuie să știe că aici G8 e folosit doar pentru partea fără cifra 1,8–1,9.
- Textele din tab-urile How it works și Specs sunt traduse în engleză din punctele în română ale documentelor. Nu am adăugat conținut tehnic. Nu am explicat „de ce nu exact 180°" (lipsesc două surse).
- Specs L9: trei rânduri (Pelton, Francis, Kaplan), fiecare cu n_QE și domeniul de cădere, cu I2 și I4.
- Miniaturile 7–9: neschimbate (`makeRunner` e deja pe pozițiile 7, 8, 9).

## Ce n-am făcut

- Nu am atins `tests/`, `docs/` (în afară de acest raport), `scripts/`, configurațiile, `src/` etc.
- Nu am verificat vizual nicio scenă. Compoziția (distanțele, ancorele, `extent`, înălțimea lui `FLOOR_Y`, aspectul cupei decupate) e calculată pe hârtie și poate cere retușuri după capturi.

## De verificat de planner

- `npm run typecheck`. Puncte sensibile: `section()` (ExtrudeGeometry.rotateX), `Object.assign(anchors, lessonAnchors[...])`, destructurări sub `noUncheckedIndexedAccess`, harta `{ plant: ..., chart: getChart }[l.scene]()`.
- `npm run build` și `scripts/verify-learn-page.mjs` pentru L7–L9: callout-uri ≥ 4, `?lesson=7|8|9`, `data-out` (L7: `u eta power exit`; L8: `eta peak power`; L9: `nqe d1 verdict`), `svg[data-curve] [data-dot]`.
- Valori de mână:
  - L7 la r = 0,25: „8.34 m/s", „73.7 %", „17.2 kW", „17.1 m/s". La r = 0,5: „16.67 m/s", „98.3 %", „22.9 kW", „4.4 m/s".
  - L8 la 50 %, j = 1: „89.0 %", „66.3 %", „10.8 kW".
  - L9 implicit: „0.0217", „0.42 m", „Pelton (1 jet)".
- Vizual: scena L7 (cupa decupată vs. jet vs. nozzle la scara 2), L8 cu 6 duze (să nu se atingă), L9 (rotorul nu intră în tablă, etichetele sprite din bandă).
- Pentru tester: `bandFor` și `BANDS` sunt exportate din `specific.ts` și merită un test (inclusiv cazul j = 3 la 1500 rpm, 0,04337 > 0,0433, verdict „niciunul").
