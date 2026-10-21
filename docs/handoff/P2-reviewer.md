# P2: review model + teste (reviewer)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Verifică simultan livrarea coder-ului (`src/model/`) și a tester-ului (`tests/model/grid.test.ts`) pentru P2. Întoarce un verdict: **ACCEPTAT** sau **RESPINS**, cu motive concrete (fișier:linie).

## Ce ai de citit
- Brief-urile: `docs/handoff/P2-coder.md`, `docs/handoff/P2-tester.md`.
- Rapoartele: `docs/handoff/P2-coder-raport.md`, `docs/handoff/P2-tester-raport.md`.
- Referința: `docs/calcule.md` (cifre, surse, criterii).
- Codul: `src/model/*.ts`. Testele: `tests/model/grid.test.ts`.

## Rezultatele rulate de planner (21-10-2026)
- `npx vitest run`: **20 passed / 20**. Prima rulare a dat 19/20. A picat „T1 (negativ): doubling the synchronous capacity”, pentru că scenariul punea OCGT-ul de 20 000 MW la setpoint 8 000, sub minimul tehnic de 45%; modelul l-a ridicat corect la 9 000 și sistemul nu mai pornea echilibrat. Planner-ul a corectat scenariul (sarcină 11 000, setpoint 10 000). Verifică și corecția asta.
- `npm run typecheck`: trece.
- Gate G4 (surse) și G5 (puritate): trec.
- Gate G3 pică doar pentru că T5 lipsește (vine în P3), ceea ce e așteptat.

## Ce verifici
**La coder:**
1. Cod inutil sau în plus față de brief (de exemplu funcționalități P3/P4 strecurate, abstracții nefolosite).
2. Fizica respectă brief-ul și `calcule.md`: swing equation, FCR (bandă moartă, rampă 30 s, limită de rezervă), aFRR cu anti-windup, UFLS cu latch, deconectare la 47,5/51,5 Hz, baterie, determinism.
3. Bug-uri: cazuri limită (S_sys = 0, unitate scoasă în timpul FCR, SOC la limite, evenimente pe id-uri inexistente).

**La tester:**
1. Teste redundante sau care trec întotdeauna, indiferent de cod.
2. Valori așteptate luate din model în loc de `calcule.md`.
3. Abaterile tester-ului de la brief (T3 negativ înlocuit, T1 negativ cu S dublu și cu raportul H 5/3, T2(b) măsurat la 120 s, T4 la 1 200 s): sunt justificate fizic?
4. Ce comportament important din brief rămâne netestat (tester-ul menționează: anti-windup, rampele unităților, protecția la 51,5 Hz).

## Format răspuns
- Verdict: ACCEPTAT / RESPINS.
- Probleme blocante (dacă există), cu fișier:linie și de ce.
- Probleme neblocante / sugestii.
- Pentru fiecare problemă: cine trebuie să o repare (coder / tester / planner) și ce anume.

Nu modifici nimic. Planner-ul îți transcrie verdictul integral în `docs/handoff/P2-reviewer-raport.md`.
