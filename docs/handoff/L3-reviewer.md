# L3 · reviewer — lecțiile 7–9 și testele lor

Planner: Claude. Data: 23-10-2026. Nu ai unelte de scriere: întorci verdictul în răspuns, iar planner-ul îl transcrie integral în `docs/handoff/L3-reviewer-raport.md`.

## Ce verifici

1. **Coder-ul.** Brief: `docs/handoff/L3-coder.md`; raport: `docs/handoff/L3-coder-raport.md`.
   - Cod nou:
     - `learn/sim/bucket.ts`, `efficiency.ts`, `specific.ts`;
     - `learn/scenes/runner.ts`, `chart.ts`.
   - Cod schimbat: `learn/lessons.ts`, `ui.ts`, `main.ts`, `style.css`, `scenes/nozzle.ts` (doar `export` pe `stream`).

   Întrebări:
   - Există cod în plus față de task? Coder-ul declară singur:
     - `setLesson(n)` pe `RunnerScene`;
     - două săgeți de ieșire;
     - modelul de cupă mărit, separat de rotor;
     - `BANDS` și `bandFor` exportate.

     Sunt justificate?
   - Formulele corespund documentelor `docs/learn/pelton/lectia-07.md`, `lectia-08.md`, `lectia-09.md`? În special:
     - φ = 180° − θ, cu conversia în radiani;
     - în curba RETScreen, coeficientul (1,31 + 0,025j) **înmulțește** puterea (vezi `data/refs/appA-p40.png` și `data/refs/learn-dl3/hg-turbine.py` linia 461);
     - n_QE cu rpm/60 și (9,81·H)^0,75;
     - limitele inclusive ale benzilor.
   - Textele din `lessons.ts` vin din documentele lecțiilor? G8 e folosit doar pentru „puterea devine zero la u = v₁”? G9 și I7 nu sunt folosite?
   - Schimbarea din `main.ts` poate strica lecțiile 1–6? Animația rotorului se oprește la schimbarea lecției?
   - E respectat contractul DOM din `docs/learn/pelton/plan.md`, secțiunea „lecțiile 7–9”?
2. **Planner-ul** (abatere de la flux, de verificat la fel de strict). După livrare, planner-ul a înlocuit „n_QE” cu „nQE” și „(gH)^¾” cu „(gH)^0.75” în textele din `lessons.ts`, `ui.ts` și `scenes/chart.ts`, pentru că textele se afișează escapate.
3. **Tester-ul.** Brief: `docs/handoff/L3-tester.md`; raport: `docs/handoff/L3-tester-raport.md`. Teste:
   - `tests/learn/bucket.test.ts`, `efficiency.test.ts`, `specific.test.ts`;
   - `lessons.test.ts`, extins.

   Întrebări:
   - Sunt teste redundante, sau teste care trec indiferent de cod?
   - Valorile așteptate vin din documente și surse, nu din cod?
   - Lista `PARTIAL = ["G8"]` și regex-ul /1[.,]8/ sunt o plasă corectă? Ar putea ascunde o folosire a valorii de ambalare 1,8–1,9?
   - Controlul de integritate prinde G9 sau I7 dacă ar fi folosite?

## Ce a rulat deja planner-ul (rezultate reale)

- `npx vitest run tests/learn`: 10 fișiere, 187 de teste trec, din prima.
- `node scripts/verify-types.mjs`: trece.
- `node scripts/verify-learn-build.mjs`: trece.
- `node scripts/verify-learn-page.mjs`, extins la lecțiile 1–9: trece. Verifică valorile din L7–L9 și verdictul L9 la 750, la 1500 și la 4 jeturi, plus Francis și Kaplan. A rulat înainte de schimbarea „nQE”; se rulează din nou.
- Mutații, fiecare urmată de restaurarea fișierului:

| Fișier | Mutație | Teste picate |
|---|---|---|
| `bucket.ts` | φ = θ în loc de 180 − θ | 9 |
| `efficiency.ts` | coeficientul mutat sub putere | 16 |
| `specific.ts` | (9,81·H)^0,75 → H^0,75 | 8 |

- Capturile `shots/learn-lesson-7.png`, `-8.png`, `-9.png` arată scenele randate.

## Format verdict

- **ACCEPTAT** sau **RESPINS**.
- Lista problemelor. Pentru fiecare:
  - `fișier:linie`;
  - severitate: blocant / neblocant;
  - cui îi aparține: coder / tester / planner.
