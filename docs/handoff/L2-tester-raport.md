# L2 · tester · raport

Nu am rulat nimic. Valorile așteptate vin din lectia-04..06.md (calculate de mână, verificate și de mine pe hârtie). Scrise după specificație; codul coder-ului nu exista încă la scriere.

## Fișiere

### tests/learn/friction.test.ts
- Constante NU, ROUGHNESS_MM. Cădere dacă: altă valoare.
- Implicit L4 (V, Re, f, hf, H netă, %): cad la mm/m greșit în D (V ar fi de 1e6 ori altfel), log natural în loc de log10, pătrat lipsă la f, lipsă 2 din 2g.
- Oțel și D = 100 mm (46,6 %, peste 5 %): cad la rugozitate greșită sau exponent Re^0,9 greșit.
- Control extern 1 (S2 ex. 2.5, 4 diametre, ≤ 2 %) și 2 (ex. 2.2, V = 1,886, D = 0,9, ≤ 5 %): cad la orice abatere de formulă care mută f sau hf cu >2 %/5 %.
- Proprietăți: raport hf(100)/hf(200) > 25 (D4), liniaritate în L.

### tests/learn/hammer.test.ts
- c oțel 1024 / PVC 305, ≤ 1 %: cad la dOverT, E sau K greșite, rădăcină lipsă.
- S2 ex. 5.9 (c, Tc, ΔH Allievi 25,65), ex. 5.8 (417 m): cad la 2 lipsă din Tc, N fără pătrat, formula Allievi greșită.
- Implicit L5: Tc 0,293 / 0,989, Joukowsky 133,0 / 39,4, Allievi 4,02 / 10,56 / 53,6 (oțel și PVC), prag avertisment 0,3·H0.
- Granița t = Tc: exact Tc -> sudden (cade dacă `<=` devine `<`), peste Tc -> gradual și ΔH < 0,95·Joukowsky, sub Tc -> sudden.
- Plafon: test de control că Allievi brut > Joukowsky (H0 = 1, t = 0,31), apoi surgeM = Joukowsky exact; grilă 4 H0 x 9 timpi cu ΔH ≤ Joukowsky. Cad dacă lipsește `min`.
- Închidere mai lentă -> vârf mai mic.

### tests/learn/jet.test.ts
- CV, NOZZLE_MM. 33,62 / 33,34 m/s, scalare √H. Cad la 2g, Cv lipsă, 9,8 în loc de 9,81 nu se prinde (diferență 0,1 %, sub toleranță, acceptat).
- Q 41,9 la 100 % și 20,95 la 50 %, d la pătrat. Cad la d fără pătrat, mm/m, deschidere ignorată.
- Putere 14,55 kW prin powerKW, e = 0,6.
- Control S7: v = 65,14 (≤ 0,5 %); jet de 140 mm la acea viteză = 1000 L/s (≤ 0,5 %), echivalent cu d = 0,140 m.

### tests/learn/lessons.test.ts (extins, nimic slăbit)
- UNLOCKED = 6, LESSONS.length = 6, titluri, ≥ 4 callout-uri și tab-uri nevide pentru toate 6.
- Importuri ?raw lectia-04..06; fiecare ID folosit are rând în tabel și nu e „de găsit", pentru toate 6.
- F6 în BANNED, plus test de control că rândul F6 conține „de găsit" (altfel verificarea ar fi oarbă). Cade dacă vreo lecție folosește F6.

## Ce nu am acoperit
- N din Allievi nu e exportat; apare doar indirect prin ΔH (ex. 5.9, valorile implicite).
- Format/afișare UI (zecimale, avertismente, „0.0 kW" cu deflector, nota „Water still flows"): sunt în DOM, nu în funcții pure; ține de verificarea în browser/gate.
- Scenele three (penstock, nozzle): fără teste unitare, nu au logică pură.
- Praguri de avertisment (5 %, 0,3·H0) testate doar prin valori de ieșire, nu prin cod de UI.

## Ipoteze de verificat la rulare
- Nu am văzut learn/sim/friction.ts, hammer.ts, jet.ts: importurile urmează numele din brief (NU, ROUGHNESS_MM, pipeVelocityMs, reynolds, swameeJainF, frictionLossM, PIPES, waveSpeedMs, criticalTimeS, joukowskyM, allieviM, surgeM, CV, NOZZLE_MM, jetSpeedMs, jetFlowLps).
- swameeJainF e apelat cu e în mm și D în m, conform semnăturii (roughnessMm, diameterM). Dacă coder-ul a interpretat altfel, f din L4 va pica; ar fi bug sau ambiguitate de brief.
- În ex. 2.2 am dedus L = 500 m (din hf = 1,91 și f = 0,019); documentul nu o spune explicit.
- Nicio suspiciune de bug în cod încă.

## Comandă
`npx vitest run tests/learn`
