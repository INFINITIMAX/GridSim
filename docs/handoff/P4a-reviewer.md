# P4a: review (reviewer)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Verifică livrările P4a ale coder-ului și tester-ului, inclusiv „Retur 1” la amândoi. Verdict: **ACCEPTAT** / **RESPINS**, cu fișier:linie.

## De citit
- Brief-urile: `docs/handoff/P4a-coder.md`, `docs/handoff/P4a-tester.md` (ambele cu „Retur 1”).
- Rapoartele: `docs/handoff/P4a-coder-raport.md`, `docs/handoff/P4a-tester-raport.md`.
- Verdictul tău anterior: `docs/handoff/P2b-reviewer-raport.md` (inclusiv decizia planner-ului).
- Codul: `src/model/{units,config,grid,index}.ts`. Testele: `tests/model/{helpers,grid.test,protection.test,extensions.test}.ts`.
- Referința: `docs/calcule.md` (FFR [J], preset insulă).

## Rezultate rulate de planner (21-10-2026)
- Prima rulare după P4a: 63/64. X4b a picat exact cum a prezis tester-ul (minP 992,67 MW, ciclu limită la semne opuse).
- Planner-ul a decis regula: „la limită se taie doar componentele care împing spre limita depășită, întâi aFRR, apoi FCR; cele cu sens opus nu se ating”. Coder-ul a reparat, iar tester-ul a ajustat X4b și a adăugat X4c (oglinda la minLoad).
- **Acum: 65/65**, typecheck OK, G4 (inclusiv `sources`) OK, G5 OK.

## Ce verifici
**Coder:**
- Regula de limitare e implementată corect în toate cazurile (sus/jos, semne egale/opuse, baza peste limită). Poate apărea un nou ciclu limită sau windup?
- `fcrFullTimeS` pe spec, `ISLAND_CONFIG` și limitarea `setSetpoint`: corecte și minime?
- Nimic în plus.

**Tester:**
- X1–X6, X4b și X4c: pot pica pe codul greșit? Valorile vin din calcule de mână (verifică prin sondaj X1, X3, X4c)?
- `runPinned` și `afrrIntegralMW = ±1e6`: e legitim să setezi starea internă direct în teste sau creează teste fragile?
- Mutarea scenariilor în `helpers.ts` a schimbat vreo valoare veche?

## Format
Verdict; blocante; neblocante; cine repară și ce. Nu modifici nimic.
