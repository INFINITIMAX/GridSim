# L2 · tester — testele pentru lecțiile 4–6

Planner: Claude. Data: 23-10-2026. Raportul îl scrii în `docs/handoff/L2-tester-raport.md`.

Coder-ul scrie codul în paralel, după `docs/handoff/L2-coder.md`. Scrii testele **după specificație**, nu după implementare: semnăturile funcțiilor sunt fixate în brief-ul coder-ului (secțiunea „Simulatoare, cod pur”). Dacă la final codul există deja, citește-l doar ca să verifici numele importurilor, nu ca să-ți alegi valorile.

## Citește înainte

1. `docs/handoff/L2-coder.md`: semnăturile din `learn/sim/friction.ts`, `hammer.ts` și `jet.ts`, plus `UNLOCKED = 6`.
2. `docs/learn/pelton/lectia-04.md`, `lectia-05.md`, `lectia-06.md`: secțiunile „Valori de test” (inclusiv controalele externe și eratele) și tabelele „Afirmații și surse”.
3. Testele existente din `tests/learn/`: același stil, Vitest, comentarii în română, markdown importat cu `?raw`. Repo-ul nu are `@types/node`, deci nu folosești `node:fs`.

## Ce scrii

- **`tests/learn/friction.test.ts`:**
  - valorile implicite din L4: V, Re, f, hf, H netă, %;
  - cazul oțel și cazul D = 100 mm;
  - **controlul extern 1** (S2 ex. 2.5, patru diametre, ≤ 2 %);
  - **controlul extern 2** (S2 ex. 2.2, Moody, ≤ 5 %, cu V = 1,886 m/s și D = 0,9 m, conform eratei).
  - Un test care prinde o regresie de unități: e dat în mm, D în m.
- **`tests/learn/hammer.test.ts`:**
  - c pentru oțel și PVC (S2 ex. 5.7, ≤ 1 %);
  - S2 ex. 5.9: c = 836,7 m/s, Tc = 0,41 s, N = 0,070, ΔH = 25,65 m, fiecare ≤ 1 %;
  - S2 ex. 5.8 cu V = 4 m/s;
  - valorile implicite din L5 (Tc, Joukowsky 133,0 m, 4,02 m la 5 s, 10,56 m la 2 s, 53,6 m la 0,5 s);
  - ramura „sudden” vs „gradual” chiar la granița t = Tc;
  - plafonul: Allievi nu depășește niciodată Joukowsky.
- **`tests/learn/jet.test.ts`:**
  - 33,62 m/s la 60 m, 33,34 m/s la 59 m;
  - Q = 41,9 L/s la 100 % și 20,95 L/s la 50 %, cu aceeași viteză;
  - puterea 14,55 kW, prin `powerKW`;
  - **controlul extern** S7: v = 65,14 m/s, d = 0,140 m, ≤ 0,5 %.
- **`tests/learn/lessons.test.ts`** extins:
  - `UNLOCKED = 6` și 6 lecții;
  - importuri `?raw` pentru `lectia-04..06.md`;
  - integritatea afirmațiilor pentru toate cele 6;
  - F6 adăugat la lista interzisă.
  - Păstrezi testele existente; nu le slăbești.

## Reguli

- Fiecare valoare așteptată vine din documentele lecțiilor sau din sursa citată, nu din rularea codului.
- Fără teste care trec indiferent de cod: fiecare test trebuie să pice dacă formula e greșită (de ex. lipsește un 2, e pus 9,8 în loc de 9,81 acolo unde contează, ln în loc de log₁₀).
- Fără teste redundante: nu testa aceeași valoare de două ori prin același drum.
- Toleranțele sunt cele din documente. Unde documentul nu spune, folosește `toBeCloseTo` cu precizia zecimalelor publicate.

## Ce nu ai voie să atingi

Tot ce nu e în `tests/learn/`, în afară de raportul tău.

## Rezultatul

- Fișierele de test.
- `docs/handoff/L2-tester-raport.md`, cu lista testelor și, pentru fiecare fișier, ce mutație a codului ar trebui să-l facă să pice.

Nu rulezi comenzi și nu poți spune că testele „trec”; le rulează planner-ul.
