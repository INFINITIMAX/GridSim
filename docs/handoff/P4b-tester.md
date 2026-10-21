# P4b: teste joc (tester)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
În `tests/game/`:
1. Testează `tripUnit(id)`: refuz pe id inexistent, pe unitate deja offline și în `prepare`; în `running`, unitatea e offline la pasul următor și apare în jurnal exact o dată.
2. Testează plafonul jurnalului din `snapshot().log` (`SNAPSHOT_LOG_ENTRIES = 50`, exportat din `src/game/session.ts`): după mai multe de 50 de evenimente, de exemplu în sandbox, cu mai multe `tripUnit`/UFLS, lungimea e ≤ 50 și conține **ultimele** intrări.
3. Din review-ul P4 (`docs/handoff/P4-reviewer-raport.md`, neblocantele tester):
   - șterge redundanța de la `level1.test.ts:105-111`;
   - adaugă blackout în sandbox prin `demolish("hydro")`: `blackout` nenul, motivul `under-frequency`, sesiunea rămâne `running`;
   - adaugă rebalance cu OCGT în sandbox: după intrarea online, hidro scade cu puterea OCGT (calcul de mână din `src/game/builds.ts`).
4. Actualizează referințele la `measurements.uflsStages`, devenit `maxUflsStages`, dacă există în teste.

## Context
`docs/handoff/P4b-coder.md`, `docs/handoff/P4b-coder-raport.md`, `docs/handoff/P4-reviewer-raport.md`, `src/game/*.ts`, `tests/game/*`.

## Reguli
- Valorile așteptate vin din calcule de mână, nu din rulări.
- Verifică dinamica, nu doar starea staționară.
- Nu rulezi; nu scrii că trec.
- **Raport:** `docs/handoff/P4b-tester-raport.md`.

## Ce NU ai voie să atingi
`src/**`, `docs/**` (în afară de raportul tău), config, `tests/model/**`. Nu rulezi comenzi.
