# S4: raportul reviewer-ului (transcris integral de planner)

VERDICT S4: ACCEPT (cu 3 observații minore, niciuna blocantă)

CE AM VERIFICAT

1. Formule vs Anexa A (appA-p38/39/40.png)
- Kaplan (p39): enq=((nq−170)/700)², ed=(0,095+enq)(1−0,789d^−0,2), ep=(0,905−enq+ed)−0,0305+0,005Rm, Qp=0,75Qd, eq=[1−3,5((Qp−Q)/Qp)^6]·ep. Codul 2d/hydro.ts:69-75 se potrivește literă cu literă.
- Francis (p38): enq=((nq−56)/256)², constanta 0,081, constanta 0,919, Qp=0,65·Qd·nq^0,05, exponentul 3,94−0,0195nq cu factorul 1,25, er=(1−0,0072nq^0,4)·ep, ramura Q>Qp cu pătratul. Codul 2d/hydro.ts:76-89 se potrivește.
- Crossflow (p40): 0,79−0,15x−1,37x^14, cu Qp=Qd. Codul 2d/hydro.ts:90-93 se potrivește.
- Diametrul d=0,46·Qd^0,473: pagina p37 nu e în data/refs. Am verificat în data/refs/retscreen-hydro.txt:1490-1494. Formula e d=kQ·Qd^0,473, cu kQ=0,46 pentru d<1,8 și 0,41 pentru d≥1,8. Codul folosește mereu 0,46. Rotoarele din joc (Qd 1, 2 sau 3,5) dau d≤0,83, deci nu se atinge ramura 0,41. Brief-ul cerea explicit 0,46, deci nu e o abatere a coder-ului.

2. Cod în plus față de brief
- Nimic semnificativ. `toGrid` e o variabilă locală, justificată în raport.
- `peakEfficiency` duplică calculul nq pentru Francis, ceea ce e acceptabil.
- Garda Francis adăugată de planner (`ep <= 0 || 3,94−0,0195nq <= 0` → 0, la linia 83) e corectă. Rezolvă bug-ul semnalat de tester, adică randament pozitiv fals sub ~8,8 m. Pragul 3,94−0,0195nq=0 înseamnă nq≈202, adică h≈8,8 m, deci nu afectează jocul (Francis începe de la 10 m).
- panel.ts:361-363 respectă brief-ul. Afișează „–” dacă butonul e dezactivat, altfel „X% peak here”, calculat cu ratedHead=grossHead−canalLossM și designFlow-ul mărimii curente. Se actualizează în `render()`, prin mecanismul existent, fără UI nou.
- Din `Technology` au dispărut `peakEfficiency` și `partLoad`. Descrierile sunt cele cerute.

3. Lanțul de puteri
- `turbineKW = kW(usedFlow, netHead, efficiency)`.
- `powerKW = turbineKW·toGrid`, cu toGrid=0,95·0,99, aplicat o singură dată.
- `energyPerDayMWh` se calculează din `powerKW`.
- `installedKW = count·kW(Qd, ratedHead, η(Qd))·toGrid`, aplicat o singură dată și independent de grătar.
- Pe ramura de oprire, `turbineKW`=0 și `powerKW`=0.
- `efficiency` se calculează cu ratedHead, deci nu depinde de înfundare. Asta e consecvent cu brief-ul.
- Dispatch-ul compară `powerKW` (grid). Pentru că toGrid e constant, ordinea e aceeași ca pe turbineKW.

4. Calcule de mână refăcute independent (toate corecte la toleranța testului de 0,5%)
- Caz A: Kaplan h=5, Qd=2. nq=357,77, enq=0,07196, 1−0,789d^−0,2=0,1369, ep=0,8479, η(Qd)=0,8479·0,99520=0,84383. Turbină 98,1·0,84383=82,78 kW. Rețea 77,85 kW. Potrivit.
- Crossflow Q=0,3, Qd=2: x=0,85, 0,85^14≈0,1028, η=0,79−0,1275−0,1408=0,5217. Potrivit.
- Francis h=11,6: nq=600/√11,6=176,16, ep≈0,732, iar caz C (147,75 kW) e consecvent cu er=0,943·ep.
- Reimplementarea Python raportată de planner (0 nepotriviri pe 19.440 de cazuri) e un control independent suplimentar.

TESTE: observații minore

a) tests/2d/hydro.test.ts:190-203, blocul „limitarea la 0”. Testele Francis h=3 (Q=0,9 și Q=1) acum trec din cauza gărzii de la linia 83, nu din cauza `Math.max`. Dacă ar fi scos `Math.max(eq,0)`, ele n-ar mai cădea. Raportul testerului susține că ar cădea (afirmația e depășită după garda planner-ului). Doar testul Kaplan Q=0 (linia 200) protejează efectiv `Math.max`. Comentariul de la liniile 191-193 („NU se testează Q<=Qp... formula dă valori pozitive false”) e și el depășit.
   Lipsește un test pentru garda nouă pe ramura Q≤Qp, de exemplu `turbineEfficiency(francis, 3, 1, 0.1)` → exact 0. Acesta e singurul caz care ar cădea dacă garda s-ar șterge. Recomandare, neblocantă: adaugă testul și actualizează comentariul.

b) Redundanță ușoară. „la Qp=1,5: eq=ep” (linia 152) și „peakEfficiency = ... = turbineEfficiency(kaplan,5,2,1.5)” (linii 159-162) verifică aceeași valoare 0,8479. La fel pentru Francis (linii 169 și 180). Nu strică, pentru că al doilea verifică definiția lui `peakEfficiency`.

c) Neacoperit, recunoscut de tester. Textul „% peak here” și „–” din panel.ts nu are test (fără infrastructură DOM). Kaplan/Francis la mărimi diferite de Qd=2 sunt acoperite doar prin powerCurve large Kaplan (linia 388). Pentru UI acceptabil, iar `peakEfficiency` cu alt Qd nu are test direct.

CE E BUN LA TESTE
- Valorile de mână sunt reale și nu copiate din cod. Testele cu valori fixe cad dacă se schimbă un coeficient, exponentul 6 sau 14, Qp, Rm sau ratedHead.
- Lanțul de puteri e testat separat. Testul „powerKW = turbineKW·0,95·0,99” cade dacă generatorul sau transformatorul lipsesc sau se aplică dublu.
- Testul „energyPerDay din rețea” și testele turbineKW=0 la oprire sunt valide.
- Cazul I (dispatch) și proprietățile 1-7 rămân semnificative.

DECIZIE
ACCEPT. Codul respectă Anexa A și brief-ul și nu conține nimic în plus. Testele sunt valide, cu valori de mână corecte. Recomand planner-ului să adauge testul pentru garda Francis la Q≤Qp (observația a) și să corecteze comentariul depășit. Se poate face direct, fără ciclu complet de flux.

---

## Decizia planner-ului

- **Observația a, aplicată direct:**
  - am adăugat testul `turbineEfficiency(francis, 3, 1, 0.1)`, care trebuie să dea exact 0;
  - am corectat comentariul;
  - control negativ: fără gardă, pică exact acest test (1 din 59).
- **Observația b:** rămâne, pentru că al doilea test verifică definiția lui `peakEfficiency`.
- **Observația c:** acceptată. Testele de UI vin odată cu panourile explicative.
- **Starea finală:**
  - `tsc` e curat;
  - trec 223 de teste din 223;
  - auditul Python dă 0 nepotriviri pe 19.440 de cazuri.
