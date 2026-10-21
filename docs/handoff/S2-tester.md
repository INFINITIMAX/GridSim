# S2: brief pentru tester. Testele pentru fizica hidrocentralei

## Context

Coder-ul a livrat `2d/hydro.ts` conform `docs/handoff/S2-coder.md` secțiunea 1 (ATENȚIE: regula `running` = k care maximizează puterea, corectată de planner). Raportul lui: `docs/handoff/S2-coder-raport.md`. Citește brief-ul, raportul și `2d/hydro.ts`.

## Ce livrezi

Fișierul `tests/2d/hydro.test.ts` (Vitest). Planner-ul a adăugat `tests/2d/**` în `vitest.config.ts`.

Testele verifică **regulile din brief, nu implementarea**. Valorile așteptate vin din calculele de mai jos, făcute de mână independent. Nu le copia din cod.

### Cazuri de mână (H = 5 m, toleranță 0,5%)

| Setup | Debit | running | per turbină | folosit | deversat | η | P (kW) |
|---|---|---|---|---|---|---|---|
| medium ×1 | 3 | 1 | 2 | 2 | 1 | 0,85 | 83,39 |
| medium ×2 | 3 | 2 | 1,5 | 3 | 0 | 0,83672 | 123,12 |
| small ×4 | 0,8 | 1 | 0,8 | 0,8 | 0 | 0,792 | 31,08 |
| small ×1 | 0,2 | 0 | 0 | 0 | 0,2 | 0 | 0 |
| large ×4 | 9 | 3 | 3 | 9 | 0 | 0,87551 | 386,49 |
| medium ×2 | 2 | 1 | 2 | 2 | 0 | 0,85 | 83,39 |

Recalculează independent fiecare rând; dacă obții altceva, folosește valoarea ta și notează divergența în raport.

### Proprietăți

1. **Conservarea apei:** usedFlow + spilledFlow = riverFlow, pentru o grilă de setup-uri și debite.
2. **Limita de putere:** powerKW ≤ maxPowerKW întotdeauna. La debit mare, cu toate turbinele la load 1, powerKW = maxPowerKW.
3. **O turbină în plus nu scade niciodată puterea**, la același tip și același debit. Verifică pe grilă; dacă găsești un contraexemplu real, raportează-l, nu-l ascunde.
4. **Pragul de pornire:** la 0,29 · designFlow, o singură turbină nu pornește; la 0,31 · designFlow pornește.
5. **Intrări în afara limitelor:** count 0 se comportă ca 1, count 9 ca 4, debitul −1 ca 0.
6. **`powerCurve`:**
   - are `steps + 1` puncte, de la 0 la maxFlow;
   - e nedescrescătoare pentru o singură turbină;
   - ultimul punct, pentru large ×1 la 12 m³/s, are puterea egală cu maxPowerKW.
7. **energyPerDayMWh** = powerKW · 24 / 1000.

## Constrângeri

- **Fiecare test trebuie să poată pica.** Pentru fiecare, gândește-te ce bug l-ar face să pice. Fără aserțiuni care trec indiferent de cod.
- Fără teste redundante: un caz de mână nu se repetă și ca proprietate.
- Nu modifici `2d/` și nici alt cod de producție. Nu rulezi comenzi.
- Raportul îl scrii în `docs/handoff/S2-tester-raport.md`: lista testelor, ce bug prinde fiecare și orice divergență față de brief.
