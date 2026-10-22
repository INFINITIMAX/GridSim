# S4: brief pentru tester. Testele pentru randamentele RETScreen, generator și transformator

## Context

Citește:
- `docs/handoff/S4-coder.md`, care e specificația;
- `docs/handoff/S4-coder-raport.md`;
- `2d/hydro.ts`, după schimbare;
- `tests/2d/hydro.test.ts`, care conține testele S3.

Randamentul nu mai e o curbă inventată, ci formulele RETScreen din Anexa A. Peste el se aplică generatorul (0,95) și transformatorul (pierdere de 1%). **Valorile așteptate le calculezi de mână din formulele din brief, nu din rularea codului.** Oricum nu poți rula nimic. În comentariu scrii calculul pe scurt.

## Ce faci în `tests/2d/hydro.test.ts`

### 1. Recalculezi tot ce depinde de randament

- Cazurile de mână A–I: `kw`, `running`, `used` și `spilled` se pot schimba. **Atenție la dispatch.** Cu Francis, la sarcină parțială, randamentul scade mult, așa că la I (Francis ×2, debit 3) verifici de mână dacă o turbină pe plin bate două la 75%.
- Testele de `installedKW` pentru C.
- `annual` pentru ianuarie, cu și fără curățitor.
- `powerCurve` pentru Kaplan large la 12 m³/s.
- Numele testelor care conțin cifre se actualizează și ele.

### 2. Teste noi pentru `turbineEfficiency` și `peakEfficiency`

Folosești câte un punct calculat de mână pentru fiecare tehnologie, cu `h` și `Qd` alese de tine. Minimum:
- **Kaplan, h = 5, Qd = 2:** la Q = Qp (1,5), la Q = Qd și la Q = 0,4 (20%). La 20% trebuie să iasă vizibil sub 0,5. E lecția din audit;
- **Francis, h = 11,6, Qd = 2:** la Q = Qp, la Q = 1,5 și la Q = Qd. Ramura peste Qp folosește er;
- **Crossflow, Qd = 2:** la Q = Qd (0,79) și la Q = 0,3;
- **`peakEfficiency`** egal cu `turbineEfficiency` la Qp, pentru Kaplan și Francis;
- **limitarea la 0:** Francis la cădere foarte mică (de exemplu h = 3) și debit mic dă exact 0, nu negativ.

### 3. Lanțul de puteri

- `powerKW` e egal cu `turbineKW · 0,95 · 0,99` pe un caz care rulează;
- `turbineKW` e 0 pe un caz oprit.

### 4. Proprietățile S3 rămân

Dacă una nu mai e adevărată matematic cu noile formule, nu o slăbești în tăcere: o scrii în raport, cu demonstrația. Înainte să scrii o proprietate nouă, verifici că e fezabilă.

## Toleranța

Rămâne `near()`, cu 0,5% relativ.

## Ce nu ai voie

- să modifici codul din `2d/`;
- să scrii teste care trec indiferent de cod (de exemplu, să compari codul cu el însuși acolo unde se poate o valoare de mână);
- să rulezi comenzi.

## Raport

Scrie în `docs/handoff/S4-tester-raport.md` tabelul cazurilor de mână, cu calculul fiecăruia, plus orice proprietate schimbată.
