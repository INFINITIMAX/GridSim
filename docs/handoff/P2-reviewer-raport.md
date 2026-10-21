# P2: verdictul reviewer-ului (transcris integral de planner, 21-10-2026)

## Verdict P2: ACCEPTAT (cu sugestii neblocante)

Am citit codul (`D:\GridSim\src\model\{units,config,grid,index}.ts`), testele (`D:\GridSim\tests\model\grid.test.ts`), brief-urile, rapoartele și `docs/calcule.md`. Nu am rulat nimic. Mă bazez pe rezultatele planner-ului: 20/20, typecheck, G4 și G5 trecute. `tests/model/smoke.test.ts` nu mai există, deci e deja șters.

### Probleme blocante
Niciuna.

### Cod (coder)

**Cod în plus:** nu am găsit funcționalități P3/P4 strecurate.
- `trackingTimeS` din `AfrrConfig` (`config.ts:16`) depășește `{kp, ki}` cerut. E justificat de anti-windup și declarat în raport.
- `batteryDefaultEta` e necesar pentru baterie și e marcat ca presupunere de joc.
- `startMinutes` există doar în catalog, cum cerea brief-ul.
- Nu există abstracții nefolosite.

**Fizica:**
- Swing equation (`grid.ts:443`), S_sys și H_sys doar pe sincrone online, autoreglajul sarcinii și Euler sunt conforme.
- FCR (`grid.ts:347-357`): banda moartă se scade din Δf, rampa e rezervă/30 s, saturația e la ±0,2 Hz.
- aFRR (`grid.ts:299-331`): PI comun, împărțit proporțional cu rezerva, limitat la rezervă și la rampa unității, cu anti-windup prin back-calculation.
- UFLS cu latch, reset doar prin `restoreShedLoad`; deconectare la 47,5/51,5 Hz; baterie cu SOC exact în [0, 1].
- Blackout `no-synchronous-machines` când `sSys <= 0`.
- Catalogul se potrivește cu tabelul 2 din `calcule.md`: H, rampe, minime tehnice, CO₂, valorile alese pentru "ore"/"minute" (marcate cu `assumption`) și URL-urile.
- Nu am găsit `Math.random`, `Date` sau DOM.

**Verificări de calcul (făcute de mână, nu din rularea modelului):**
- Nadirul T2 iese ≈ 49,25 Hz. Rezolvând `x' = 0,09375 − 0,003125·t − 0,046875·x`, vârful e la t ≈ 18,7 s, cu abatere ≈ 0,75 Hz. Confirmă estimarea tester-ului: marjă mică (≈ 47 mHz), dar reală, nu doar noroc.
- La 60 s abaterea T2 e deja aproape de 191 mHz, deci măsurarea la 120 s e conservatoare, nu necesară.
- Calibrarea aFRR (tau ≈ 120 s, fără oscilație, PI mult mai lent decât planta) e plauzibilă pentru T4.

**Neblocante (coder):**
1. `grid.ts:330`: termenul de back-calculation folosește `delivered` luat înainte de actualizarea `u.afrr` (decalaj de un pas). E inofensiv în regim nesaturat (suma e neglijabilă), dar un comentariu ar clarifica intenția.
2. `grid.ts:357-362`: `u.fcr` se integrează independent de clampul final al lui `p`. Dacă unitatea e la `pMax` sau `minLoad`, `fcrDeployed` raportat poate depăși contribuția reală. Interfața din P4 ar putea afișa o cifră optimistă. De documentat în raport sau de rezolvat în P4, nu acum.
3. `grid.ts:165`: bateria creată cu `p = setpoint` fără limitare după SOC. Fără efect practic (se corectează la primul pas).

### Teste (tester)

**Valoare:** valorile așteptate vin din `calcule.md` sau din calcule de mână independente de model: -0,5; -0,25; -0,833; 3150/16500; -0,09375; 20 MWh; SOC 0,2778 și 0,684; 0,9 MWh; 1/0,92 MWh. Nu am găsit aserțiuni circulare.

**Fiecare test poate pica:**
- T1: o greșeală în factorul 2, în H sau în S îl strică.
- T2: banda moartă, rampa FCR, D și H_sys greșite îl strică.
- T3: absența UFLS sau declanșarea ei prea devreme/târziu (fereastra 0,5–0,8 s); blackout.
- T4: aFRR slab sau oscilant.
- T6: tăierea la SOC 0/1 lipsă (energia ar fi 50 MWh în loc de 0,9) și randamentele ignorate.
- T7: orice nedeterminism. `new Set(...).size > 100` previne trecerea trivială cu NaN.

**Abaterile de la brief sunt justificate:**
- T3 negativ "FCR 500 nu declanșează UFLS" era greșit fizic din cauza rampei FCR de 30 s. Greșeala era în brief-ul planner-ului, nu a tester-ului. Înlocuirea cu (a) pierdere de 10 MW fără UFLS și (b) nadir mai bun cu FCR mai mare e corectă.
- T1 negativ cu S dublu și cu raportul H 5/3 acoperă același defect ("modelul ignoră H" sau "ignoră S"). Corecția planner-ului (sarcină 11 000, setpoint 10 000) e corectă: 10 000 ≥ 9 000 (minimul OCGT) și bilanțul 10 000 + 1 000 = 11 000 se închide.
- Măsurătorile T2(b) la 120 s și T4 la 1 200 s sunt fizic corecte. T4 la 1 200 s verifică și "rămâne în bandă", cerut de brief.

**Neblocante (tester):**
1. Redundanță: "T2 (negativ): aFRR = 0 → abatere > 0,15" rulează același scenariu ca T2 principal, a cărui aserțiune `withinPct(dev, 0.191, 10)` o include deja. Singura valoare nouă e `afrrDeployed === 0`. Poate fi unită cu T2 principal sau eliminată.
2. Redundanță: "T1: a balanced system has zero ROCOF" și "T3 (negativ): without the loss event … f=50" verifică aceeași idee (fără incident, fără derivă). Ambele sunt slabe: nu pică la o greșeală de fizică, doar la derivă spontană. Păstrează una singură.
3. Aserțiunile `expect(withinPct(x, y, p)).toBe(true)` (`grid.test.ts:53, 55, 69, 76, 113, 120, 318, ...`) dau la eșec doar "expected false to be true", fără valorile. Mai bine un helper care arată valoarea reală și cea așteptată, sau `toBeCloseTo`. Folosește-l înainte ca T5 și P3 să adauge alte cazuri.
4. T3 (`:200-219`) nu verifică ce spune `calcule.md` explicit: deficitul de 25% implică treapta ≥ 4 (≥ 29%). Aserțiunea `shedFraction >= 0.05` e prea slabă. Poate fi întărită la `>= 0.25`, după o rulare confirmată de planner.
5. "T3: more FCR … higher nadir" depinde de cascada UFLS. Trece pe baza rulării planner-ului, dar e sensibilă la calibrări viitoare.

**Comportament important rămas netestat (de acoperit în P3/P4):**
- Anti-windup aFRR (cerut explicit "obligatoriu" în brief). Un test posibil: rezerva aFRR < deficit, apoi `afrrIntegralMW` rămâne mărginit și nu produce depășire la dispariția deficitului.
- Blackout `under-frequency` la 47,5 Hz, `over-frequency` la 51,5 Hz, `no-synchronous-machines`, și că `step` nu mai schimbă nimic după blackout.
- Rampele unităților pe `setSetpoint`.
- `restoreShedLoad`.
- Evenimente pe id inexistent (ignorate) și id duplicat (`throw`).
- Unitate deconectată cu FCR activ.
- `S_sys = 0`.

### Cine repară
- **Planner:** transcrie acest verdict. Reține că brief-ul T3 negativ era greșit, ca să nu repete eroarea în P3. Introdu testele netestate de mai sus în planul P3/P4 sau într-un P2b mic, mai ales blackout-urile și anti-windup, care sunt esența mesajului pedagogic al jocului.
- **Tester:** (opțional, neblocant) sugestiile 1–4.
- **Coder:** (opțional, neblocant) comentariul de la `grid.ts:330` și nota despre `fcrDeployed` vs clamp.

---

## Decizia planner-ului (21-10-2026)
- **P2 acceptat.** Modelul rămâne așa cum e.
- **Creez P2b** (mic, înainte de P4), pentru că blackout-urile și protecțiile sunt chiar mesajul jocului:
  - **tester:** teste pentru blackout la 47,5 / 51,5 Hz, pentru `no-synchronous-machines`, pentru `step` inert după blackout, anti-windup aFRR, rampele pe `setSetpoint`, `restoreShedLoad`, evenimente pe id inexistent sau duplicat și unitate deconectată cu FCR activ; plus sugestiile neblocante 1–4 (helper cu mesaje, eliminarea redundanțelor, T3 întărit la ≥ 25%).
  - **coder:** neblocantele 1–3, cu `fcrDeployed` raportat după clamp, pentru că interfața îl va afișa.
- **Lecție reținută:** brief-ul meu pentru T3 negativ ignora rampa FCR de 30 s. Pe viitor, scenariile negative din brief-uri le verific întâi cu un calcul de mână al dinamicii, nu doar al stării staționare.
