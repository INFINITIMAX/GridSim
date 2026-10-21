# P2: raport coder
21-10-2026. Nimic rulat (nici typecheck, nici teste).

## Fișiere create (toate noi, în `src/model/`)
- `units.ts`: `SourceKind`, `SourceSpec`, `CATALOG` (tabelul 2 din calcule.md), `LoadKind`, `LoadSpec`, `LOAD_CATALOG` (valori de joc, marcate).
- `config.ts`: `GridConfig`, `UflsStage`, `AfrrConfig`, `DEFAULT_CONFIG`.
- `grid.ts`: starea, evenimentele, `createGrid`, `step`.
- `index.ts`: re-exporturi.

## API
- `createGrid(config: GridConfig, units: UnitInit[], loads: LoadInit[]): GridState`
- `step(state: GridState, config: GridConfig, input?: StepInput): GridState` (mută pe loc, returnează aceeași stare)
- `StepInput = { events: readonly GridEvent[] }`; `GridEvent`: `tripUnit{id}`, `addUnit{unit}`, `removeUnit{id}`, `setSetpoint{id,mw}`, `addLoad{load}`, `removeLoad{id}`, `setLoad{id,mw}`, `setAvailability{id,mw}`, `restoreShedLoad`. Id necunoscut = ignorat; id duplicat la add = `throw`.
- `UnitInit { id, kind, pMax, setpoint, online?, fcrReserveMW?, afrrReserveMW?, availability?, battery?: {capacityMWh, soc, etaCharge?, etaDischarge?} }`
- `UnitState`: `id, kind, pMax, setpoint, setpointRamped, p, online, availability, fcrReserveMW, afrrReserveMW, fcr, afrr, battery: {capacityMWh, soc, etaCharge, etaDischarge} | null` (bateria e **imbricată**, nu câmpuri plate).
- `GridState`: `t, f, units, loads, uflsTripped[], shedFraction, afrrIntegralMW, blackout: {t, reason} | null, log: {t,type,detail}[]`, plus derivate `rocof, pGen, pLoad, pShed, hSys, sSys, fcrDeployed, afrrDeployed`.
- `LoadInit/LoadState { id, kind, mw }`. `DEFAULT_CONFIG` exportat din `config.ts`.

## Decizii de modelare (nu erau în task)
- Starea inițială: `p = setpoint` clamped, FCR/aFRR = 0, `f = f0`. Tester-ul trebuie să echilibreze sarcina cu generarea ca să fie stare staționară.
- Ordinea în pas: evenimente, aFRR, unități (ramp, FCR, clamp, SOC), derivate, `t += dt`, Euler pe `f`, UFLS, protecții. FCR/aFRR folosesc `f` de la începutul pasului. Deci pe T1 (trip la începutul pasului, f = 50) ROCOF = −0,5 exact în primul pas.
- `pLoad` = consum efectiv (după UFLS și autoreglaj); UFLS se aplică din pasul următor declanșării.
- Banda moartă FCR se scade din Δf (conform brief-ului): quasi-staționarul T2 iese ~191 mHz (3150/16500) față de 182 mHz din calcule.md. E în ±10%, dar aproape de 5% abatere; dacă tester-ul vrea 182 exact, trebuie formula fără bandă moartă.
- aFRR: PI cu gains relative la sarcina totală (`P = Σ loads`, înainte de UFLS): `cmd = P·kp·e + integral`, `e = f0 − f`; clamp la ±Σ rezerve online; împărțit proporțional; limitat de rampa fiecărei unități. Anti-windup prin back-calculation: `integral += (ki·P·e + (livrat − cmd_brut)/trackingTimeS)·dt`. Am adăugat `trackingTimeS = 30` în `AfrrConfig` (extra față de `{kp, ki}`, necesar pentru anti-windup).
- Calibrare aFRR (`kp = 0,01`, `ki = 0,001`), detalii în comentariul din `config.ts`: tau ≈ (16 500 + kp·P)/(ki·P) = 120 s, abaterea scade sub 10 mHz în ~340 s. Calcul de mână, **nerulat**; T4 trebuie să o confirme (cere aFRR alocat ≥ 3 000 MW la incidentul T2, fiindcă în banda moartă FCR nu mai livrează).
- Baterie: `p` e tăiat la `[-maxCharge, maxDischarge]` derivate din SOC (exact, ca SOC să nu depășească [0,1] și bilanțul T6 să se păstreze). `capacityMWh > 0` obligatoriu (altfel `throw`). `batteryDefaultEta = 0,95` (presupunere de joc, în config).
- Solar/eolian: ramp aplicat setpoint-ului (solar 2,7·Pmax/min din [H]; eolian 60, presupunere), apoi `p = min(p, availability)`. Fără FCR dacă `fcrReserveMW = 0` (implicit 0 pentru toate).
- CATALOG: câmpul `source` e un singur URL pe tehnologie (cel pentru viteză/minim; H și CO₂ sunt în comentarii cu literele [A]..[F]). Valori numerice alese unde tabelul zice "ore"/"minute"/interval: nuclear 720 min, cărbune 165, CCGT 75, OCGT 8, hidro 5 (cu `assumption`).
- Blackout: `no-synchronous-machines` se declară în pasul în care `sSys = 0` (inclusiv pentru o rețea creată fără sincrone). Pe trip de frecvență, toate sincronele online ies (log `unit-tripped` per unitate, apoi `blackout`); nesincronele rămân online.
- `restoreShedLoad` nu scrie în jurnal.

## Nu am făcut
- Pornire/oprire unități cu `startMinutes` (P4), profiluri (P3), topologie. `startMinutes` e doar în catalog.
- Teste, alte fișiere.

## De verificat de planner
- `npm run typecheck` (strict + `noUncheckedIndexedAccess`; atenție la `forEach` cu `state.uflsTripped[i]`).
- G4: toate cele 7 URL-uri din `units.ts` apar literal în calcule.md (am copiat din secțiunea 4; verifică și `https://www.esig.energy/?p=5269`).
- G5: `grep` pe `src/model` pentru `three|window|document` (nu ar trebui să existe).
- T2 și T4 sunt cele riscante (nadir, ~191 vs 182 mHz, calibrarea aFRR).
