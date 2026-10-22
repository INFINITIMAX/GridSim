# S4 tester, raport

Fișier modificat: `tests/2d/hydro.test.ts` (nimic din `2d/`). Nu am rulat nimic; valorile sunt calculate de mână din formulele briefului.

Constante: toGrid = 0,95·0,99 = 0,9405; termenul Rm = -0,0305 + 0,005·4,5 = -0,008; Qd=2: d=0,638476, 1-0,789·d^-0,2 = 0,136923; Qd=3,5: d=0,83195, factor 0,181425.

## Puncte de eficiență (turbineEfficiency / peakEfficiency)

| Caz | Calcul | Rezultat |
|---|---|---|
| Kaplan h=5, Qd=2 | nq=357,77; enq=0,07196; ed=0,16696·0,136923=0,02286; ep=0,905-0,07196+0,02286-0,008 | ep=0,8479, Qp=1,5 |
| Kaplan Q=Qp | eq=ep | 0,8479 (= peakEfficiency) |
| Kaplan Q=Qd=2 | x=-1/3, 1-3,5·(1/3)^6=0,995199 | 0,84384 |
| Kaplan Q=0,4 | x=0,73333, x^6=0,155528, 1-3,5·x^6=0,455652 | 0,38635 (<0,5) |
| Francis h=11,6, Qd=2 | nq=176,159; enq=0,22031; ed=0,04126; ep=0,919-0,22031+0,04126-0,008; Qp=1,3·nq^0,05=1,3·1,295075 | ep=0,73195, Qp=1,6836 |
| Francis Q=Qp | eq=ep | 0,73195 (= peakEfficiency) |
| Francis Q=1,5 | (0,109051)^0,504907=0,326655; 1-1,25·0,326655=0,591681 | 0,43307 |
| Francis Q=1,8 | er-ramură: ((1,8-1,6836)/0,3164)²=0,13535; ep-er=0,04171 | 0,72630 |
| Francis Q=Qd | raport=1 deci eq=er=(1-0,0072·7,91336)·ep=0,943024·ep | 0,69024 |
| Crossflow Q=Qd | x=0 | 0,79 |
| Crossflow Q=0,3 | x=0,85; 0,85^14=0,10277; 0,79-0,1275-0,14079 | 0,52171 |
| Francis h=3, Qd=1, Q=0,9 și Q=1 | ep=-0,2686 (negativ); er=-0,2485 | exact 0 |
| Kaplan Q=0 | 1-3,5=-2,5·ep<0 | exact 0 |

## Cazurile de mână A–I (S3 recalculate)

| Caz | Calcul | kw (rețea) | Schimbat față de S3 |
|---|---|---|---|
| A | Q=Qd=2, eta=0,843838; turbină 9,81·2·5·0,843838=82,78; ·0,9405 | 77,855 | kw (era 88,29) |
| B | idem A, eco 0,3 nu schimbă Q | 77,855 | kw |
| C | Francis h=11,6, Q=Qd: eta=er=0,690243; turbină 9,81·2·11,6·0,690243=157,09; ·0,9405 | 147,747 | kw (era 204,67); installedKW la fel |
| D, E, G | opriri, neschimbate | 0 | nu |
| F | net 4,7, eta tot 0,843838 (depinde de ratedHead=5, nu de grătar); 9,81·2·4,7·0,843838=77,81; ·0,9405 | 73,184 | kw (era 82,99) |
| H | Crossflow Q=0,35, x=0,825, 0,825^14=0,067664; eta=0,79-0,12375-0,0927=0,57355; turbină 9,846; ·0,9405 | 9,261 | kw (era 12,99) |
| I | k=1: Q=2, turbină 157,09. k=2: Q=1,5 fiecare, eta=0,433069, turbină 9,81·3·11,6·0,433069=147,85. 157,09 > 147,85 | 147,747 | running 2->1, used 3->2, spilled 0->1, kw |

Alte recalculări:
- annual ianuarie cu curățitor (net 4,985, eta(1,8)=0,847719): turbină 74,62 kW, rețea 70,18 kW, ·744/1000 = 52,214 MWh (era 58,85).
- annual ianuarie fără curățitor (net 4,85): turbină 72,60, rețea 68,28 kW, = 50,800 MWh (era 57,26).
- powerCurve Kaplan large la 12 (Q=Qd=3,5): ep=0,85533, eta=0,851233; turbină 146,135; rețea 137,44 kW (era 154,51).

## Teste noi și ce le-ar face să cadă
- `A: randamentul raportat`: schimbarea formulei Kaplan, a Rm sau a ratedHead.
- Lanț de puteri (`turbineKW`, `powerKW = turbineKW·0,95·0,99`, `energyPerDayMWh` din rețea, `turbineKW=0` la head și low-flow): omiterea generatorului/transformatorului, `powerKW` egal cu turbineKW, `turbineKW` neresetat la oprire, energie calculată din turbină.
- Kaplan (3 puncte + peak): coeficienți greșiți (3,5, exponentul 6, 0,75), curbă prea optimistă la 20% (testul `<0,5`), Qp greșit în peakEfficiency.
- Francis (4 puncte, vârf la Qp, peak): ramura Q>Qp fără er, exponent 3,94-0,0195nq, Qp cu nq^0,05.
- Crossflow (Qd, 0,3, independent de cădere): exponent 14, coeficienți 0,15/1,37, folosirea căderii.
- Limitarea la 0: eliminarea `Math.max(eq,0)` dă negativ și cade (Francis h=3, Kaplan Q=0).
- Caz I: dispatch care nu compară `powerKW` sau care preferă mai multe turbine.

## Proprietățile S3 (1-7 și restul)
Toate păstrate neschimbate; am verificat matematic că rămân adevărate:
- 1 (conservarea apei), 7 (limite cădere), 3 (ordinea opririlor): independente de randament.
- 2 (turbină în plus): candidații pentru count+1 sunt superset (flowPerTurbine depinde doar de k), deci max nu scade.
- 4 (baraj mai înalt): Kaplan ep = 0,897 - enq·(1-fd) + 0,095·fd scade cu enq, enq scade când h crește, deci eta crește cu h; Crossflow nu depinde de h; Francis rulează doar la h=11,6. Puterea = Q·H·eta crește.
- 5 (grătar): eta nu depinde de clog, net scade.
- 6 (prag pornire): verificat eta>0 la minLoad+0,01 pentru toate: Kaplan 0,21Qd -> factor 0,51; Crossflow 0,16Qd -> 0,545; Francis 0,41Qd la h=11,6 -> factor 0,108·ep, pozitiv.
- capacityFactor în [0,1]: Q·eta(Q) crește cu Q până la Qd, deci media lunară nu depășește installedKW.

## Neacoperit
- `panel.ts` (text „% peak here”, „–”): UI, fără infrastructură DOM în teste.
- Kaplan/Francis la alte mărimi decât Qd=2 în `turbineEfficiency` (doar powerCurve folosește Qd=3,5).

## Suspiciune de bug (formula RETScreen, nu o abatere a coder-ului față de brief)
Briefului i se cerea „Francis la cădere foarte mică și debit mic dă exact 0”. Nu e fezabil pentru Q ≤ Qp: la h=3, 3,94-0,0195·nq = 3,94-6,755 = -2,815 (exponent negativ). Atunci ((Qp-Q)/Qp)^(-2,815) este >1, 1-1,25·(>1) este negativ, iar înmulțit cu ep negativ (-0,2686) dă un randament POZITIV fals. Exemplu aproximativ h=3, Qd=1, Q=0,1: ~0,20 (la Q aproape de Qp tinde la infinit). Deci Math.max nu ajută, iar `turbineEfficiency` poate da randamente absurde (chiar >1) pentru Francis la h mic. Practic nu se atinge în joc (Francis e permis doar la gross ≥ 10, deci ratedHead ≥ 11,6 în setup-urile reale; la h=11,6 exponentul e 0,505 și ep>0). Am testat 0 doar pe ramura Q>Qp (Q=0,9 și Q=1) și am notat limitarea în comentariu. Recomandare planner: eventual gardă în cod (de ex. ep ≤ 0 -> 0), decizie a planner-ului.

Atenție la test: `turbineEfficiency(francis, 3, 1, 0.9)`: Qp exact = 0,870749, deci 0,9 e sigur peste Qp.

## Comanda
`npx tsc --noEmit; npx vitest run tests/2d/hydro.test.ts`
