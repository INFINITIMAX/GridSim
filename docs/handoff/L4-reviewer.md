# L4 · reviewer — lecțiile 10–12 și testele lor

Planner: Claude. Data: 23-10-2026. Nu ai unelte de scriere: întorci verdictul în răspuns, iar planner-ul îl transcrie integral în `docs/handoff/L4-reviewer-raport.md`.

## Ce verifici

1. **Coder-ul.** Brief: `docs/handoff/L4-coder.md`; raport: `docs/handoff/L4-coder-raport.md`.
   - Cod nou:
     - `learn/sim/generator.ts`, `governor.ts`, `chain.ts`;
     - `learn/scenes/unit.ts`.
   - Cod schimbat: `learn/scenes/plant.ts` (`setChain`, `makeHouse`), `learn/lessons.ts`, `ui.ts`, `main.ts`, `style.css`.

   Întrebări:
   - Există cod în plus față de task? Coder-ul declară singur:
     - `DESIGN_FLOW_LPS`;
     - `makeHouse`;
     - decalul de frecvență peste `makeCabinet`;
     - lățimea minimă a fâșiilor gri;
     - cronometrul din UI pentru graficul L11;
     - `waterStartS`, nefolosit în UI.

     Sunt justificate?
   - Formulele corespund documentelor `docs/learn/pelton/lectia-10.md`, `lectia-11.md`, `lectia-12.md`? În special:
     - RK4 corect implementat, cu P_sarcină = P_t la ELC;
     - hf calculat la debitul curent;
     - Qd din `jetFlowLps`;
     - `GROSS_HEAD_M` refolosit.
   - `plant.ts`: L1 și L2 rămân neschimbate când `setChain(null)`?
   - Callout-urile „Belt” și „Coupling”: unul arată spre un obiect absent, în funcție de modul ales. Problemă blocantă sau nu?
   - Textele din `lessons.ts` vin din documente? J6, K7 și L6 nu sunt folosite? L5 apare doar ca definiție?
   - `main.ts`: `stopRun()` și `setChain(null)` la schimbarea lecției. Poate strica lecțiile 1–9?
   - Contractul DOM din `plan.md`, secțiunea „lecțiile 10–12”, e respectat? În special, ieșirile L11 se completează imediat, fără apăsarea butonului.
2. **Planner-ul** (abatere de la flux). După livrare, planner-ul a schimbat:
   - în `lessons.ts:457`, claim-urile `["B3", "K4"]` → `["K4"]`. B3 e din L2, iar testul de integritate l-a respins. Textul a primit „(lesson 6)”;
   - notația: „t_m” → „tm”, iar „η_t·η_g” → „ηturbine · ηgenerator”, în `lessons.ts`, `ui.ts` și în documentele L11 și L12;
   - „ballast heater” → „ballast resistor” în Overview-ul L11 (cod și document), pentru că K7, căldura, are o singură sursă.
3. **Tester-ul.** Brief: `docs/handoff/L4-tester.md`; raport: `docs/handoff/L4-tester-raport.md`. Teste:
   - `tests/learn/generator.test.ts`, `governor.test.ts`, `chain.test.ts`;
   - `lessons.test.ts`, extins.

   Întrebări:
   - Sunt teste redundante, sau teste care trec indiferent de cod?
   - Valorile așteptate vin din documente sau surse?
   - Controlul pentru L6 caută „doar în teste” în loc de „de găsit”. E o plasă reală?
   - Rândurile de 60 Hz pe care tester-ul le-a luat „din tabelul standard al sursei” se potrivesc cu tabelul ESHA 6.5 (vezi `data/refs/learn-dl3/t66.png`)?

## Ce a rulat deja planner-ul (rezultate reale)

- `npx vitest run tests/learn`: înainte de fix, 1 test picat (B3 în L11). După fix: suita completă are 22 de fișiere și 522 de teste, toate verzi.
- `node scripts/verify-types.mjs`: verde.
- `node scripts/verify-learn-build.mjs`: verde.
- `node scripts/verify-learn-page.mjs`, extins la toate cele 12 lecții: verde. Verifică valorile din L10–L12, avertismentul L11 cu și fără ELC, graficul și butonul. A rulat după retușurile de text.
- Mutații, fiecare urmată de restaurarea fișierului:

| Fișier | Mutație | Teste picate |
|---|---|---|
| `generator.ts` | /120 → /60 | 7 |
| `governor.ts` | w(2 − w) → (2 − w) | 8 |
| `chain.ts` | 8760 → 8700 | 9 |

- Capturile `shots/learn-lesson-10.png`, `-11.png`, `-12.png`.

## Format verdict

- **ACCEPTAT** sau **RESPINS**.
- Lista problemelor. Pentru fiecare:
  - `fișier:linie`;
  - severitate: blocant / neblocant;
  - cui îi aparține: coder / tester / planner.
