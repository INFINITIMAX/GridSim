# P2: modelul fizic (coder), task cornerstone
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Scrie modelul fizic al rețelei în `src/model/`: TypeScript pur, determinist, fără three.js și fără DOM. E fundația pe care se construiesc jocul, scena și interfața. Tester-ul va scrie după aceea testele T1–T4, T6 și T7 din `docs/calcule.md`.

## Context
- Citește întâi: `AGENTS.md`, `docs/spec.md` (secțiunea „Model fizic”) și **integral** `docs/calcule.md`. Acolo sunt toate cifrele, cu surse, și calculele de mână pe care testele le vor verifica.
- Rețea cu un singur nod. Pas fix `dt = 0.05` s.

## Design cerut (poți rafina numele, dar nu și comportamentul)

### `src/model/units.ts`
- `type SourceKind = "nuclear" | "coal" | "ccgt" | "ocgt" | "hydro" | "solar" | "wind" | "battery"`.
- `interface SourceSpec { kind; label; synchronous: boolean; inertiaH: number /* s */; rampPerMin: number /* fracție din Pmax pe minut */; minLoad: number /* fracție */; startMinutes: number; co2PerKWh: number | null /* g, ciclu de viață */; source: string /* URL exact din docs/calcule.md */; assumption?: string /* text când valoarea e presupunere de joc */ }`.
- `export const CATALOG: Record<SourceKind, SourceSpec>`, cu valorile **exact** din tabelul 2 al `docs/calcule.md`. Pentru baterie, `rampPerMin = 60` (adică 100% într-o secundă).
- `type LoadKind = "homes" | "factory" | "datacenter" | "ev"`, cu un mic catalog (etichetă, putere tipică în MW). Valorile sunt de joc și se marchează ca atare.

### `src/model/config.ts`
`GridConfig` cu valorile implicite din `docs/calcule.md`, fiecare cu comentariu-sursă:
- `f0 = 50`, `dt = 0.05`, `loadDampingPerHz = 0.01`;
- `fcrDeadbandHz = 0.01`, `fcrFullDeviationHz = 0.2`, `fcrFullTimeS = 30`;
- `ufls`: cele 6 trepte (frecvență, fracție cumulată);
- `genTripLowHz = 47.5`, `genTripHighHz = 51.5`;
- `afrr`: `{ kp, ki }`, calibrate astfel încât frecvența să revină la 50,00 ± 0,01 Hz în ≤ 15 min după incidentul T2. Documentează cum le-ai ales.

### `src/model/grid.ts`
- `createGrid(config, units: UnitInit[], loads: LoadInit[]): GridState`.
- `step(state: GridState, config: GridConfig, input?: StepInput): GridState`: un pas de `dt`. Poate muta starea pe loc, dar trebuie să fie determinist: fără `Math.random`, `Date` sau `performance`.
- `StepInput`: lista de evenimente aplicate la începutul pasului: `tripUnit(id)`, `addUnit`, `removeUnit`, `setSetpoint(id, MW)`, `addLoad`, `removeLoad`, `setLoad(id, MW)`, `setAvailability(id, MW)` (pentru solar și vânt; P3 le va alimenta din profiluri) și `restoreShedLoad()`.
- Fiecare unitate: `id`, `kind`, `pMax`, `setpoint`, `p` (puterea efectivă), `online`, `fcrReserveMW`, `afrrReserveMW`, iar pentru baterie `capacityMWh`, `soc`, `etaCharge`, `etaDischarge`.

### Fizica (comportament obligatoriu)
1. **Swing equation agregată:** `df/dt = f0 · (P_gen − P_load_eff) / (2 · H_sys · S_sys)`.
   - `S_sys = Σ pMax`, doar peste unitățile **sincrone și online**.
   - `H_sys = Σ(H·pMax) / S_sys`.
   - `P_load_eff = P_load_neshed · (1 + loadDampingPerHz · (f − f0))`.
   - Integrare explicită Euler cu `dt`.
2. **Fără mașini sincrone online** (`S_sys = 0`): blackout, cu motivul `"no-synchronous-machines"`. În joc, invertoarele sunt grid-following; asta va apărea în „How real is this?”.
3. **FCR** pe fiecare unitate cu `fcrReserveMW > 0`:
   - ținta e `−clamp(Δf_ef / fcrFullDeviationHz, −1, 1) · fcrReserveMW`, unde `Δf_ef` scade banda moartă: 0 în interiorul ±10 mHz, apoi `Δf ∓ 0,01`;
   - livrarea e limitată în viteză la `fcrReserveMW / fcrFullTimeS` pe secundă, ceea ce dă 50% la 15 s și 100% la 30 s (SO GL).
4. **aFRR:** un regulator PI pe Δf, comun pe sistem, împărțit proporțional cu `afrrReserveMW`. Limitat la rezervă și la viteza de variație a fiecărei unități. Anti-windup obligatoriu.
5. **Puterea unității:** `p = setpoint_rampat + fcr + afrr`, limitată la `[minLoad·pMax, pMax]` cât timp e online.
   - Schimbările de `setpoint` urcă sau coboară cu `rampPerMin · pMax / 60` MW/s.
   - Solarul și eolianul au `p = min(setpoint, availability)` și nu fac FCR implicit.
6. **Baterie:** `p > 0` înseamnă descărcare. SOC scade cu `p·dt/3600 / (capacityMWh · etaDischarge)` la descărcare și crește cu `−p·dt/3600 · etaCharge / capacityMWh` la încărcare. Rămâne în `[0, 1]`; la limită, `p` se taie.
7. **UFLS:** când `f ≤` pragul unei trepte încă nedeclanșate, treapta se declanșează (latch). `shedFraction` crește la valoarea ei cumulată și se scade din consum. Se resetează doar prin `restoreShedLoad()`.
8. **Deconectarea generatoarelor:** dacă `f < genTripLowHz` sau `f > genTripHighHz`, toate unitățile sincrone ies din rețea (cascadă simplificată) și urmează blackout cu motiv `"under-frequency"` sau `"over-frequency"`. După blackout, `step` nu mai schimbă nimic.
9. **Jurnal de evenimente** în stare (`{ t, type, detail }`): unitate deconectată, treaptă UFLS, blackout. Interfața îl va afișa.
10. **Mărimi derivate** expuse în stare: `rocof` (Hz/s, pasul curent), `pGen`, `pLoad`, `pShed`, `hSys`, `sSys`, `fcrDeployed`, `afrrDeployed`.

### `src/model/index.ts`
Re-exportă API-ul public.

## Rezultatul așteptat
- Fișierele de mai sus, cu comentarii scurte acolo unde fizica nu e evidentă și cu trimiteri la secțiunile din `docs/calcule.md`.
- **Raport:** `docs/handoff/P2-coder-raport.md`, cu API-ul final (semnături), deciziile de modelare, calibrarea aFRR și limitele cunoscute.

## Constrângeri dure
- TypeScript strict, fără `any`, fără `@ts-ignore`, fără dependențe noi.
- `src/model/**` nu importă nimic din `three` și nu atinge `window`, `document` sau API-uri DOM (gate G5).
- Fiecare `SourceSpec.source` e un URL care apare literal în `docs/calcule.md` (gate G4).
- Nu scrie cod în plus față de ce e cerut: fără topologie, tensiune, profiluri zilnice (P3) sau logică de nivel (P4).

## Ce NU ai voie să atingi
- `src/scene/**`, `src/main.ts`, `src/ui/**`, `src/game/**`: alt coder lucrează în paralel la scenă.
- `tests/**`: le scrie tester-ul.
- `docs/**` (în afară de raportul tău), `GATES.md`, `TASKS.md`, config, `package.json`.
- Nu rulezi comenzi.
