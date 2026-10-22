# S4: brief pentru reviewer

## Ce citești

- specificația: `docs/handoff/S4-coder.md` și `docs/handoff/S4-tester.md`;
- rapoartele: `docs/handoff/S4-coder-raport.md` și `docs/handoff/S4-tester-raport.md`;
- codul: `2d/hydro.ts` și `2d/panel.ts`, mai ales partea cu „peak here”;
- testele: `tests/2d/hydro.test.ts`;
- formulele: `data/refs/appA-p38.png`, `appA-p39.png` și `appA-p40.png`, adică RETScreen Anexa A.

## Ce a adăugat planner-ul după coder

În Francis: `if (ep <= 0 || 3.94 - 0.0195 * nq <= 0) return 0;`. Motivul: în afara domeniului formulei, sub ~9 m de cădere, exponentul devine negativ și randamentul iese fals. Jocul permite Francis doar de la 10 m.

## Rezultatele rulate de planner

- `tsc` e curat;
- 222 de teste din 222 trec;
- dacă `GENERATOR_EFFICIENCY` devine 1, pică 13 teste;
- reimplementarea Python independentă (`scripts/audit_hydro.py`) dă 0 nepotriviri pe 19.440 de cazuri.

## Verifică

1. Formulele din cod corespund literă cu literă cu Anexa A din imagini (Kaplan, Francis, Crossflow și diametrul rotorului).
2. Codul are ceva în plus față de brief?
3. Există teste care trec indiferent de cod, teste redundante sau valori de mână greșite? Verifică prin sondaj cel puțin 3 cazuri de mână.
4. Lanțul de puteri: generatorul și transformatorul se aplică o singură dată, iar `installedKW` e consecvent.

## Verdictul

ACCEPT sau RESPINS, cu motivele.
