# P2b: raport coder (21-10-2026)

Modificat doar `src/model/grid.ts`. Nu am rulat nimic.

## Schimbări
1. **aFRR back-calculation (~330):** am păstrat logica, am adăugat comentariu. Alegere: `delivered` din pasul anterior e acum valoarea redusă la livrarea efectivă (după clamp, vezi 2). Folosirea lui după actualizarea `u.afrr` ar măsura ținta rampată, nu livrarea reală, deci varianta cu comentariu e mai simplă și mai corectă.
2. **Raportare după clamp (`updateUnit`):** după calculul final al lui `p` (clampUnitPower + limită SOC), calculez `base` = puterea fără reglaj, cu aceleași limite. `k = clamp((p - base) / (fcr + afrr), 0, 1)`; `u.fcr *= k`, `u.afrr *= k`. Reducere proporțională, nu prioritate FCR (alegere proprie, simetrică și simplă).
3. **Baterie la creare:** nou helper `clampBySoc(b, p, dt)` (extras din `step`-ul vechi), folosit în `makeUnit` și `updateUnit`.

## Câmpuri cu semnificație schimbată
- `UnitState.fcr`, `UnitState.afrr`: acum contribuția efectivă livrată (după limite de putere/SOC), nu cea cerută. Starea FCR e rescrisă la valoarea livrată, deci nu se acumulează peste limită.
- `GridState.fcrDeployed`, `afrrDeployed`: suma acestor valori, deci realiste.

## Efecte laterale
- Dacă `setpointRamped` depășește limita (ex. disponibilitate solară scăzută), `base` e și el clamp-uit; reducerea afectează doar reglajul.
- Efect asupra aFRR: back-calculation vede acum livrarea reală și la saturarea unității (nu doar rezerva/rampa). Când unitățile nu sunt la limită, comportamentul e identic; T1–T7 nu ar trebui să se schimbe, dar planner-ul trebuie să confirme.

## De verificat (planner)
- `npm run typecheck`, `npm test` (20 teste), G4/G5.
- Riscul principal: T2/T4/T3 (nadir și FCR) dacă vreo unitate din scenarii e la `pMax`/`minLoad` în timpul FCR.
- Netestat: reducerea `fcr`/`afrr` la limită, bateria cu SOC mic la creare.
