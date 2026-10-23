# L4 · raport tester (lecțiile 10–12)

Data: 23-10-2026. Nu am rulat nimic; nu afirm că testele trec. Am scris după lectia-10/11/12.md și semnăturile din brief-ul coder-ului, fără să citesc implementarea.

## Fișiere

### `tests/learn/generator.test.ts` (nou)
- Tabelul din lectia-10 (5 rânduri): f, n_gen, raport necesar. Pică la: formulă 60 în loc de 120, p·n/120 inversat, `ratioFor50Hz` cu fracția răsturnată.
- `syncSpeedRpm` 2–12 poli la 50 Hz; invers cu `frequencyHz`. Pică la: 120 greșit, p în loc de 1/p.
- ESHA tab. 6.5: 14 valori la 50 Hz (2–28 poli, scrise ca în sursă: 428, 272, 231 …), |Δ| < 1 rpm. Pică la: orice constantă greșită, rotunjire agresivă.
- 60 Hz fără erată (2–12, 20, 24) plus erata (14 poli = 514,3; 26 = 276,9). Pică la: 120 hardcodat pentru 50 Hz (ignoră `hz`).
- Kaplan 28 poli / 214 rpm: ≤ 0,5 %.

### `tests/learn/governor.test.ts` (nou)
- `turbinePowerPU` la 1, 2, 0,5. Pică la: (2 − w) în loc de w·(2 − w).
- `TM_S` = 2.
- Trace: 101 valori, start 50 Hz.
- Fără ELC, consum 0: f(1), f(2), f(10) și tot traseul față de 50·(2 − e^(−t/2)), ≤ 0,01 Hz; valorile 69,7/81,6/99,7; plafon 100 Hz. Pică la: Euler cu pas mare, ecuație fără w la stânga (t_m·dw/dt), t_m ignorat.
- Fără ELC, consum 50 %: 60,9 / 84,7, strict crescător, sub 85,36 Hz. Pică la: formula puterii turbinei greșită (echilibrul s-ar muta), depășire numerică.
- Cu ELC (consum 0, 0,25, 0,5, 1): toate 50 Hz. Pică la: ELC ignorat.
- t_m = 4: f(1 s) mai mic decât la 2 și egal cu analiticul. Pică la: `tmS` ignorat (se folosește constanta).
- `ballastKW` cu și fără ELC. `waterStartS` 0,324 s (±0,5 %), t_m/t_w > 4 (≈ 6,2), proporționalitate cu L, V, 1/H.
- ESHA tab. 6.6: w final / 1,85 în [1,05; 1,12]. Pică la: ambalare ≠ ~2 (ex. trace oprit prea devreme sau lungime greșită).

### `tests/learn/chain.test.ts` (nou)
- Tabelul din lectia-12 (4 rânduri: 100 %/50 % × maker/small): brut, net, ax, el. (±0,01 kW), global (±0,001), kWh la 40 % (±10 kWh). Pică la: hf calculat la debitul plin (la 50 % net diferă cu 0,16 kW), 8760 greșit, g ≠ 9,81, η_t/η_g schimbate, `overall` calculat față de net.
- Test dedicat: net/brut la 50 % = (60 − 0,304)/60.
- `annualKWh`: 10 kW × 0,5 = 43 800; factor 1.
- Controale externe: NRCan 14,7 (≤ 0,5 %), Holland 18 (≤ 2 %), global `small` în (0,5; 0,7) și în (0,58; 0,6), E/(8760·P) = factorul (0,1; 0,4; 1).

### `tests/learn/lessons.test.ts` (extins; testele vechi păstrate)
- `UNLOCKED` = 12 și 12 lecții (înainte 9). Importuri `?raw` pentru lectia-10..12.md; `ALL` extins la 12 (structură + integritatea afirmațiilor pentru toate).
- BANNED + J6, K7, L6. Controale „de găsit”: J6 și K7. L6 nu conține „de găsit” în document (spune „intră doar în teste”), deci controlul verifică „doar în teste”; același caz ca B5.
- Callout-urile verbatim extinse la lecțiile 6–11 (indici 6–11 = L7–L12).
- Pică la: UNLOCKED rămas 9, text de callout modificat, ID folosit fără rând în tabel, J6/K7/L6 pe ecran, tab-uri goale.

## Ce nu am acoperit
- Scene three (`unit.ts`, `plant.ts` setChain), UI (ieșirile `data-out`, formatul „67,200”, avertismentul > 55 Hz, `[data-run]`): nu există infrastructură de test DOM/WebGL în `tests/learn/`. Rămân pentru verificarea vizuală/e2e a planner-ului.
- Constanta `GEN_EFF`/`SMALL_TURBINE_EFF` direct: acoperite indirect prin tabelul de lanț.
- „L5 doar ca definiție”: nu poate fi testat automat fără a inventa o regulă de text.

## Riscuri / de urmărit
- Valorile din lectia-12 sunt rotunjite la 0,01; toleranța mea 0,01 kW poate pica la limită. Dacă pică la ~0,01, ajustează toleranța, nu codul.
- `overall` presupus fracție (0,777), conform „overall = elec/gross” din brief. Dacă coder-ul îl dă în %, pică chain.test (semnalează).
- Valorile ESHA tab. 6.5/60 Hz le-am scris din tabelul standard al sursei (nu sunt toate în docs); cele din docs (428, 272, 231) sunt exact ca acolo.
- Nu am găsit bug în cod (nu l-am citit).

## Comandă
```
npx vitest run tests/learn/generator.test.ts tests/learn/governor.test.ts tests/learn/chain.test.ts tests/learn/lessons.test.ts
```
(sau `npx vitest run tests/learn`)
