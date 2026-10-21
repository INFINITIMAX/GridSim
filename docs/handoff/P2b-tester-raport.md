# P2b: raport tester (21-10-2026)

Nu am rulat nimic; nu afirm că vreun test trece. Nu am atins `src/**`, config, `docs/**` (în afară de acest raport).

## Fișiere
- `tests/model/helpers.ts` (nou, fără teste): `simulate`, `homes`, `getUnit`, `expectWithinPct(actual, expected, pct, label)` (la eșec arată valoarea reală, cea așteptată, toleranța).
- `tests/model/grid.test.ts` (modificat): sugestiile reviewer-ului 1-4.
  1. T2 negativ „aFRR = 0” eliminat; `afrrDeployed === 0` mutat în T2 principal.
  2. „T1: balanced system has zero ROCOF” eliminat; rămâne „T3 fără incident nu se întâmplă nimic”.
  3. Toate `expect(withinPct(..)).toBe(true)` înlocuite cu `expectWithinPct`.
  4. T3: `shedFraction >= 0.25` (era 0.05).
- `tests/model/protection.test.ts` (nou): P1-P11.

## Teste noi: calcul de mână și ce le-ar face să cadă
Toate valorile vin din calcul, nu din model. Dinamica (rampa FCR 30 s, H, ROCOF) verificată la fiecare scenariu negativ.

**P1 under-frequency.** OCGT 1 000 MW (H=5) la 500 + solar 500 MW, sarcină 1 000, fără FCR/aFRR; se pierde solarul. ROCOF = 50·(-500)/(2·5·1000) = -2,5 Hz/s. UFLS max 45% lasă 550 MW sarcină vs 500 MW generare; deficit rămas ≈ 36 MW la 47,5 Hz (autoreglaj 1%/Hz), deci f scade monoton sub 47,5. Aserțiuni: motiv, f<47,5, t>1,0 s (|ROCOF|<2,5 mereu), toate cele 6 trepte latch-uite, shedFraction 0,45, unitatea offline cu p=0, sSys=pGen=0, 1 intrare `blackout` în jurnal. Pică dacă: pragul de 47,5 lipsește sau motivul e greșit, unitățile nu se deconectează, jurnalul nu se scrie.

**P2 over-frequency.** OCGT 1 000 MW la 500, sarcini 400+100, `removeLoad` 400. Surplus ≈ 400 MW, ROCOF ≈ +2,0 Hz/s (1,995 cu autoreglaj). 1,5/1,995 = 0,75 s, deci primul pas peste prag e al 16-lea, t = 0,80 s. Aserțiuni: motiv, f în (51,5; 52), t în (0,6; 1,0), UFLS netrecut, unitatea offline. Pică la: prag 51,5 lipsă/greșit, motiv inversat.

**P3 no-synchronous-machines.** (a) doar solar+baterie: blackout la primul pas, t=0,05, f rămâne exact 50 (nu NaN). (b) `tripUnit` pe ultima unitate sincronă: motiv `no-synchronous-machines`, nu de frecvență. (c) negativ: hidro 1 000 MW + hidro 100 MW, se deconectează cea mică (ROCOF -0,17 Hz/s, ~0,008 Hz/pas): fără blackout, sSys=1000. Pică la: condiția `sSys <= 0` greșită (prea largă sau lipsă).

**P4 inert după blackout.** `structuredClone` al stării după blackout P1, apoi 100 de pași cu evenimente (`addUnit`, `setLoad`, `restoreShedLoad`); `toEqual` pe toată starea și `step` returnează aceeași referință. Pică dacă `step` aplică evenimente, avansează t/f sau modifică jurnalul după blackout.

**P5 anti-windup aFRR.** OCGT 20 000 MW (H=5) la 9 900, aFRR R=30 MW; solar 100 MW pierdut; L=10 000.
- Faza 1 (240 s): D·L = 100 MW/Hz, deficit net 70 MW, deci Δf = 0,7 Hz (49,3 Hz > 49,0: fără UFLS); tau = 2·5·20 000/50/100 = 40 s, 240 s = 6 tau.
- Integrator la echilibru (back-calculation): I = R + (Tt·ki − kp)·L·e = 30 + 0,02·10 000·0,7 = 170 MW. Limita testului: R + (Tt·ki − kp)·L·1 Hz = 230 MW (calculată din CFG). Fără anti-windup: dI/dt = ki·L·e = 7 MW/s, adică ~1 400 MW la 240 s.
- Precondiții în test: aFRR livrat ≈ 30 MW (±1%), 50−f ≈ 0,7 (±10%), minF>49, shedFraction=0, aFRR≤R.
- Faza 2 (300 s): `addUnit` vânt 100 MW. Bucla PI nesaturată: s² + 0,05 s + 0,0025 = 0 (ωn=0,05, ζ=0,5, decădere e^(−0,025t)); saturarea se termină la ~74 s; reziduu la 300 s ≈ 0,003 Hz. Cu windup: I≈1 400 scade cu doar 3 MW/s, aFRR rămâne +30 MW, f=50,3 Hz ~400 s. Prag |f−50| < 0,05 și |I| < R.
- **Marja:** nu am folosit „f ≤ 50,1” ca vârf. Calculul arată că și implementarea corectă depășește 50,1 (aFRR rămâne +R până ~74 s, vârf ≈ 50,15-50,2). Windup-ul se vede în durată, nu în vârf (vârful e mărginit de R/(D·L)=0,3 Hz în ambele cazuri), așa că măsor la 300 s după dispariția deficitului. Pică la: back-calculation scos sau `trackingTimeS` foarte mare.

**P6 rampă.** CCGT 1 000 MW, 4%/min = 40 MW/min, +400 MW (500→900). Bar OCGT 400 000 MW, sarcină 200 500 (abatere max 0,2 Hz, fără blackout). Aserțiuni: după 1 pas 0 < Δp < 0,04 MW (0,0333); 60 s: 40 MW ±10%; 300 s: 200 ±5%; 540 s: 360 ±2% și p<880; 660 s: p≈900. Negativ: coborâre 900→500 tot 40 MW/min. Pică la: rampă lipsă (salt), rampă greșită, rampă doar la urcare.

**P7 restoreShedLoad.** Insulă 800 MW (hidro 300, OCGT 250, solar 250 pierdut, FCR 50), 60 s. Precondiții: shedFraction≥0,25, pShed≥200, f>49,5 (echilibru calculat: 550 + 250·(−Δf−0,01) = 568 + 5,68·Δf → Δf≈−0,08, adică 49,92). După `restoreShedLoad` într-un pas (ROCOF ≈ −1,5 Hz/s → −0,075 Hz, fără redeclanșare la 49,0): shedFraction=0, treptele false, pShed=0, pLoad ≈ 800·(1+0,01·(f_înainte−50)) ±0,1% și cu ≥150 MW peste valoarea cu shed. Negativ: fără `restore`, sarcina deconectată rămâne deconectată. Pică la: reset incomplet (fracție sau trepte), latch-uri rămase.

**P8 evenimente invalide.** Șase evenimente pe id inexistent (trip/remove/setSetpoint/removeLoad/setLoad/setAvailability) → starea egală (`toEqual`) cu o rulare identică fără evenimente, jurnal gol. Control: `setLoad` pe id existent schimbă starea (egalitatea nu e trivială). `createGrid` cu id duplicat de unitate sau de consumator aruncă, la fel `addUnit`/`addLoad` prin `step`. Baterie fără `battery` sau cu capacitate 0 aruncă. Mesajele se verifică doar prin id (`/dup-unit/`), nu prin text complet.

**P9 trip cu FCR activ.** `ceSystem(0)` (3 000 MW pierdut). x(t) = 3,4222 − 0,06667t − 3,4222e^(−0,046875t): 0,75 Hz la 18,7 s, 0,583 la 30 s; apoi tau = 2·4·200 000/50/1 500 = 21 s → 0,46 Hz la 35 s. Țintă FCR plină de la t≈2,4 s, deci rampa 50 MW/s per unitate ajunge la 1 500 MW la 30 s. La 35 s: fcr hidro≈1 500, OCGT≈1 500, fcrDeployed≈3 000 (±1%). După `tripUnit` hidro, într-un pas: hidro.fcr=0, p=0, fcrDeployed≈1 500 = fcr OCGT. Plus: dublu `tripUnit` pe aceeași unitate scrie o singură intrare în jurnal. Pică la: fcr nerezetat sau sumat din unități offline.

**P10 livrare efectivă.** Hidro 1 000 MW la 950, rezervă FCR 200 MW (headroom 50), bar 40 000 MW la 20 000, solar 100 MW pierdut, sarcină 21 050. D·L = 210,5; FCR efectiv ≤ 50, deci Δf eq = 50/210,5 = 0,2375 Hz, tau = 38,6 s, la 150 s ≈ 0,233 Hz. Cererea FCR (≥ 90 MW la Δf>0,1) depășește headroom-ul. Aserțiuni: fcr ≤ 50 (+1e-6), ≈50 (±1%), p ≈ 1 000, fcrDeployed = fcr. Negativ: același sistem cu headroom 500 MW: FCR = 1000·(Δf−0,01), 100 = 1000(Δf−0,01)+210,5Δf → Δf=0,0909, FCR≈81 MW, așteptat >60 și ≤200 (prinde o reducere `k` prea agresivă). Pică la: raportare optimistă (fcr=200).

**P11 baterie.** SOC 0 + setpoint +50 → `|p|=0` imediat după `createGrid` (înainte de orice step), setpoint rămâne 50, pGen=50 000. SOC 1 + setpoint −50 → p=0. Negativ: SOC 0,5, setpoint 20 → p=20, pGen=50 020. Pică la: lipsa tăierii după SOC la creare.

## Neacoperit
- `S_sys = 0` cu sarcină 0 / `H_sys` NaN: doar prin P3 (nu am un test separat pentru sarcină 0).
- Reducerea proporțională fcr/afrr când ambele sunt active și unitatea e la limită: P10 acoperă doar FCR. aFRR cu limită de putere nu are test separat (cere calibrare a unui al doilea scenariu lung).
- Limita de SOC aplicată reglajului FCR al unei baterii (fcr reduce la SOC mic): netestat.
- `setAvailability` real (solar/eolian) și `addLoad`/`setLoad` efect numeric: nu erau în lista P2b.
- T5 (date reale): P3 din roadmap, nu acum.

## Suspiciuni de bug
Niciun bug demonstrat. Observație (nu test): `setSetpoint` limitează inferior la 0 (grid.ts:276), iar `makeUnit` la `minLoad·pMax`; la unități termice, cererea sub minim e tăiată ulterior de `clampUnitPower` în `p`, dar `setpoint`/`setpointRamped` raportate pot fi sub minim. Inofensiv fizic; de decis dacă UI-ul afișează `setpoint`.

## Riscuri pentru planner la rulare
- Cele mai fragile numeric: P5 (marjă mare pe faza 2, mai mică pe limita integratorului: prezis 170 vs 230), P7 (precondiția f>49,5), P10 (precondiția F0−f>0,1), P9 (precondiția F0−f>0,25). Dacă pică una, verifică mai întâi precondiția, nu aserțiunea principală.
- Dacă T3 `shedFraction ≥ 0.25` pică, sugestia 4 a reviewer-ului cere confirmare din rulare.

## Comanda
```
cd D:\GridSim; npx vitest run tests/model
cd D:\GridSim; npm run typecheck
```
