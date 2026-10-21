# P4: raport tester
Tester, 21-10-2026. Nu am rulat nimic; nu afirm că testele trec.

## Fișiere (`D:\GridSim\tests\game\`)
- `helpers.ts`: ajutoare (accept/refusal, advanceUntil, startedLevel, playToEnd). Nu conține teste.
- `level1.test.ts`: L1 (stări nivel), L2 (stele), L3 (buget), L4 (reechilibrare + f < 50,2 Hz în 9 s), L5 (evenimente scriptate, felieri 0,016 / 0,05 / 0,1 / 1,0).
- `session.test.ts`: L6 (plafon advance), L7 (snapshot imutabil, mesaje consumate), L9 (restoreLoad), L10 (determinism).
- `sandbox.test.ts`: L1 sandbox, L4 sandbox, L8 (pendingBuilds, setSpeed, addConsumer/removeConsumer, restricții în nivel).

## Ce ar face testele să cadă (pe grupuri)
- L1: lipsa tranziției prepare/running/won, timp care curge în prepare, won înainte de 120 s sau advance după won, sandbox care se termină.
- L2: orice schimbare a regulilor de stele (praguri 0 / 5% / 49,2 Hz) sau a costurilor/setpoint-urilor bateriei care mută rezultatul 1/2/3; măsurătorile din snapshot diferite de `result()`. Lecția solarului (2x solar -> 1 stea).
- L3: costuri diferite de level1.md (literale în test), refuz la depășire, marginea cost == buget rămas, refund la demolare, hydro/gas demolabile, build/demolish permise în running în nivel.
- L4: calcul de mână (hidro min 180, gaz min 90, surplus = programat - 570): tabel cu 6 combinații; 4x solar (+320 > 300 marjă) trebuie refuzat și starea rămâne prepare; 3x solar (+240 = marja exactă) trebuie acceptat. Dispare reechilibrarea -> cade. Sandbox: fără reechilibrare f ar rămâne ~+0,3 Hz și hidroul la 420.
- L5: eveniment aplicat de două ori, la timp greșit (înainte de 10/50 s), sau dependent de felierea lui `advance`; mesaje narative duplicate; jurnal cu mai multe "gas tripped".
- L6: plafon lipsă sau schimbat (400 pași = 20 s), rest nearuncat (advance(0,04) ar mișca timpul), NaN/negativ.
- L7: orice referință mutabilă spre starea internă (units, consumers, uflsStages, log, measurements); mesaje neconsumate sau consumate de două ori.
- L9: restoreLoad care nu resetează shedFraction/pShed/uflsStages/shedMW; maxShedFraction șters; refuz în prepare.
- L10: orice sursă de nedeterminism (Math.random, ceas) sau stare partajată între sesiuni.
- L8: timp de pornire din CATALOG ignorat (hidro 300 s), unitate în pendingBuilds de la început, viteze 1/2/4, consumatori cu MW din LOAD_CATALOG, id-uri unice, refuz în nivel.

## Neacoperit
- `lost` / 0 stele: nicio combinație din buget nu produce blackout (planner), deci nu pot declanșa starea deterministic. Ramura `lost` din `result()` și mesajul de blackout rămân netestate.
- L9, "reconectarea prea devreme redeclanșează UFLS": nu pot garanta prin calcul (aFRR + FCR ar putea acoperi deficitul de ~190 MW la limită), deci testez doar reconectarea.
- Pragurile exacte de UFLS (21%, 5%) nu sunt asertate; doar stelele și relațiile (>5%, <=5%, 0 și nadir >= 49,2). Aceste stele (1/2/3 pentru 0/1/2 baterii, 1 pentru 2x solar) vin din măsurătorile planner-ului, nu dintr-un calcul de mână; dacă P4a schimbă dinamica, ele sunt primele de verificat.
- Comportamentul sandbox la blackout, ordinea OCGT după CCGT în `rebalance` (neatins de nicio combinație posibilă din buget).

## Precondiții explicite care pot cădea (nu bug al codului, ci ipoteze ale mele)
- L9: la t = 70 s se cere f > 49,0 Hz (calcul de mână: ~49,7 Hz după UFLS) și shedFraction > 0.
- L10: nadir < 49,7 Hz (fabrica singură dă 49,61 Hz).
- L4 sandbox: |f - 50| < 0,05 și hidro 340 ± 5 MW după 60 s (rampa hidro 4,5 MW/s => ~18 s; aFRR rezidual estimat ~2 MW).

## Suspiciuni de bug
Niciunul demonstrat. Observații:
- `snapshot().consumers[].shedFraction` și `shedMW` sunt aceeași fracție globală aplicată tuturor consumatorilor (nu pe cartiere); consecvent cu modelul, dar UI-ul nu poate arăta "care cartier s-a stins".
- `rebalance` în sandbox nu refuză la surplus neabsorbabil (documentat).

## Comandă
`npx vitest run tests/game` (sau `npm test`). Tipuri: `npm run typecheck` (testele folosesc `structuredClone`; dacă tsconfig nu include tipurile Node, planner-ul va vedea eroarea acolo).
