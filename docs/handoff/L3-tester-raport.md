# L3 · tester — raport

Data: 23-10-2026. Testele sunt scrise din specificație (lectia-07..09.md + brief-ul coder-ului). Nu am rulat nimic și nu afirm că trec; le rulează planner-ul.

## Fișiere

### `tests/learn/bucket.test.ts` (nou)
- constante `DEFLECTION_DEG = 165`, `K_IDEAL = 1`;
- ηh la r = 0,25 / 0,5 / 0,75 (θ = 165°, k = 1), r = 0 și 1 -> 0;
- θ = 90° -> 0,5 și θ = 180° -> 1 la r = 0,5;
- maximul pe grila 0..1 (pas 0,01) nu depășește valoarea de la 0,5; k < 1 scade randamentul;
- v₂ la r = 0,25 (17,09) și 0,5 (4,35); r = 1 -> v₂ = v₁;
- controlul energetic ηh = 1 − v₂²/v₁² în 6 puncte (inclusiv θ = 90° și 120°);
- jetPowerKW = 23,29 kW; control ½ρQv₁² = powerKW(59, Q, Cv²); scalare cu v₁²;
- puterea pe cupe la r = 0,5 = 22,89 kW;
- control extern S7 ex. 1: v₁, u, ηh (k = 0,86), D, fiecare ≤ 1 %.

Mutații care îl fac să pice: φ = θ în loc de 180 − θ (θ = 90°/180° și r = 0,25/0,5 pică), grade în loc de radiani (toate valorile ηh), ½ lipsă sau v₁ în loc de v₁² la putere, w fără k sau componente tangențială/axială schimbate (v₂ și controlul energetic), factorul 2 lipsă (maximul și toate valorile).

### `tests/learn/efficiency.test.ts` (nou)
- peakEfficiency (0,89 / 0,90 pentru j = 2..6), peakFlowRatio (0,663 / 0,664);
- tabelul din lectia-08.md (5 rânduri: η la 3 zecimale, P la 1 prin powerKW);
- relativeEfficiency la 5 puncte (j = 1); formula explicită 1 − 1,335·|…|^6; simetria în jurul lui Qp; valoarea 1 la Qp;
- coeficientul pus sub putere: q = 0,2, j = 1 -> relativ > 0,8;
- turbineEfficiency = relativ × vârf;
- control extern 1: căderea 0,6 -> 1,0 între 2 % și 3 %;
- control extern 2: fig. 6.30, |Δ| ≤ 0,08 în 10 puncte.

Mutații: coeficient ridicat la putere (pică testul dedicat, tabelul și controlul 2), exponent 5,6 + 0,4j greșit, 0,662 în loc de 0,663, vârf 0,90 la j = 1, lipsa înmulțirii cu ep, lipsa valorii absolute (simetria).

### `tests/learn/specific.test.ts` (nou)
- tabelul din lectia-09.md (5 rânduri): n_QE (≤ 0,5 % relativ, ca să nu depindă de rotunjirea la 4 zecimale), verdict, D1 la 2 zecimale;
- proprietăți ale specificSpeed: rot/s, √Q, H^0,75, liniar în rpm; peltonDiameterM: √H și 1/rpm;
- controale ESHA: 100 m / 0,9 m³/s / 1500 rpm -> 0,135 și doar Francis; 400 m / 0,42 / 1000 -> 0,0218 ± 1 %, Pelton, D1 0,815 ± 1 %;
- limite inclusive, cu nqe pasat direct la `fittingTurbines` (valori literale din tabel, deci fără erori de virgulă mobilă): Pelton j = 1 (0,005; 0,025), j = 4 (0,01–0,05), Francis (0,05; 0,33), Kaplan (0,19; 1,55), plus fiecare limită de cădere (50/1300, 25/350, 2/40) și valori imediat în afară;
- ordine pelton, francis, kaplan (n_QE 0,05 la j = 4 și 100 m; n_QE 0,25 la 30 m);
- cădere în afara domeniului: Pelton la 20 m, Francis la 500 m, Kaplan la 100 m -> [].

Mutații: rpm în loc de rot/s, √Q lipsă, exponent diferit de 0,75, √j lipsă sau aplicat greșit, `<` în loc de `<=`, domenii de cădere ignorate sau cu valori greșite, ordine schimbată.

### `tests/learn/lessons.test.ts` (extins; testele vechi păstrate)
- `UNLOCKED = 9`, 9 lecții, `it.each` pe toate cele 9 (>= 4 callout-uri, tab-uri nevide, integritatea afirmațiilor);
- importuri `?raw` pentru lectia-07..09.md;
- G9 și I7 adăugate la `BANNED`; teste de control: rândurile G9 și I7 conțin „de găsit”;
- test nou: callout-urile lecțiilor 7–9 apar verbatim în tabelul din document;
- test nou: textele lecției 7 nu conțin „1,8” / „1.9” (valoarea de ambalare „de găsit” din G8).

Mutații: UNLOCKED != 9, lipsa unei lecții, ID de afirmație inexistent în tabel, G9/I7 folosite în UI, text de callout modificat, 1,8–1,9 scris pe ecran.

## Decizii și puncte de atenție pentru planner

1. **G8 și „de găsit”.** Rândul G8 conține „de găsit” (partea cu ambalarea 1,8–1,9), dar brieful permite G8 pentru „puterea e zero când cupa merge cât jetul”. Testul existent „ID folosit nu e de găsit” ar fi picat pe orice folosire a lui G8. Am introdus lista `PARTIAL = ["G8"]` care îl scutește de acea verificare și am compensat cu testul de la punctul 4 de mai sus. Nu e o slăbire a testelor vechi pentru celelalte ID-uri.
2. Regex-ul `/1[.,]8/` din testul lecției 7 poate da fals pozitiv dacă un text legitim conține de ex. „11,8” sau „1.83”. Dacă pică, verifică întâi textul, apoi regex-ul.
3. Testul callout-urilor verbatim presupune că `callout.text` e exact textul din coloana „Text” (fără prefixe); câmpul `text` există în `Fact` (folosit și de testele vechi). Numele câmpului `callouts[].text` nu l-am verificat în `lessons.ts` nou.
4. Cazul-limită j = 3 la 1500 rpm (0,04337 vs 0,0433) nu e testat, cum cere documentul. Nici cazul ESHA 100 m / 600 rpm / 4 jeturi.
5. Neacoperit, deliberat: scenele three, UI-ul (ID-uri `data-out`, formatări „73.7 %”, curba SVG), `main.ts`. Nu există infrastructură de teste DOM/WebGL în `tests/learn/` și brieful n-a cerut-o; formatările se verifică la gate-ul vizual.
6. Nu am găsit bug în cod (n-am citit implementarea). Importurile presupun exporturile din brief: `bucket.ts` (`DEFLECTION_DEG`, `K_IDEAL`, `bucketEfficiency`, `exitSpeedMs`, `jetPowerKW`), `efficiency.ts` (`peakEfficiency`, `peakFlowRatio`, `relativeEfficiency`, `turbineEfficiency`), `specific.ts` (`specificSpeed`, `peltonDiameterM`, `fittingTurbines`). Parametrii: `exitSpeedMs(jetMs, ratio, deflectionDeg, k)`, `fittingTurbines(nqe, headM, jets)` care întoarce `string[]` cu "pelton" | "francis" | "kaplan". Dacă `jetPowerKW` primește altceva decât (Q în L/s, v₁), testele de putere trebuie ajustate (brieful spune `flowLps`).

## Comandă pentru planner

```powershell
cd D:\GridSim; npx vitest run tests/learn
```
(sau `npx vitest run tests/learn/bucket.test.ts tests/learn/efficiency.test.ts tests/learn/specific.test.ts tests/learn/lessons.test.ts`; plus `npx tsc --noEmit` dacă tests/ intră în tsconfig, pentru tipurile din `it.each`).
