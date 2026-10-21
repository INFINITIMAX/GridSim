# P4: raport coder

## Fișiere create (`src/game/`)
- `builds.ts`: `BUILDS` (battery, ocgt, hydro, solar, wind: mărime, cost, setpoint, rezerve; marcate valori de joc), `CONSUMER_KINDS`, `buildStartSeconds`, `buildUnitInit`, `consumerInit`. Bateria: 100 MW / 200 MWh, SOC inițial 0,5, FCR 100.
- `level1.ts`: `LEVEL1` (config `ISLAND_CONFIG`, unități `hydro`/`gas`, sarcina `town` 570 MW, buget 100, durată 120 s, script: fabrică la 10 s, `tripUnit gas` la 50 s, apus solar 80/85/90/95/100 s cu 0,8/0,6/0,4/0,2/0 din pMax, reguli stele).
- `session.ts`: `createSession(mode)`, tipurile publice.
- `index.ts`: re-exporturi.

## API
`createSession("level1" | "sandbox")` întoarce `Session`: `advance(dt)`, `start()`, `build(kind)`, `demolish(id)`, `addConsumer(kind)`, `removeConsumer(id)`, `restoreLoad()`, `setSpeed(1|2|4)`, `result(): GameResult | null`, `snapshot(): Snapshot`. Acțiunile întorc `{ok:true} | {ok:false, reason}`.

## Decizii care nu erau în task
- În `prepare`, `build`/`demolish` reconstruiesc grila din liste (`createGrid`), imediat vizibile în snapshot. Demolarea dă înapoi costul; unitățile de start (`hydro`, `gas`) nu se pot demola în nivel.
- În nivel, `build`/`demolish` în `running` sunt refuzate. În sandbox: fără buget (`budget: null`), `build` gratuit; unitățile cu `startMinutes > 0` din CATALOG apar în `pendingBuilds` și intră online după acel timp simulat; `demolish` anulează și construcțiile în așteptare. Sandbox pornește cu aceeași configurație ca nivelul (hydro, gas, town), fără script.
- Acțiunile din `running` intră în coadă și se aplică la următorul pas al modelului (nu imediat în snapshot). Cele din `prepare` sunt imediate.
- `restoreLoad()` în `running` întoarce mereu `ok` (idempotent), refuză în rest.
- `snapshot()` CONSUMĂ `newMessages` (mesajele apărute de la ultimul snapshot, inclusiv intro la creare și mesajul de start). Un al doilea snapshot consecutiv le are goale.
- `result()` întoarce `null` cât jocul nu s-a terminat și mereu în sandbox. Stele: ★★★ dacă `maxShedFraction == 0` și nadir ≥ 49,2; ★★ dacă `maxShedFraction ≤ 0,05`; ★ dacă fără blackout; 0 la blackout. `maxShedFraction` e maximul vreodată (rămâne chiar dacă jucătorul apasă `restoreLoad`).
- Măsurători: `nadirHz`, `maxShedFraction`, `elapsedS`, `uflsStages` (maximul treptelor declanșate simultan). Nadir-ul se resetează la `start()`.
- Plafon: 400 de pași pe `advance` (20 s simulate); restul acumulatorului se aruncă. Evenimentele scriptate se aplică când `grid.t >= t` (cu epsilon), o singură dată (index în script). `advance` nu face nimic în afara `running`.
- Sandbox: la blackout starea rămâne `running`; vezi `snapshot().blackout`. Nu există reset.

## Nu am făcut
- Teste (rolul tester-ului), nimic în `src/model`, `tests`, `docs` (în afară de acest raport).
- Calibrare: nu am rulat nimic. SOC-ul inițial al bateriei (0,5) e ales de mine; scriptul de calibrare din `level1.md` nu e în repo, deci tabelul „Rezultate măsurate” nu e garantat.

## De verificat (planner)
- `npm run typecheck`, `npm test`.
- Tabelul din `level1.md`: nimic -> 1 stea (UFLS 21%); 2 baterii (80 puncte) -> 3 stele (nadir 49,41, fără UFLS); o baterie -> UFLS 5% => 2 stele.
- Risc: construcțiile solar/eolian/OCGT/hidro adaugă producție peste cei 570 MW de sarcină, deci rețeaua pornește cu surplus (aFRR îl corectează în timp). Dacă dă rezultate surprinzătoare, se ajustează costurile sau setpoint-urile din `BUILDS`.
- Pentru P5/P6: unitățile au ids `hydro`, `gas`, apoi `<kind>-<n>` pentru construcții; consumatorii `town`, `factory` (scriptat), `<kind>-<n>` în sandbox.

## Retur 1: echilibrare la construcție (doar `src/game/session.ts`)
Regula (funcția `rebalance`):
- Producție programată = suma setpoint-urilor unităților online; solar/eolian cât au disponibil (`min(setpoint, availability)`), nu se reduc. Baterii: setpoint 0, nu schimbă bilanțul.
- Surplus = programat - consum total (suma sarcinilor din grilă). Se reduc doar surplusurile (deficitul nu se atinge; îl corectează FCR/aFRR).
- Ordinea reducerii: hidro (cea mai mare pMax întâi), apoi gaz CCGT, apoi OCGT; fiecare până la minimul tehnic (`CATALOG.minLoad · pMax`). Include și construcțiile noi de aceste tipuri.
- La `start()` (nivel): se calculează pe grila din pregătire; setpoint-urile noi intră în grila reconstruită (`makeGrid(overrides)`), deci jocul începe echilibrat. Dacă rămâne surplus neabsorbit, `start()` refuză cu „Too much uncontrollable generation for this island: remove some solar or wind.” și starea rămâne `prepare`.
- Sandbox: când un `addUnit` intră online (imediat sau după `startMinutes`), în același pas se adaugă evenimente `setSetpoint` după `addUnit`. Dacă surplusul nu se poate absorbi, construcția rămâne (fără refuz; surplusul rămas îl ia FCR/aFRR).
- Neverificat (nu rulez nimic): f maxim < 50,2 Hz și rezultatele 1/2/3 stele de păstrat; de verificat de planner/tester.
