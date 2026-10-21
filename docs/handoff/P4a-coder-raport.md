# P4a: raport coder

## Modificări
- `src/model/units.ts`: `SourceSpec` primește `fcrFullTimeS?: number` și `sources?: readonly string[]`. Bateria: `fcrFullTimeS: 1` și `sources: [URL [J] NESO Dynamic Containment]`. `source` rămâne NREL [G] (G4 neschimbat).
- `src/model/config.ts`: `ISLAND_CONFIG` (`fcrFullTimeS: 10`, `fcrFullDeviationHz: 0.5`), cu comentariu-sursă.
- `src/model/index.ts`: export `ISLAND_CONFIG`.
- `src/model/grid.ts`:
  - rampa FCR: `spec.fcrFullTimeS ?? config.fcrFullTimeS`;
  - prioritate FCR: dacă `p !== raw` (limitat), `fcr = pFcrOnly - base` și `afrr = p - pFcrOnly`, unde `pFcrOnly` e puterea limitată fără aFRR. Înlocuiește reducerea proporțională cu `k`. Cu semne opuse rămâne livrat netul posibil. Când nu se limitează nimic, `fcr` și `afrr` nu se ating (fără zgomot de virgulă mobilă);
  - `setSetpoint`, unitate online: `setpoint` și `setpointRamped` în `[CATALOG.minLoad·pMax, pMax]`; solar și eolian au minLoad 0, deci [0, pMax]; bateria [−pMax, pMax]. Unitate offline: comportamentul vechi ([0, pMax], baterie [−pMax, pMax]), fără clamp pe `setpointRamped`.

## Decizii care nu erau în task
- `sources` ca array (nu un singur string), ca să încapă mai multe URL-uri suplimentare. G4 verifică probabil doar `source`: URL-ul [J] din `sources` poate să nu fie acoperit de gate; de verificat.
- Offline păstrează clamp-ul vechi (task-ul spunea „pentru unitățile online").

## Retur 1: ciclu limită la semne opuse
- Doar `src/model/grid.ts`, `updateUnit`. Înlocuit `fcr = pFcrOnly − base`, `afrr = p − pFcrOnly` cu regula din brief.
- Dacă `p < raw` (limită de sus): `excess = raw − p`; se taie din aFRR pozitiv cât e `excess`, apoi restul din FCR pozitiv. Dacă `p > raw` (limită de jos): simetric, cu componentele negative (se aduc spre 0). Componentele cu sens opus limitei nu se ating.
- X4b (980, fcr +40, aFRR −10): excess 10, aFRR neatins, fcr 30, p = 1 000 la fiecare pas. X3 (fcr 40, aFRR 60, headroom 50): aFRR 10, fcr 40. Calculat de mână, nerulat.
- Caz de margine: dacă baza (setpoint) e ea însăși peste limită (ex. disponibilitate solară sub setpoint), `excess` poate depăși suma componentelor pozitive; ele ajung la 0, restul îl absoarbe clamp-ul din `p`.
- De rulat: `npm run typecheck; npx vitest run tests/model`.

## Nu am făcut
- `makeUnit` nu e schimbat: o unitate creată online cu `setpoint` sub minLoad (ex. 0 la termice) rămâne cum era; abia la primul `setSetpoint` `setpointRamped` sare la minim.
- Nu am atins `docs/**`, `tests/**`.

## De verificat (planner)
- `npm run typecheck`, `npm test`. Teste existente care ar putea depinde de vechiul `k` proporțional (P10 și cele cu fcr+afrr la limită): calculul P10 are doar FCR, deci rezultatul ar trebui să fie identic (afrr = 0). Testele care cer `setSetpoint` sub minim pe unități online se schimbă ca rezultat, dacă există.
- Tester: teste noi pentru prioritatea FCR (același semn și semne opuse), `setSetpoint` limitat, FFR baterie 1 s și `ISLAND_CONFIG`.
