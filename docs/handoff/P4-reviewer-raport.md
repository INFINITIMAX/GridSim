# P4: verdictul reviewer-ului (transcris integral de planner, 21-10-2026)

## Verdict P4: ACCEPTAT (cu observații neblocante)

Am citit toate fișierele din brief (level1.md, ambele brief-uri și rapoarte, `src/game/*.ts`, `tests/game/*.ts`). Nu am rulat nimic. Mă bazez pe cele 145/145 și typecheck OK raportate de planner.

### Coder: ce am verificat
- **Mașina de stări** (`session.ts`): prepare → running → won | lost. `advance` nu face nimic în afara `running`. Sandbox pornește direct în running și nu se termină. Corect.
- **Acumulator:** pas fix, plafon 400 de pași (`session.ts:27, 320-328`), restul aruncat. Corect. Viteza se aplică pe timp real, iar plafonul pe pași.
- **Evenimente scriptate:** un index monoton (`scriptIndex`, `session.ts:256-268`) garantează „exact o dată” indiferent de feliere. Epsilon-ul e corect. Scriptul nu rulează în sandbox.
- **`rebalance`** (`session.ts:165-198`): ordinea e hidro (pMax descrescător), apoi CCGT, apoi OCGT. Taie până la `minLoad·pMax` și reduce doar surplusul. Solarul și eolianul contează cât au disponibil, iar bateria cu setpoint 0 nu schimbă bilanțul.
  - `start()` refuză cu motiv clar la surplus neabsorbabil și rămâne în `prepare` (`session.ts:335-338`).
  - În sandbox, `setSetpoint` se adaugă în același pas, după `addUnit` (`session.ts:278-297`). Asta acoperă și construcțiile cu `startMinutes > 0`.
- **Puritate:** în `src/game` nu apare three, DOM, `Math.random`, `Date` sau `performance`. `src/model` nu e atins.
- **Cod în plus:** nu am găsit nimic semnificativ. Deciziile din raport (refund la demolare, `pendingBuilds`, `restoreLoad` idempotent) sunt necesare sau implicate de brief.

### Coder: neblocante
1. `session.ts:501-544`, `snapshot()`:
   - Consumă `newMessages`. Merge doar dacă P6 apelează `snapshot()` o singură dată pe cadru, cum a cerut planner-ul. Dacă scena și UI-ul apelează fiecare `snapshot()`, unul pierde mesajele. Contractul trebuie scris explicit în brief-ul P6.
   - Copiază tot `grid.log` la fiecare apel (`:542`). În sandbox jurnalul crește nelimitat, deci costul pe cadru crește liniar. De urmărit în P6 (de exemplu cu un plafon sau cu „log de la indexul N”).
2. `session.ts:96` și `:44`: `uflsStages` înseamnă `boolean[]` în `Snapshot` și `number` în `Measurements`. Denumire confuză pentru consumatorii din P5/P6. Redenumire opțională.
3. `session.ts:463-471`: ramura `lost` și `BLACKOUT_TEXT` sunt practic inaccesibile prin API-ul public în nivel (nicio combinație din buget nu dă blackout, iar hidro nu se poate demola). Nu o scot, pentru că regulile de stele cer explicit 0 stele la blackout. Rămâne totuși cod netestat (vezi mai jos).
4. `snapshot().consumers[].shedMW/shedFraction` e aceeași fracție globală pentru toți consumatorii (`:530-531`), nu per cartier. Consecvent cu modelul. Tester-ul a semnalat corect că UI-ul nu poate arăta „care cartier s-a stins”.

### Tester: ce am verificat
- Fiecare grup de teste are o schimbare concretă care l-ar face să cadă (tester-ul le listează, iar eu am verificat cele principale).
  - L4 compară cu calcule de mână (minim hidro 180, minim gaz 90, marja 300 MW), nu cu valori din rulări. Acoperă și 4x solar refuzat versus 3x solar la limită.
  - L5 acoperă patru felieri, cu mesaje și jurnal. Corecția planner-ului `/gas plant tripped/` (`level1.test.ts:348`) e corectă: restrânge regex-ul la mesajul de declanșare, fără să slăbească testul.
  - L7 încearcă să strice toate colecțiile și verifică și efectul asupra evoluției ulterioare (`session.test.ts:117-129`). E bun.
  - L6 prinde cu adevărat atât plafonul, cât și „restul aruncat” (`session.test.ts:19-27`).
- Valorile L2 (1/2/3 stele pentru 0/1/2 baterii) vin din măsurătorile planner-ului. Dar asertările sunt pe relații (>5%, ≤5%, ==0, nadir ≥ 49,2), nu pe numere exacte, deci nu sunt fragile la mici variații de calibrare.

### Tester: neblocante
1. **Redundanță:** `level1.test.ts:105-111` („stelele cresc cu numărul de baterii”) repetă exact cele trei teste de la `:68-88`. Se poate șterge.
2. `level1.test.ts:242-249` (hidroul nou rămâne la 50 MW) repetă parțial cazul „hidro nou” din tabelul L4 (`:219`). Același lucru pentru `:261-266` („fără construcții”), care e aproape banal (se cuplează cu L1). Redundanță mică.
3. **Nivelurile L5:** primul test (`:320-350`) și cele două „niciodată mai devreme” (`:352-380`) se suprapun parțial. Cele separate au totuși valoare pentru felierea fină, așa că le las.
4. **Neacoperit, `lost` / 0 stele:** se poate testa măcar partea de blackout în sandbox, prin `demolish("hydro")`. Hidro are 420 MW din 570 MW sarcină, deci frecvența cade sub limită. Un test ar verifica `snapshot().blackout !== null`, motivul `under-frequency` și că sesiunea rămâne `running`. Nu acoperă ramura `result()` cu 0 stele, care rămâne neverificată. Cum nu e accesibilă din nivel, e acceptabil să rămână așa. Dacă planner-ul vrea acoperire, singura cale este un test unitar pe `result()` cu o stare forțată, ceea ce ar cere un cârlig de test în cod. Nu recomand.
5. **Sandbox, rebalance:** nu e testat pentru OCGT sau hidro nou. Testul hidro pending (`sandbox.test.ts:66-92`) verifică doar lipsa blackout-ului, nu și setpoint-urile după intrarea online. Singura acoperire a `rebalance` în sandbox e solarul (`:39-51`). Un test ar construi OCGT în sandbox și ar verifica că hidroul scade cu ~60 MW. Util, dar nu esențial.
6. **Precondiții fragile (declarate de tester):** `session.test.ts:193` (f > 49,0 la t = 70 s), `:240` (nadir < 49,7) și `sandbox.test.ts:48-49` (|f−50| < 0,05, hidro 340±5). Toate trec acum (145/145). Dacă P4a/calibrarea se mai schimbă, ele cad primele, dar cad cu mesaj de precondiție explicit.

### Cine repară ce
Nimic blocant, deci nu se retrimite. Pentru o curățenie ulterioară (la alegerea planner-ului, de preferat împreună cu P5/P6):
- **Tester:** șterge `level1.test.ts:105-111`; adaugă testul de blackout în sandbox și, opțional, unul pentru rebalance cu OCGT în sandbox.
- **Coder (la P6):** limitează sau paginează `log` din `snapshot()`; clarifică `uflsStages`. Contractul „un singur `snapshot()` pe cadru” trebuie scris în brief-ul P6.

Fișiere citite: `D:\GridSim\src\game\session.ts`, `D:\GridSim\src\game\builds.ts`, `D:\GridSim\src\game\level1.ts`, `D:\GridSim\tests\game\level1.test.ts`, `D:\GridSim\tests\game\session.test.ts`, `D:\GridSim\tests\game\sandbox.test.ts`, `D:\GridSim\tests\game\helpers.ts`.

---

## Decizia planner-ului (21-10-2026)
- **P4 închis** (145/145, ACCEPTAT).
- Contractul „un singur `snapshot()` pe cadru” e deja scris în brief-ul P6 (secțiunea `main.ts`). Îl verific la integrare.
- **P4b** (mic, după P5/P6, ca să nu ating `src/game` cât lucrează alții): plafon/paginare pentru `log` în `snapshot()`, redenumirea `uflsStages` din `Measurements` (de exemplu `maxUflsStages`), testul de blackout în sandbox (`demolish("hydro")`), rebalance cu OCGT în sandbox și ștergerea redundanței de la `level1.test.ts:105-111`.
- Ramura `result()` cu 0 stele rămâne netestată unitar. O acoperă e2e-ul G8 (blackout, game over) prin hook-ul din P6.
