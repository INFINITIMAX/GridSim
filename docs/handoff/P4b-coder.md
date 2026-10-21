# P4b: curățenie în joc + acțiunea `tripUnit` (coder)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Modificări mici în `src/game/`, din review-ul P4 și din blocajul raportat de P6.

1. **Acțiune nouă `tripUnit(id): ActionResult`** în `Session`. Pune în coadă un eveniment `tripUnit` al modelului, aplicat la pasul următor (ca celelalte acțiuni din `running`). Refuză cu motiv dacă id-ul nu există, dacă unitatea e deja offline sau dacă starea nu e `running`.
   - E permisă în ambele moduri. Interfața o arată doar în sandbox, ca buton „Trip” lângă fiecare centrală, ca jucătorul să poată provoca un incident.
   - E2e (G7) o folosește prin `window.__gridsim.forceTrip`.
2. **Jurnalul în `snapshot()`:** nu mai copia tot `grid.log` la fiecare apel. Expune doar ultimele N intrări (N = 50, constantă cu nume), ca să nu crească costul pe cadru în sandbox. Documentează.
3. **Redenumire:** `Measurements.uflsStages` (număr) devine `maxUflsStages`. `Snapshot.uflsStages` (boolean[]) rămâne. Actualizează toate referințele din `src/game`. P6 (`src/ui`) poate folosi vechiul nume; în raport listează ce trebuie schimbat acolo, dar nu atinge `src/ui`.
4. Re-exportă `buildStartSeconds` din `src/game/index.ts` (P6 îl importă direct din `builds`).

## Context
`docs/handoff/P4-reviewer-raport.md` (neblocantele coder 1–2 și decizia planner-ului), `docs/handoff/P6-coder-raport.md` (blocajul `forceTrip`), `src/game/*.ts`.

## Rezultatul așteptat
- Modificări doar în `src/game/**`.
- **Raport:** `docs/handoff/P4b-coder-raport.md`, cu API-ul nou, plus lista exactă de locuri din `src/ui`/`src/main.ts` care trebuie actualizate după redenumire și pentru `forceTrip`.

## Constrângeri dure
TypeScript strict, fără `any`. Puritate (fără three/DOM/random/ceas). Fără alte funcționalități.

## Ce NU ai voie să atingi
`src/model/**`, `src/scene/**` (P5 lucrează acolo), `src/ui/**`, `src/main.ts`, `tests/**`, `docs/**` (în afară de raportul tău), config. Nu rulezi comenzi.
