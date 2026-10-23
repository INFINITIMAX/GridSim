# L3 · tester — testele pentru lecțiile 7–9

Planner: Claude. Data: 23-10-2026. Raportul îl scrii în `docs/handoff/L3-tester-raport.md`.

Coder-ul scrie codul în paralel, după `docs/handoff/L3-coder.md`. Tu scrii testele **după specificație**, nu după implementare. Semnăturile funcțiilor sunt fixate în brief-ul coder-ului, secțiunea „Simulatoare, cod pur”. Dacă la final codul există deja, citește-l doar ca să verifici numele importurilor, nu ca să-ți alegi valorile.

## Citește înainte

1. `docs/handoff/L3-coder.md`: semnăturile din `learn/sim/bucket.ts`, `efficiency.ts`, `specific.ts`, plus `UNLOCKED = 9`.
2. `docs/learn/pelton/lectia-07.md`, `lectia-08.md`, `lectia-09.md`: secțiunile „Valori de test”, inclusiv controalele externe, și tabelele „Afirmații și surse”.
3. Testele existente din `tests/learn/`: același stil, Vitest, comentarii în română, markdown importat cu `?raw`. Repo-ul nu are `@types/node`, deci fără `node:fs`.

## Ce scrii

- **`tests/learn/bucket.test.ts`:**
  - ηh la r = 0,25, 0,5, 0,75 și 1 (θ = 165°, k = 1);
  - θ = 90° și 180° la r = 0,5;
  - maximul: la θ = 165°, niciun r din grila 0..1 cu pas 0,01 nu depășește valoarea de la 0,5;
  - v₂ la r = 0,25 și 0,5;
  - controlul energetic ηh = 1 − v₂²/v₁² (k = 1) în câteva puncte;
  - puterea jetului 23,29 kW;
  - **controlul extern S7, ex. 1** (ηh = 0,913 cu k = 0,86; v₁, u, D), ≤ 1 %.
- **`tests/learn/efficiency.test.ts`:**
  - tabelul de valori din `lectia-08.md`;
  - Qp pentru j = 1 și j = 2;
  - **controlul extern 1:** căderea între 60 % și 100 % din debit, între 2 % și 3 %;
  - **controlul extern 2:** fig. 6.30, |Δ| ≤ 8 pp în toate cele 10 puncte;
  - un test care prinde coeficientul pus sub putere: la q = 0,2 și j = 1, η relativ trebuie să fie > 0,8.
- **`tests/learn/specific.test.ts`:**
  - tabelul de valori din `lectia-09.md`, cu n_QE, verdictul și D1;
  - **controalele externe ESHA** (Francis la 100 m; Pelton cu un jet la 400 m și D1 = 0,815 m), ≤ 1 %;
  - limitele inclusive: o valoare exact pe o margine de bandă, construită din formula benzii, nu din cod;
  - căderea în afara domeniului (de ex. n_QE Pelton bun, dar H = 20 m) → Pelton nu se potrivește.
- **`tests/learn/lessons.test.ts`**, extins:
  - `UNLOCKED = 9` și 9 lecții;
  - importuri `?raw` pentru `lectia-07..09.md`;
  - integritatea afirmațiilor pentru toate cele 9;
  - G9 și I7 adăugate la lista interzisă, cu un test de control pentru rândurile marcate „de găsit”.
  - Păstrezi testele existente și nu le slăbești.

## Reguli

- Fiecare valoare așteptată vine din documentele lecțiilor sau din sursa citată, nu din rularea codului.
- Fără teste care trec indiferent de cod: fiecare trebuie să pice dacă formula e greșită. Exemple: φ = θ în loc de 180 − θ, grade în loc de radiani, √Q lipsă, exponentul 0,75 greșit, rpm în loc de rot/s.
- Fără teste redundante: nu testa aceeași valoare de două ori pe același drum.
- Toleranțele sunt cele din documente. Unde documentul nu spune, folosești `toBeCloseTo` cu precizia zecimalelor publicate.

## Ce nu ai voie să atingi

Tot ce nu e în `tests/learn/`, în afară de raportul tău.

## Rezultatul

- Fișierele de test.
- `docs/handoff/L3-tester-raport.md`, cu lista testelor și, pentru fiecare fișier, ce mutație a codului ar trebui să-l facă să pice.

Nu rulezi comenzi și nu poți spune că testele „trec”; le rulează planner-ul.
