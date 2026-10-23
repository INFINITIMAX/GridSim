# L3 · reviewer · verdict (transcris integral de planner)

## Verdict: ACCEPTAT

Nu am găsit probleme blocante. Am doar observații neblocante, mai jos. Nu am rulat nimic (n-am unelte). Rezultatele rulărilor sunt cele raportate de planner.

## 1. Coder (cod)

**Formule față de documente (verificate linie cu linie):**
- `learn/sim/bucket.ts:13-18`: φ = (180 − θ)·π/180, ηh = 2(1−r)r(1+k·cos φ). Corect.
- `learn/sim/bucket.ts:21-26`: v₂ = hypot(u − w·cos φ, w·sin φ), cu w = k(v₁−u). Corect. La r = 1 dă v₂ = v₁, deci `setExit(v2/v1)` nu depășește 1.
- `learn/sim/bucket.ts:29-31`: ½ρQv₁², cu Q din L/s convertit în m³/s. Corect.
- `learn/sim/efficiency.ts:20`: `1 - (1.31 + 0.025*j) * pow(|(qp-q)/qp|, 5.6 + 0.4*j)`. Coeficientul **înmulțește** puterea, deci corect. Vârful 0,89 pentru j = 1 și 0,90 pentru j ≥ 2, iar Qp = 0,662 + 0,001j. Corect. Puterea la ax trece prin `powerKW` (`ui.ts:767`), nu printr-o funcție nouă.
- `learn/sim/specific.ts:36`: (rpm/60)·√Q / (9,81·H)^0,75. Corect.
- `learn/sim/specific.ts:41`: 0,68·√H / (rpm/60). Corect.
- `learn/sim/specific.ts:18-22` și `45-50`: benzile și domeniile de cădere corespund tabelului din `lectia-09.md`. Limitele sunt inclusive (`>=` și `<=`). Ordinea e pelton, francis, kaplan. Banda Pelton se înmulțește cu √j doar pe n_QE, nu pe cădere (corect).

**Texte (`learn/lessons.ts`):**
- Cele 15 callout-uri din L7–L9 sunt verbatim din tabelele documentelor. ID-urile de afirmații sunt cele din coloana „Afirmații”.
- G8 apare doar în intro-ul L7 (`:292`) și în pasul „As fast as the jet” (`:304`). Formularea e „no push at all” și „power drops to zero”, fără 1,8–1,9 și fără ambalare.
- G9 și I7 nu apar nicăieri. `UNLOCKED = 9`. `SceneId` și `SimId` sunt extinse corect.

**Cod în plus declarat de coder:**
- `RunnerScene.setLesson(n)` (`runner.ts:233`): justificat. Ancorele, `extent` și `target` diferă între L7 și L8. Pattern identic cu `PenstockScene.setLesson`.
- Două săgeți de ieșire într-un singur obiect `exit`: justificat. Fizic ies două jumătăți de jet, iar ID-ul `exit` rămâne unul.
- Cupa decupată mărită, separată de rotor: justificat de brief (secțiune decupată cu muchie vizibilă) și de scara scenei.
- `BANDS` exportat: **nejustificat**, vezi N1. `bandFor` exportat: justificat, îl folosește `chart.ts:110`.

**`main.ts`:**
- Lecțiile 1–6 nu sunt afectate. Scenele noi sunt lazy ca restul. Ordinea e corectă: `getRunner()` creează scena, apoi `runnerScene?.setLesson(n)`.
- `runnerScene?.stopSpin()` se apelează la fiecare schimbare de lecție, înainte de `mountSim`. Animația rotorului se oprește deci la schimbare, iar `setSpin` repornește la intrarea în L7.
- `setJets` rutează corect spre `chart` (L9) sau `runner` (L8) după `l.scene`.

**Contractul DOM din `plan.md:118-120`:**
- L7: `input[name=ratio|angle]` și `data-out=u|eta|power|exit`.
- L8: `input[name=flow]`, `select[name=jets]` 1–6, `data-out=eta|peak|power` și `svg[data-curve]` cu `[data-dot]`.
- L9: `input[type=number][name=head|flow]`, `select[name=speed]`, `select[name=jets]` 1–4 și `data-out=nqe|d1|verdict`, cu `d1` gol când Pelton nu se potrivește.
- Toate sunt respectate (`ui.ts:695-845`).

**Cazuri limită ale L9:**
- Câmp gol: `Number("")` = 0, apoi clamp la 2 / 10.
- Valori peste interval: clamp.
- Pelton care nu se potrivește: `setRunner(null)` ascunde rotorul.

## 2. Planner: schimbarea „n_QE” → „nQE” și „(gH)^¾” → „(gH)^0.75”

Acceptată. Am verificat ocurențele rămase în `lessons.ts:368,374,381-383`, `ui.ts:810` și `chart.ts:93`.
- Schimbarea e doar de notație. Semantica și ID-urile de afirmații sunt neschimbate.
- „nQE” este notația din ESHA însăși.
- Rândurile Overview nu sunt în tabelele de callout-uri verbatim, deci nu cad sub testul verbatim.
- Comentariile din `specific.ts` păstrează „n_QE”. Sunt doar comentarii, deci e fără efect.
- Planner-ul spune că a rulat din nou `verify-learn-page` după schimbare. Nu pot confirma eu rularea.

## 3. Tester

**Se rup la schimbări reale de cod:**
- Valorile așteptate din `bucket.test.ts` vin din `lectia-07.md`: 0,7372, 0,983, 17,09, 4,35, 23,29, 22,89. Controlul energetic ηh = 1 − v₂²/v₁² în 6 puncte și controlul extern S7 ex. 1 sunt independente de implementare.
- `efficiency.test.ts` ia tabelul din `lectia-08.md` și cele două controale externe.
- `specific.test.ts` ia tabelul din `lectia-09.md`, controalele ESHA și limitele inclusive (cu `nqe` dat direct, deci fără erori de virgulă mobilă).
- Mutațiile raportate de planner (φ = θ, coeficient sub putere, H^0,75) sunt prinse (9, 16 și 8 teste picate).

**Plasa pentru G8 și 1,8–1,9:**
- `PARTIAL = ["G8"]` scutește G8 doar de verificarea „nu e de găsit”, și doar pentru G8. Testul de control (`lessons.test.ts:86`) confirmă că rândul G8 conține „de găsit”.
- Regex-ul `/1[.,]8/` și `/1[.,]9/` (`:106-110`) prinde „1,8”, „1.85”, „1,9” în `intro` și în toate `facts` ale L7.
- Nu are fals pozitiv pe textele actuale (0.43–0.48, 98.3 %, cos 15°).
- Pot rămâne nedetectate formulări fără cifre („almost twice”). Asta nu e valoarea de ambalare, deci nu contează.
- Nu acoperă textele din `ui.ts` (notele simulatorului). Acolo nu apare 1,8–1,9, dar nici testul nu le citește.

**Integritatea G9 și I7:**
- G9 și I7 sunt în `BANDS` (`:20`), iar `:101-104` pică dacă apar în orice intro sau fact.
- Controalele de la `:81-84` garantează că rândurile lor există și sunt „de găsit”. Verificarea are deci valoare.

### Observații neblocante

**N1. `learn/sim/specific.ts:18` (owner: coder).** `BANDS` este `export`, dar nu e importat nicăieri. Singurul consumator extern e `bandFor` (`chart.ts`). Același lucru pentru `TurbineBand` (`:10`), dacă nu e folosit. Recomandare: scoate `export` de pe `BANDS`. Fără impact funcțional.

**N2. `tests/learn/efficiency.test.ts:63-66` (owner: tester).**
- Testul „simetrică în jurul lui Qp” nu prinde lipsa lui `Math.abs`, contrar afirmației din raportul tester-ului („Mutații: lipsa valorii absolute”).
- La j = 1 exponentul e 6 (par), deci (qp−q)⁶ este simetric și fără `abs`. Restul testelor la j ≥ 2 folosesc doar q < qp (0,5 și 0,2), unde baza e pozitivă.
- Deci o ștergere a lui `Math.abs` din `efficiency.ts:20` poate trece nedetectată. Efectul real: la j ≥ 2 și q > Qp, baza negativă ridicată la exponent fracționar dă NaN în UI.
- De adăugat: un test cu j = 2 (sau 3) la q = 1,0 și valoare finită, de exemplu `expect(Number.isFinite(turbineEfficiency(1, 2))).toBe(true)` plus valoarea calculată din formulă. Nu e blocant: planner-ul a rulat `verify-learn-page` cu valori de Francis/Kaplan și L8, dar nu avem garanția pentru q = 1 la j ≥ 2.

**N3. `tests/learn/efficiency.test.ts:53-55` și `:73-77` (owner: tester).**
- `:53-55` (relativ > 0,8 la q = 0,2) este redundant cu rândul `[0.2, 0.8452]` de la `:44-48`. Rămâne util doar ca mesaj explicit pentru greșeala „coeficient ridicat la putere”.
- `:73-77` (turbineEfficiency = relativ × vârf) repetă implementarea. E acoperit și de tabelul de la `:28-40`. Ambele sunt inofensive, doar redundante.

**N4. `tests/learn/lessons.test.ts:54,90,112` (owner: tester).** `it.each(ALL)` și `it.each([6,7,8])` cu `%i` afișează indicele (0-based), nu numărul lecției. Pentru L7–L9 apar ca „lecția 6/7/8”. Pe cod nu are efect, dar la un test picat mesajul induce în eroare. Recomandare: `it.each(...)` pe `l.n` sau titlul din `$n`.

**N5. `tests/learn/specific.test.ts` (owner: tester).**
- Cazul j = 3 la 1500 rpm (0,04337 vs 0,0433) nu e testat.
- Raportul tester-ului scrie „cum cere documentul”, dar `lectia-09.md:89` spune „de evitat în teste”, deci omisiunea e corectă. Corecția e doar în formularea din raport.
- Nu e testat nici `√j` pentru j non-pătrat perfect în afară de j = 2 (testul de la `:77`). Acoperire suficientă.

**N6. `learn/scenes/chart.ts:155,163` (owner: coder).** `setPoint(59, 0.0217)` și `setRunner(0.42)` sunt apeluri inițiale redundante, pentru că `mountSpecific` le apelează oricum la `reset()`. Valorile sunt hardcodate și duplicate din UI. Sunt inofensive și ajută dacă scena e creată înainte de `mountSim`. Nu cer schimbare.

## Concluzie
- Formulele corespund documentelor, inclusiv φ = 180° − θ, coeficientul RETScreen care înmulțește puterea, rpm/60 și limitele inclusive.
- Textele vin din documente, iar G8 e folosit corect, fără G9 sau I7.
- Contractul DOM e respectat și lecțiile 1–6 nu sunt afectate.
- Schimbarea de notație a planner-ului este acceptabilă.
- Testele au valoare reală. Cel mai important gol e N2 (lipsa lui `Math.abs` ar rămâne nedetectată). Recomand să fie trimis tester-ului ca ajustare mică, fără a bloca livrarea.

## Fișiere citite
- `D:\GridSim\docs\handoff\L3-reviewer.md`
- `D:\GridSim\docs\handoff\L3-coder.md`
- `D:\GridSim\docs\handoff\L3-coder-raport.md`
- `D:\GridSim\docs\handoff\L3-tester-raport.md`
- `D:\GridSim\docs\learn\pelton\lectia-07.md`
- `D:\GridSim\docs\learn\pelton\lectia-08.md`
- `D:\GridSim\docs\learn\pelton\lectia-09.md`
- `D:\GridSim\docs\learn\pelton\plan.md` (căutare țintită, liniile 45-121)
- `D:\GridSim\learn\sim\bucket.ts`
- `D:\GridSim\learn\sim\efficiency.ts`
- `D:\GridSim\learn\sim\specific.ts`
- `D:\GridSim\learn\lessons.ts`
- `D:\GridSim\learn\main.ts`
- `D:\GridSim\learn\ui.ts` (liniile 1-80, 280-420 și 640-846)
- `D:\GridSim\learn\scenes\runner.ts`
- `D:\GridSim\learn\scenes\chart.ts`
- `D:\GridSim\learn\style.css` (căutare țintită)
- `D:\GridSim\learn\scenes\nozzle.ts` (căutare țintită, doar `export function stream`)
- `D:\GridSim\tests\learn\bucket.test.ts`
- `D:\GridSim\tests\learn\efficiency.test.ts`
- `D:\GridSim\tests\learn\specific.test.ts`
- `D:\GridSim\tests\learn\lessons.test.ts`

---

## Decizia planner-ului (23-10-2026)

- **Verdict acceptat.** Nu retrimit nimic la coder sau la tester.
- **N2 rezolvat direct de planner** (sub 10 linii, deci în afara fluxului): un test nou în `efficiency.test.ts`, cu j = 2 și q = 1,0, pe valoarea de mână 0,88435. Verificat cu mutația „fără `Math.abs`”: testul pică (1 test picat). Apoi fișierul e restaurat și trec 188/188.
- **N1 rezolvat direct:** `BANDS` nu mai e exportat. `TurbineBand` rămâne exportat, pentru că e tipul de retur al lui `bandFor`, exportat și el.
- **N3–N6 rămân deocamdată.** Sunt redundanțe și mesaje de test; nu schimbă ce vede sau ce învață utilizatorul.
- **Următorul pas:** gate-ul M6, aprobarea lui Lucian pe lecțiile 7–9.
