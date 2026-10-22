# L2 · reviewer — lecțiile 4–6 și testele lor

Planner: Claude. Data: 23-10-2026. Nu ai unelte de scriere: întorci verdictul în răspuns, iar planner-ul îl transcrie integral în `docs/handoff/L2-reviewer-raport.md`.

## Ce verifici

1. **Coder-ul.** Brief: `docs/handoff/L2-coder.md`; raport: `docs/handoff/L2-coder-raport.md`. Cod nou sau schimbat:
   - `learn/sim/friction.ts`, `hammer.ts`, `jet.ts`;
   - `learn/scenes/penstock.ts`, `nozzle.ts`;
   - `learn/lessons.ts`, `ui.ts`, `main.ts`, `toon.ts`, `style.css`.

   Întrebări:
   - Există cod în plus față de task? Coder-ul a declarat el însuși `GROSS_HEAD_M`, `HammerParams`, `wordSprite` și opțiunea `side` din `part()`. Sunt justificate?
   - Formulele din `learn/sim/` corespund documentelor `docs/learn/pelton/lectia-04.md`, `lectia-05.md`, `lectia-06.md` și surselor citate acolo? În special:
     - unitățile din Swamee–Jain (e în mm, D în m);
     - plafonul Allievi ≤ Joukowsky;
     - granița t = Tc.
   - Textele din `lessons.ts` vin din documentele lecțiilor? Uită-te la frazele pe care coder-ul spune că le-a formulat singur și la claim-ul D1 pus pe „Valve” și „Nozzle” în Parts L4. Susține ID-ul afirmația?
   - Generalizarea lui `selectLesson` din `main.ts` poate strica lecțiile 1–3? Sunt animațiile oprite corect la schimbarea lecției (`stopHammer`, `stopDrop`)?
   - Contractul DOM extins din `docs/learn/pelton/plan.md` e respectat?
2. **Planner-ul** (abatere de la flux, de verificat la fel de strict). După livrare, planner-ul a mutat cotele din L4 în `learn/scenes/penstock.ts`:
   - `GX`, `NET_X` și `EL_Z0` au valori noi, iar `HZ` a dispărut;
   - cotele stau acum la z = NOZ_Z;
   - etichetele sunt mai mari.
   Verifică dacă a introdus o regresie, de exemplu ancore de callout greșite sau linii rămase în aer.
3. **Tester-ul.** Brief: `docs/handoff/L2-tester.md`; raport: `docs/handoff/L2-tester-raport.md`. Teste:
   - `tests/learn/friction.test.ts`, `hammer.test.ts`, `jet.test.ts`;
   - `lessons.test.ts`, extins.

   Întrebări:
   - Sunt teste redundante, sau teste care trec indiferent de cod?
   - Valorile așteptate vin din documente și surse, nu din cod?
   - Tester-ul a dedus L = 500 m la ex. 2.2. E corect față de S2? Enunțul S2 spune „along a length of 500 m”.
   - Controlul de integritate prinde F6 dacă ar fi folosit?

## Ce a rulat deja planner-ul (rezultate reale)

- `npx vitest run tests/learn`: 7 fișiere, 94 de teste trec, din prima.
- `node scripts/verify-types.mjs`: trece.
- `node scripts/verify-learn-build.mjs`: trece.
- `node scripts/verify-learn-page.mjs`, extins la lecțiile 1–6: trece. Verifică valorile afișate și avertismentele din L4–L6.
- Mutații, fiecare urmată de restaurarea fișierului:

| Fișier | Mutație | Teste picate |
|---|---|---|
| `friction.ts` | 5,74 → 5,0 | 4 |
| `hammer.ts` | 2L → L în Tc | 5 |
| `jet.ts` | 2g → g | 7 |

- Capturile `shots/learn-lesson-4.png`, `-5.png`, `-6.png` arată scenele randate.

## Format verdict

- **ACCEPTAT** sau **RESPINS**.
- Lista problemelor. Pentru fiecare:
  - `fișier:linie`;
  - severitate: blocant / neblocant;
  - cui îi aparține: coder / tester / planner.
