# S3: raportul reviewer-ului (transcris integral de planner)

VERDICT: ACCEPT (nu am găsit nimic care să blocheze; doar observații minore, de ignorat sau de rezolvat ulterior). Nu am rulat nimic, am citit doar codul și testele.

## (1) Coder
Verificat și corect:
- `hydro.ts` respectă brief-ul.
  - Constantele și tabelul de tehnologii coincid cu brief-ul.
  - Ordinea `stopReason` este flood, apoi head, apoi low-flow.
  - `ecoFlow` este limitat la `min(ECO_FLOW, flow)`, deci conservarea apei se păstrează.
  - Alegerea lui k ține cont de egalitate (`> best + 1e-9`).
  - `installedKW` ignoră grătarul și verificarea căderii.
  - `clog` este limitat la [0, 1] și `count` la 1..4.
  - `stepClog` și `annual` sunt conforme.
- Geometria canalului și a clădirii este coerentă.
  - Canalul se întinde de la -0,9 la 3,5 în lungul râului. Clădirea începe exact la 3,5 și este centrată pe axa canalului (across 2,3), deci nu se suprapun.
  - Canalul nu intersectează barajul (across 2,0 până la 2,6, față de 1,4 cât are barajul).
  - `hitBoxes` include clădirea mutată, iar `buildSite` se reface la schimbarea canalului (`applySetup`).
  - Contururile și rotoarele din canalul de fugă sunt consistente.
- Tile-urile inundate se recalculează doar când se schimbă `damHeight` (`builtDam`), iar `floodedTiles` folosește aceeași funcție `isFlooded` ca desenul, deci numărătoarea și harta nu se pot desincroniza.
- `stepClog` se apelează o singură dată pe cadru, nu în buclă, cu `dt` limitat la 0,1 s.
- Redesenarea panoului nu e o problemă de performanță. `setClog` apelează `render()` doar dacă panoul e deschis și procentul rotunjit s-a schimbat. Asta înseamnă cel mult ~100 de redesenări pe parcursul unei înfundări complete, iar cu curățitorul pornit nu se redesenează deloc.
- `noUncheckedIndexedAccess` este respectat peste tot, cu `!` la accesările de tablouri.
- Regulile de design sunt respectate. Căutarea în `2d/` nu a găsit gradient, blur, em dash sau Inter. Comutatoarele sunt butoane cu `aria-pressed`.
- Starea inițială din `START` corespunde brief-ului: dam 5, fără canal, Kaplan medium ×1, fără stavile, scara de pești pornită, curățitor oprit, râu Normal.

Observații minore, nebloccante:
- `panel.ts:162,164` (severitate mică). Opțiunea de tehnologie afișează în plus „N% peak” și „X to Y m of head”, care nu erau în brief. Sunt utile și mici, dar nu au fost cerute.
- `hydro.ts:40,44,50,54,60,64` (mică). `peakEfficiency` și constanta din `efficiencyAt` (0,9 / 0,92 / 0,8) sunt scrise de două ori. Panoul afișează `peakEfficiency`, deci dacă cineva schimbă una dintre ele, textul din panou nu mai e adevărat.
- `main.ts:705` (mică). `technologyById(setup.technology).id` este egal cu `setup.technology`; indirecția nu face nimic.
- `main.ts:176` (mică). Limita `s < damS - house.length/2` pentru lacul inundat se aplică și cu canal, deși atunci clădirea e în aval. E inofensiv și în afara brief-ului, dar numărul de pătrățele inundate nu depinde de canal. E decizia declarată în raportul coder-ului.
- `index.html`: schimbarea textului în „Step 3” nu era cerută. Coder-ul a declarat-o, e banală.
- Hit-test-ul nu acoperă canalul propriu-zis. Brief-ul cere clădirea mutată, iar aceasta e acoperită, deci e conform.
- Dacă utilizatorul dezactivează canalul cu Francis selectat, tehnologia rămâne selectată, dar butonul ei devine dezactivat, iar fraza de stare explică motivul. Brief-ul nu cere comutare automată.

## (2) Tester
Verificat și corect:
- Valorile cazurilor A-I vin din calcul de mână. Am verificat în minte A, C, F, H și I pe formulele din brief și coincid.
- `minLoad` și `designFlow` sunt hardcodate în test, nu importate din cod. Pragul la ±0,01 din proprietatea 6 nu repetă expresia din cod, deci testul poate pica dacă se schimbă pragul sau tehnologia.
- Fiecare test poate pica.
  - Conservarea apei are și aserțiunea `spilled >= 0`, care prinde lipsa clamp-ului pe `eco`.
  - I prinde alegerea k = 1 în loc de k = 2.
  - E și testele de ordine prind inversarea ordinii.
  - Testele pentru `stepClog` și `annual` prind modificarea ratei, a plafonului, a clog-ului mediu și a zilelor din lună.
  - Verificarea `installedKW` la clog 1 prinde includerea grătarului în plăcuță.

Divergența la proprietatea 3: tester-ul are dreptate.
- `flood` cere `flow > 7`. `low-flow` cere `available < qMin`, iar qMin este cel mult 0,4 · 3,5 = 1,4. Cu `available = flow - eco ≥ 6,7` nu pot coexista.
- Perechile testate (flood > head, head > low-flow, fiecare cu contra-test care schimbă un singur parametru) sunt cea mai bună acoperire posibilă. Brief-ul planner-ului era greșit în acest punct.

Observații minore, nebloccante:
- `hydro.test.ts:85` (mică). Rândul F e identificat prin `r.name.startsWith("F")` ca să primească clog 1. E fragil: redenumirea rândului strică testul fără semnal clar. Corect ar fi un câmp `clog` în `Row`.
- `hydro.test.ts:282-285` (mică). Testul „valorile coincid cu operate” e aproape tautologic, pentru că `powerCurve` este doar o buclă peste `operate`. Are totuși valoare: verifică că `clog` este transmis mai departe.
- Neacoperit (mică):
  - Pragul exact `flow = 7` fără stavile. `FLOWS` conține 7 și 7,5, dar nicio aserțiune nu verifică `stopReason` la 7, deci schimbarea `>` în `>=` nu pică niciun test.
  - Clamp-ul `clog` > 1 și < 0 și clamp-ul `count`. Brief-ul spune explicit că `clog` se limitează. Tester-ul a declarat acest gol în raport.
- Redundanță: cazul „dam 8 + canal -> rulează” de la proprietatea 7 se suprapune parțial cu C și I, dar verifică explicit intervalul de cădere. Îl las.
- Notă: testul `capacityFactor ≤ 1` pe grilă nu cade în analiza mea (debitul anual variază și nu atinge plăcuța). Planner-ul a rulat suita și a trecut.

## Fișiere
D:\GridSim\2d\hydro.ts, D:\GridSim\2d\panel.ts, D:\GridSim\2d\main.ts, D:\GridSim\2d\style.css, D:\GridSim\2d\index.html, D:\GridSim\tests\2d\hydro.test.ts

Opțional, pentru un ciclu viitor: un câmp `clog` în rândurile din test, un test pentru `flow = 7` fără stavile și un test de clamp pentru `clog` și `count`.

---

## Decizia planner-ului

**Accept.**

**Corecturi aplicate direct, fiecare sub 30 de linii:**
- **Dublura `peakEfficiency`.** `efficiencyAt` a devenit `partLoad`, adică factorul aplicat peste `peakEfficiency`, iar `operate` calculează η = peakEfficiency · partLoad(L). Randamentul de vârf există acum într-un singur loc. Rezultatul: tsc curat, vitest 200/200.
- **Înainte de review, tot planner-ul:** zona sticky are `top: -16px`, iar etichetele de unitate din grafice nu se mai suprapun.

**Amânate, cu severitate mică:**
- testul pentru `flow = 7`;
- clamp-ul pentru `clog` și `count`;
- câmpul `clog` în rândurile de test.

**Lăsate cum sunt:** detaliile în plus din opțiunile de tehnologie. Ajută utilizatorul să înțeleagă de ce Francis e blocat.

**Lecție pentru brief-uri:** proprietatea 3 cerea o combinație imposibilă. Pe viitor verific fezabilitatea fiecărei proprietăți înainte s-o cer.
