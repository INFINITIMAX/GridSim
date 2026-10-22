# L2 · reviewer · verdict (transcris integral de planner)

**ACCEPTAT.** Nu am găsit probleme blocante. Am citit tot codul din `learn/` care ține de L4–L6 și toate cele 4 fișiere de teste. N-am rulat nimic, deci mă bazez pe rezultatele planner-ului din brief.

## 1. Coder-ul

**Formule (`learn/sim/`) comparate cu `lectia-04/05/06.md`: toate corecte.**
- `friction.ts:28-31`: Swamee–Jain are e în mm convertit la m (`/1000`), D în m, deci unitățile sunt coerente. Se folosește `log10` și pătratul, iar `5,74/Re^0,9` e corect. `pipeVelocityMs` convertește corect L/s și mm. `frictionLossM` e corectă (`2g`, g = 9,81).
- `hammer.ts:41-51`:
  - `waveSpeedMs` e conformă cu S2 ec. 5.22.
  - `allieviM` e conformă cu ec. 5.25–5.26.
  - Plafonul `Math.min(Allievi, Joukowsky)` există doar pe ramura gradual.
  - Granița e `closeS <= Tc`, deci exact t = Tc dă „sudden”, cum cere brief-ul.
- `jet.ts`: `Cv·√(2gH)` și `v·deschidere·π·d²/4·1000` sunt corecte. Puterea trece prin `powerKW(h, flow, 0.6)`, fără funcție nouă (`ui.ts:658`).
- Am refăcut de mână cele două valori de test pe care m-am bazat: Allievi la 1,17 → 108,9 m și v = 33,62 m/s. Ies exact ca în documente.

**Cod în plus: justificat.**
- `GROSS_HEAD_M` e folosit în `ui.ts` (de două ori), în `penstock.ts` și în sim. Valoarea lui 60 m vine din L2.
  - Neblocant, coder: numele trăiește în `friction.ts`, deși îl folosește și L5. E o chestiune de plasare, nu de logică.
- `HammerParams` e contractul ui→scenă, folosit în 3 fișiere.
- `wordSprite` (`toon.ts:173`) e necesar. `labelSprite` are canvas 128×128 și încape o singură literă, iar sunt nevoie de „H gross”, „H net”, „not to scale”, „slowed down”.
- Opțiunea `side` din `part()` (`toon.ts:76`) e folosită în `nozzle.ts:50,59`, pentru fața interioară a duzei tăiate.
- Helperii `selectHtml`, `cell`, `setOut`, `setWarn` din `ui.ts` sunt folosiți în toate cele trei simulatoare.
- Nu văd cod mort. Constantele din `penstock.ts` și `nozzle.ts` sunt toate referite.

**Texte din `lessons.ts`: potrivite cu documentele.**
- Callout-urile, intro-urile și rândurile din Overview sunt verbatim din `lectia-0N.md`, cu aceleași ID-uri.
- F6 nu e folosit nicăieri.
- Claim-ul D1 pe „Valve” și „Nozzle” din Parts L4 e susținut. D1 enumeră explicit „grătar, coturi, vane” printre pierderi și definește H netă ca brută minus pierderi.
  - Neblocant, planner: „Nozzle” n-are `part`. Click-ul pe rând nu evidențiază nimic. E acceptabil, pentru că scena penstock n-are duză.
- Frazele formulate de coder sunt scurte și inofensive („More in lesson 5.”, „Where the net head ends…”). Ele poartă claim-uri valide.
- Avertismentele au `data-claims` D6, E8 și F5.

**`selectLesson` (`main.ts:200-241`): nu strică L1–L3.**
- Singura schimbare de comportament e că `highlight(null)` se cheamă acum pe toate scenele create. E inofensiv.
- `plant.stopDrop()` și `penstockScene?.stopHammer()` se cheamă la fiecare schimbare de lecție.
- `stopHammer` face reset complet (vană, inel, ac, etichetă) și nu cheamă `onDone`.
- Butonul `[data-run]` se recreează la `mountSim`, deci nu rămâne blocat pe `disabled`.
- Hook-ul `setLoss` cheamă `updateCallouts()` înainte de `resetView()`. Camera e momentan veche, dar `resetView()` recalculează imediat după.

**Contractul DOM extins:** toate `data-out` și `name` din brief există (velocity, f, loss, net, pct, warn / c, tc, surge, max, mode, warn, `[data-run]` / speed, flow, power, note, `name=deflector`). Notele de limită sunt prezente sub fiecare simulator. Avertismentele sunt `hidden` și goale când nu e cazul.

## 2. Abaterea planner-ului (cotele din `penstock.ts`): fără regresie
- `HZ` nu mai apare nicăieri (grep: doar `GX`, `NET_X` și `EL_Z0`, toate în `penstock.ts`).
- `overlayLines` este `LineSegments2`, deci perechi de puncte. Polilinia cu 4 puncte de la liniile 158 și 170 dă două segmente separate, fără diagonale rătăcite.
- Linia de energie începe la peretele din aval al camerei de încărcare (`EL_Z0 = -2.85`, adică FZ + 0,8). Se termină la `(0, WL−drop, NOZ_Z)`.
- `netGroup` stă la `(NET_X, WL−drop, NOZ_Z)`. Trăgătorul punctat merge de la x = 0 la x = NET_X, exact în capătul liniei de energie.
- `netLine.scale.y = HG−drop` ajunge exact la `NOZ_Y`, pentru că `WL − HG = NOZ_Y`.
- Ancora `energy` din `setLoss` (linia 259) e punctul real de pe linie la z = 0, iar `net` e la mijlocul cotei.
- Neblocant, coder (declarat de el): `highlight("energy")` și `highlight("net")` nu fac nimic, pentru că `setGlow` nu atinge `LineMaterial`. Callout-urile merg, iar „energy” și „net” nu sunt în Parts, deci nu se vede în UI.

## 3. Testele tester-ului

**Valori așteptate din documente și surse, nu din cod.**
- Valorile vin din `lectia-04/05/06.md` și din controalele S2 ex. 2.5, 2.2, 5.7, 5.8, 5.9 și S7 ex. 2.
- `V0` din `hammer.test.ts` e scris independent de `friction.ts`.
- Am verificat de mână valoarea Allievi de 108,9 m de la graniță.

**L = 500 m la ex. 2.2: corect.** Enunțul S2 spune „along a length of 500 m”, iar deducția din hf = 1,91 și f = 0,019 dă tot 500 m (0,019·500/0,9·3,557/19,62 ≈ 1,91).

**Ce l-ar face să cadă (testele nu trec oricum):**
- Frecare: mm/m greșit în D, `ln` în loc de `log10`, pătrat lipsă, `2g` lipsă și 5,74 greșit. Planner-ul a confirmat cu mutația 5,74 → 5,0, care a picat 4 teste.
- Hammer: `2L → L` în Tc, `<=` devenit `<` la graniță, `min` lipsă la plafon și N fără pătrat. Testul de control „Allievi brut > Joukowsky la H0 = 1, t = 0,31” asigură că ramura de plafon chiar se execută. Mutația `2L → L` a picat 5 teste.
- Jet: `2g → g`, d fără pătrat, deschidere ignorată, Cv lipsă. Mutația `2g → g` a picat 7 teste.

**Controlul de integritate prinde F6.** Există dublă plasă: `BANNED` conține F6, iar testul „rândul F6 conține «de găsit»” previne un control orb. Dacă un fapt ar folosi F6, cad două teste.

**Probleme neblocante, tester:**
- `hammer.test.ts:62-67`: rândurile PVC (t = 5 și t = 2) sunt redundante cu cele de oțel. Allievi nu depinde de c, deci aceleași valori confirmă același cod. Ele nu pot cădea separat de rândurile pentru oțel.
- `friction.test.ts:21-25` și `jet.test.ts:9-14`: testele de constante (`NU`, `ROUGHNESS_MM`, `CV`, `NOZZLE_MM`) sunt aproape tautologice. Prind totuși o schimbare accidentală de valoare, deci valoare mică, nu zero.
- `jet.test.ts`: g = 9,8 în loc de 9,81 nu e prins (0,1 %). Tester-ul a declarat asta.
- `hammer.test.ts:23-24`: raportul c oțel/PVC în (3, 4) e puțin legat de implementare, dar e ancorat în E7 („~3 ori”) și rămâne valid.
- Formatul UI și pragurile de avertisment (5 %, 0,3·H0) nu sunt acoperite de teste unitare. Ele rămân verificate de `verify-learn-page.mjs`, rulat de planner.

## Concluzie
Formulele sunt corecte, textele vin din documente, nu e cod în plus nejustificat, iar testele au valoare reală, validată de mutațiile planner-ului. Rămân doar observații neblocante, nu retrimit la coder.

Fișiere citite:
- `D:\GridSim\learn\sim\friction.ts`
- `D:\GridSim\learn\sim\hammer.ts`
- `D:\GridSim\learn\sim\jet.ts`
- `D:\GridSim\learn\scenes\penstock.ts`
- `D:\GridSim\learn\scenes\nozzle.ts`
- `D:\GridSim\learn\lessons.ts`
- `D:\GridSim\learn\ui.ts`
- `D:\GridSim\learn\main.ts`
- `D:\GridSim\learn\toon.ts`, doar `part`, `overlayLines` și `wordSprite`
- `D:\GridSim\tests\learn\friction.test.ts`
- `D:\GridSim\tests\learn\hammer.test.ts`
- `D:\GridSim\tests\learn\jet.test.ts`
- `D:\GridSim\tests\learn\lessons.test.ts`

---

## Decizia planner-ului (23-10-2026)

- **Verdict acceptat.** Nu retrimit nimic la coder sau la tester.
- **Neblocantele rămân deocamdată**, fiindcă nu schimbă ce vede sau ce învață utilizatorul:
  - plasarea lui `GROSS_HEAD_M`;
  - rândul „Nozzle” fără `part`;
  - `highlight` pe linii;
  - rândurile PVC redundante;
  - testele de constante.
  - Le reiau la lecțiile 7–9, dacă se ating aceleași fișiere.
- **Următorul pas:** gate-ul M6, aprobarea lui Lucian pe capturile lecțiilor 4–6.
