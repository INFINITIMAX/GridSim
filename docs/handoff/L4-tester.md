# L4 · tester — testele pentru lecțiile 10–12

Planner: Claude. Data: 23-10-2026. Raportul îl scrii în `docs/handoff/L4-tester-raport.md`.

Coder-ul scrie codul în paralel, după `docs/handoff/L4-coder.md`. Tu scrii testele **după specificație**, nu după implementare. Semnăturile funcțiilor sunt fixate în brief-ul coder-ului, secțiunea „Simulatoare, cod pur”. Dacă la final codul există deja, citește-l doar ca să verifici numele importurilor, nu ca să-ți alegi valorile.

## Citește înainte

1. `docs/handoff/L4-coder.md`: semnăturile din `learn/sim/generator.ts`, `governor.ts` și `chain.ts`, plus `UNLOCKED = 12`.
2. `docs/learn/pelton/lectia-10.md`, `lectia-11.md`, `lectia-12.md`: secțiunile „Valori de test”, inclusiv controalele externe și eratele, și tabelele „Afirmații și surse”.
3. Testele existente din `tests/learn/`: același stil, Vitest, comentarii în română, markdown importat cu `?raw`. Repo-ul nu are `@types/node`, deci fără `node:fs`.

## Ce scrii

- **`tests/learn/generator.test.ts`:**
  - tabelul de valori din `lectia-10.md`;
  - **controlul extern ESHA tab. 6.5**: coloana de 50 Hz pentru 2–28 de poli, |n − n_ESHA| < 1 rpm, cu valorile scrise în test exact ca în sursă (428, 272, 231 etc.);
  - rândurile de 60 Hz fără erată;
  - **exemplul cu Kaplan-ul de 28 de poli la 214 rpm**, ≤ 0,5 %.
- **`tests/learn/governor.test.ts`:**
  - `turbinePowerPU` la w = 1 (1), w = 2 (0) și w = 0,5 (0,75);
  - `frequencyTrace`:
    - are 101 valori și pornește de la 50 Hz;
    - fără ELC, consum 0: f(1 s), f(2 s) și f(10 s) față de **soluția analitică** 50·(2 − e^(−t/2)), ≤ 0,01 Hz;
    - fără ELC, consum 50 %: 60,9 și 84,7 Hz la 1 s și 10 s; trace-ul crește monoton spre echilibrul de 85,36 Hz, fără să-l depășească;
    - cu ELC: toate valorile 50 Hz, la orice consum;
    - un t_m mai mare încetinește creșterea (f(1 s) mai mic);
  - `ballastKW`;
  - `waterStartS(150, 1.2732, 60)` = 0,324 s și raportul 2/0,324 > 4;
  - **controlul extern ESHA tab. 6.6**: raportul dintre turația finală a modelului (w = 2) și 1,85 e în [1,05; 1,12].
- **`tests/learn/chain.test.ts`:**
  - tabelul de valori din `lectia-12.md` (hf, brut, net, ax, el., global, kWh);
  - **controalele externe**:
    - NRCan 14,7 kW (cu `powerKW`, ≤ 0,5 %);
    - Holland ~18 kW (≤ 2 %);
    - globalul setului `small` între 0,5 și 0,7;
    - E/(8760·P_el) = factorul de încărcare.
- **`tests/learn/lessons.test.ts`**, extins:
  - `UNLOCKED = 12` și 12 lecții;
  - importuri `?raw` pentru `lectia-10..12.md`;
  - integritatea afirmațiilor pentru toate cele 12;
  - J6, K7 și L6 adăugate la lista interzisă, cu controalele „de găsit”;
  - callout-urile L10–L12 verbatim.
  - Păstrezi testele existente și nu le slăbești.

## Reguli

- Fiecare valoare așteptată vine din documente sau din sursa citată, nu din rularea codului.
- Fără teste care trec indiferent de cod. Exemple de greșeli pe care trebuie să le prindă:
  - 60 în loc de 120;
  - w·(2 − w) înlocuit cu (2 − w);
  - Euler în loc de RK4 cu pas mare;
  - ELC ignorat;
  - hf necalculat la debitul curent;
  - 8760 greșit.
- Fără teste redundante.
- Toleranțele sunt cele din documente; altfel `toBeCloseTo` cu precizia publicată.

## Ce nu ai voie să atingi

Tot ce nu e în `tests/learn/`, în afară de raportul tău.

## Rezultatul

- Fișierele de test.
- `docs/handoff/L4-tester-raport.md`, cu lista testelor și mutațiile care ar trebui să facă fiecare fișier să pice.

Nu rulezi comenzi și nu poți spune că testele „trec”; le rulează planner-ul.
