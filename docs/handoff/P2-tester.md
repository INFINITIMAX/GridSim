# P2: testele modelului fizic (tester)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Scrie testele Vitest pentru modelul din `src/model/`: **T1, T2, T3, T4, T6, T7**, exact după `docs/calcule.md`, secțiunea 3. T5 vine în P3, cu datele reale.

## Context
- Citește integral: `docs/calcule.md` (cifrele și criteriile), `docs/handoff/P2-coder-raport.md` (API-ul real: `createGrid`, `step`, evenimente, câmpurile din stare) și codul din `src/model/`.
- Pas fix 0,05 s. Ca să simulezi N secunde, apelezi `step` de N/0,05 ori.
- Ca să izolezi fenomenul testat, setezi explicit rezervele (FCR, aFRR) pe unități.

## Testele cerute
Fiecare `it(...)` începe cu ID-ul (de exemplu `it("T1: initial ROCOF after losing 1 GW of 10 GW", ...)`), fiindcă `scripts/verify-model.mjs` caută numele T1–T7.

| ID | Ce verifică | Criteriu de trecere |
|---|---|---|
| T1 | S = 10 000 MW sincron, H = 5 s, echilibru inițial; se deconectează brusc 1 000 MW (FCR și aFRR 0) | ROCOF în primul pas după incident: −0,5 Hz/s ±10% |
| T2 | Sistem tip CE: sarcină 150 000 MW, S = 200 000 MW, H_sys = 4 s, FCR total 3 000 MW, **aFRR 0**; pierdere bruscă de 3 000 MW | (a) nadir ≥ 49,2 Hz (abatere ≤ 800 mHz); (b) după ≥ 60 s, abaterea cvasi-staționară e 191 mHz ±10% |
| T3 | Insulă: sarcină 800 MW, 1 000 MW sincron cu H = 4 s, FCR 50 MW; pierdere bruscă de 250 MW | UFLS declanșează treapta 1 la ≤ 49,0 Hz; nadir > 47,5 Hz; fără blackout; după 60 s frecvența e peste 49,0 Hz |
| T4 | Scenariul T2, dar cu aFRR suficient (≥ 3 000 MW, conform raportului coder-ului) | frecvența ajunge la 50,00 ± 0,01 Hz și rămâne acolo înainte de 15 min simulate |
| T6 | Baterie de 100 MWh, SOC 0,5, randamente declarate; descarcă 20 MW timp de 1 h simulată, apoi încarcă | energia descărcată = ΔSOC · capacitate · η_descărcare, ±0,1%; SOC rămâne mereu în [0, 1]; la SOC 0 puterea e tăiată |
| T7 | Același scenariu (de exemplu T3) rulat de două ori | seriile de frecvență sunt identice element cu element (`toEqual`) |

## Teste negative (obligatorii, ca să nu treacă orice)
- T1: un sistem cu **H dublu** dă ROCOF pe jumătate (testul ar prinde un model care ignoră H).
- T3: aceeași pierdere cu FCR 500 MW **nu** declanșează UFLS (testul ar prinde un model care declanșează mereu).
- T2: abaterea cvasi-staționară **nu** e zero cu aFRR 0 (testul ar prinde un aFRR scăpat în model).

## Rezultatul așteptat
- `tests/model/grid.test.ts` (sau mai multe fișiere în `tests/model/`). Șterge `tests/model/smoke.test.ts`, care era doar un placeholder.
- Un helper mic de simulare în fișierul de test e OK; nu modifica `src/model`.
- **Raport:** `docs/handoff/P2-tester-raport.md`, cu ce testează fiecare test, cum ai ales scenariile și ce ți s-a părut suspect în model (dacă e cazul).

## Constrângeri dure
- Fără teste care trec indiferent de cod (de exemplu, aserțiuni pe valori calculate tot de model).
- Valorile așteptate vin din `docs/calcule.md`, nu din rularea modelului.
- TypeScript strict, fără `any`.
- Nu poți rula testele: planner-ul le rulează și îți întoarce rezultatul. **Nu scrie în raport că trec.**

## Ce NU ai voie să atingi
- `src/**` (codul de producție), `docs/**` (în afară de raportul tău), `GATES.md`, `TASKS.md`, config.
- Nu rulezi comenzi.
