# S5: raport tester

## Fișier creat

`tests/2d/explain.test.ts` (vitest, același stil ca `hydro.test.ts`).

| Bloc | Verifică | Ce îl face să cadă |
|---|---|---|
| cazul din brief | water 3/0/1/2, head 5/0/0/5, turbine (1, 2, designFlow 2, load 1, eta ≈ 0,8438), chain 0,95/0,99, powerKW ≈ 77,85, turbineKW ≈ 82,78, stopReason null | copiere greșită din `op` (ex. `usedFlow` cu `spilledFlow`), `designFlow` luat din alt loc, chain inversat sau 1 − TRANSFORMER_LOSS omis |
| canal + scară + grătar 50% | water 3/0,3/0,7/2; head 9/0,4/0,27/8,33; eta ≈ 0,887; power ≈ 136,4; river negativ devine 0 | canal/rack neimplicate, `river` fără `max(…,0)` |
| oprit | flood (fără stavile, 9 m³/s), head (Francis, baraj 5), low-flow (0,1 m³/s): `stopReason` propagat, power 0, running 0, used 0, spilled 9 | `stopReason` hardcodat null sau pierdut |
| consistență (grila: 3 tehnologii × 3 mărimi × 4 counturi × 3 baraje × canal × stavile × scară × 12 debite × 3 grătare) | used = river − eco − spilled; net = gross − canal − rack; 9,81·used·net·eta·gen·trafo = powerKW la 1e-9 (relativ); powerKW = 0 când e oprit; gardă: >1000 cazuri rulează | orice câmp din `breakdown` care nu mai reproduce puterea afișată; garda împiedică testul să treacă gol |
| SECTION_INFO | 10 chei exacte, text nevid; fish/gates/rack/canal/year au paragraf separat (`\n\n`) „Simplified:”, nu primul; celelalte 5 nu au „Simplified:”; gates conține „7 m³/s” de 2 ori; fish „0.3 m³/s”, „10%”, „107/1996”; rack „6%” (fără 6.000…1) și „3 minutes”; canal „4 m of extra head” și „0.4 m”; fără NaN/undefined | constantă interpolată greșit (ex. 0.30000000000000004, 6.000000000000001), paragraf lipsă, cheie lipsă |

Toate valorile numerice sunt scrise de mână (calculul e în comentariul de la începutul fișierului). Tolerața pentru eta/putere în cazurile de mână: 0,5% relativ, ca în `hydro.test.ts`.

## Neacoperit

- `calcRows` și tot DOM-ul din `panel.ts` (nu e exportat / nu e pur). Formatarea (2 zecimale, „-0.00”) nu are test.
- Cazul „-0.00” semnalat de coder: `used` poate fi −epsilon. Testul de consistență acceptă 1e-9, dar nu verifică semnul.
- Textele de la turbines, dam, river, water, curve sunt verificate doar ca nevide și fără „Simplified:”; conținutul lor nu are numere din constante.

## Suspiciuni de bug

Niciuna în `explain.ts`. Abatere de semnalat din raportul coder-ului (nu de testat aici): exemplul din brief cere `0.00 canal` pe rândul Head fără canal, coderul a urmat regula (omite termenul).

## Rulare

```
npx vitest run tests/2d/explain.test.ts
```

(și `npx tsc --noEmit` pentru tipuri: testul folosește `paragraphs[0]!` și importă `SectionId`.)

Nu am rulat nimic; nu afirm că trec. Atenție: valoarea eta ≈ 0,8871 (cazul 2) e calculată de mână cu ~4 cifre, deci dacă pică marginal pe toleranța de 0,5%, verifică întâi calculul meu, nu codul.
