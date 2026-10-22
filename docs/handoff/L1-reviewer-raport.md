# L1 · reviewer — raport (transcris de planner, integral)

## Verdictul reviewer-ului

# Verdict L1 · reviewer — ACCEPTAT (cu probleme neblocante)

Am citit: `L1-reviewer.md`, rapoartele coder și tester, tot `learn/` (`lessons.ts`, `ui.ts`, `main.ts`, `toon.ts`, `sim/*`, `scenes/plant.ts`, `scenes/intake.ts`, `index.html`, `style.css` doar pe grep) și toate cele 4 fișiere din `tests/learn/`. Am verificat tabelele de afirmații din `lectia-01/02/03.md` și contractul DOM din `plan.md`. Nu am rulat nimic. Rezultatele rulărilor (38 teste, mutația g = 10, cele 3 scripturi verify) sunt luate de la planner.

## Ce am găsit în regulă

- **`learn/sim/`** e pur: fără three și fără DOM. Cele trei fișiere au doar funcțiile cerute: `powerKW`, `zankeVdMmS`, `trapLengthM`, `widthTooLarge`, `PLANT_ORDER`, `isCorrectOrder`.
- **Contractul DOM** e respectat:
  - `index.html` are `#lesson-list`, `#callouts`, `#tabs [data-tab]`, `#sim` și `.credit` cu „Learn Arduino" și „Dilum Sanjaya".
  - `ui.ts` are inputurile `head|flow|eff` și `flow|grain|width`, ieșirile `power`, `vd`, `length`, `warn` și `[data-order]` cu `[data-check]`.
  - `main.ts` are `?lesson=N`, `__learnReady`, `.on` și `.lock`.
- **Afirmații interzise:** A11, A12, B5 și C8 nu apar în UI. Callout-ul „Efficiency" a fost reformulat corect pe B3. Exemplul NRCan (14,7 kW) se potrivește cu B7.
- **Valorile numerice** din `lessons.ts` și din teste se potrivesc cu formulele: 60·0,04·9,81·0,6 = 14,13 kW, 40 L/s la vD 27,9 mm/s și B 0,4 dă 3,58 m, iar B 0,5 dă 2,87 m.
- **Ajustările vizuale ale planner-ului** (`plant.ts`, `intake.ts`, `fit()`, `placeCallouts`): nu am găsit cod mort sau regresii logice la 1440×900. `placeCallouts` cu 1 sau 2 callout-uri se comportă corect, deoarece `half = ceil(n/2)` pune tot în rândul de sus.

## Probleme (toate neblocante)

1. **`learn/lessons.ts:121`** — intrarea „Spillway (outlet sill)" din `L3_PARTS` are `text: ""` și `claims: []`. În tab-ul Parts apare un rând cu titlu și fără text. Coder-ul n-a avut sursă și a lăsat-o goală.
   - Contează pentru că e UI fără conținut și pentru că `lessons.test.ts:55` o exceptează explicit, deci testul nu o prinde.
   - Soluție: scoate intrarea din `L3_PARTS`. Dacă o scoți, poți scoate și `reg("spillway", …)` din `intake.ts:62`, dacă nu mai are rost. Sau adaugă text din `lectia-03.md`, cu ID de afirmație. *(coder / planner)*

2. **`learn/lessons.ts:144`** — Specs L3 „Keep particles larger than 0.2 mm" are `claims: ["C4","C7"]`. C7 spune „la Pelton cele mai expuse sunt acul, duza și cupele", deci nu susține textul. Textul e susținut doar de C4.
   - Soluție: `claims: ["C4"]`. *(coder)*

3. **`learn/lessons.ts:136`** — „Sand is the turbine's worst enemy" are claim C6, care spune doar că sedimentele uzează echipamentul. „Worst enemy" depășește sursa.
   - Soluție: de exemplu „Sand that gets through wears the equipment". *(coder)*

4. **`learn/lessons.ts:95`** — „Head is free, flow varies over the year" are claim B6, care spune doar că „căderea e aproape constantă". „Free" nu e susținut.
   - Soluție: „Head is almost constant, flow varies over the year". *(coder)*

5. **`learn/lessons.ts:130`** — intro-ul L3 spune „can be a trickle one month and a torrent the next". Variația debitului pe an e B6, nu C1/C3/C4. Restul intro-ului (L1: A6, A8, A10; L3: C1, C3, C4) e susținut de ID-urile alese.
   - Soluție: adaugă B6 în `claims`, dar B6 trebuie atunci să existe în tabelul lecției 3, ceea ce nu e cazul. Mai simplu: scoate propoziția despre „trickle/torrent". *(coder)*

6. **`learn/scenes/plant.ts:256-296` + `learn/main.ts:180-206`** — bug de stare: `selectLesson` nu oprește animația „Run" care rulează. Scenariu: pornești Run în L1, treci la L2 sau L3 și te întorci în L1 înainte să se termine (~10 s).
   - `runDrop` iese imediat din cauza lui `if (run.on) return`, iar butonul Run nou a fost deja pus pe `disabled = true`.
   - Vechiul `onDone` re-activează un buton detașat din DOM, așa că butonul nou rămâne blocat până la următoarea selecție de lecție.
   - Soluție: în `selectLesson` oprește animația (de exemplu un `stop()` în `PlantScene` care pune `run.on=false`, ascunde picătura și apelează `highlight(null)`). *(coder / planner, fiindcă `selectLesson` e cod comun)*

7. **`learn/ui.ts:222-261` (`placeCallouts`)** — la ferestre înguste (sub ~1100 px lățime) `perRow` scade la 1 și surplusul merge pe laterale. Callout-urile laterale nu au verificare de coliziune între ele: două cutii pe aceeași latură cu ancore apropiate se suprapun. Clamp-ul `Math.min(…, area.bottomLeft - b.h)` poate duce cutia deasupra rândului de sus. `bottomLeft` e aplicat și laturii drepte, deși numele sugerează doar coloana stângă. La 1440 și 1280 totul e în regulă.
   - Soluție minimă: stivuiește cutiile laterale (y ≥ precedenta + h + GAP). Sau acceptă limitarea și notează-o în raport. *(planner)*

8. **`learn/main.ts:126-129`** — banda de 118 px e un număr fix, nu înălțimea măsurată a callout-urilor. Un text mai lung sau fonturile de rezervă pot depăși 118 px și acoperă obiectul. Pe ferestre scunde (sub ~330 px) `bottom - top` devine negativ și `scale` iese negativ.
   - Soluție: `band = max(măsurat, 0)` și `Math.max(…, 1)` pe diferența din `scale`. Prioritate mică. *(planner)*

9. **`learn/scenes/intake.ts:93-111`** — animația nu reacționează la „Grain size": `u` și `z` ale grăuntelui nu se re-aleg la reciclare, deci același grăunte repetă aceeași traiectorie. Coder-ul a raportat limitarea (diametrul nu schimbă animația). Slider-ul `grain` modifică doar cifrele, iar scena nu arată nimic.
   - E o limită cunoscută, nu o eroare. Decizie de produs pentru planner. *(planner)*

10. **`learn/main.ts:90-105`** — `getPlant`/`getIntake` sunt „leneșe" doar cosmetic, fiindcă `selectLesson` le cheamă pe ambele la prima selecție. Nu strică nimic, dar abstracția nu face ce sugerează. Se poate lăsa. *(coder)*

## Teste (tester)

**Ce e bun:**
- Valorile de mână sunt independente de cod.
- Controlul Ruby & Zanke e implementat în test, cu constante proprii (10,36 și 1,049), nu copiat din `settling.ts`. Cu tolerața de ±10% (diferența reală ~6,5–6,8%) prinde o constantă Zanke complet greșită. Ancora strânsă pe 27,9 ±0,5% rămâne în testul separat.
- Cele 21 de swap-uri din `order.test.ts` prind variantele de comparație „doar prefix" sau „ignoră poziția".
- Testul de integritate are control propriu: `lessons.test.ts:62-64` verifică că rândul A11 chiar conține „de găsit". Detecția nu e oarbă.
- Un ID „de găsit" folosit în UI e prins în două feluri: A11, A12 și C8 prin rândul din tabel (`lessons.test.ts:73`), iar B5 prin lista explicită `BANNED`. Prin regex, `A1` nu se potrivește cu `A10`/`A11`, pentru că potrivirea cere `\s*\|` după ID.
- Mutația g = 10 pică în 3 teste, confirmat de planner.

**Probleme:**

11. **`tests/learn/lessons.test.ts:66-75`** — testul verifică doar că ID-ul există și nu e „de găsit", nu că ID-ul susține textul. Aceeași limită o spune tester-ul în raport.
    - Din cauza ei au trecut nedetectate problemele 2–5 de mai sus, în special C7 la 0,2 mm.
    - E o limită inerentă: textele sunt în engleză, md-ul e în română. Nu cer test automat. O mică hartă `ID → cuvinte-cheie` ar fi artificială.
    - Soluție realistă: ține verificarea manuală la review, cum am făcut aici. *(tester / neblocant, de acceptat)*

12. **`tests/learn/lessons.test.ts:55`** — excepția `f.text.trim() !== ""` ascunde exact intrarea goală „Spillway" (problema 1). Dacă ea e scoasă, excepția devine inutilă și poate fi eliminată. Atunci orice intrare cu text gol ar trebui să pice. *(tester, după rezolvarea problemei 1)*

13. **`tests/learn/order.test.ts:9-11` vs `13-15`** — oarecare suprapunere: dacă `PLANT_ORDER` e egal cu `CORRECT` (primul test), „ordinea corectă trece" (al doilea) e aproape implicat. Cazurile de eroare (lungime, necunoscut, duplicat) rămân distincte. Redundanță minoră, nu o scoate. *(tester / neblocant)*

14. **Neacoperit: `placeCallouts` și verdictul „k of 7"** — logica de așezare rescrisă de planner nu are teste. Folosește `offsetWidth`/`offsetHeight` și un `svg`, deci are nevoie de stub-uri, fiindcă mediul de test e node. Merită o coloană de cutii artificiale `{w,h}` ca să se verifice lipsa suprapunerilor la 1–2 callout-uri și la 5. Verdictul „k of 7" din `ui.ts:416-422` nu e acoperit de teste. *(tester / planner)*

15. **`tests/learn/power.test.ts:9-10`** — mutația g = 9,8 (în loc de 9,81) supraviețuiește (diferență 0,1% față de ±0,5%). Tester-ul a notat singur asta. Consistent cu formula folosită, deci nu cer schimbare.

## Concluzie pentru planner

Nu e nimic blocant. Codul respectă task-ul, contractul DOM și sim-urile pure, iar ajustările tale vizuale nu introduc cod inutil sau regresii la rezoluția țintă. Testele sunt reale, nu trec tautologic, iar controlul Ruby & Zanke e independent.

Recomandat înainte de închidere:
- problema 1, ca pagina să nu afișeze un rând gol;
- problemele 2–5, fiecare e o schimbare de 1–2 linii în `lessons.ts`;
- problema 6, un bug real de stare.

Problemele 7–8 depind de cât de mult îți pasă de ferestre înguste. Problemele 9–10 și 13–15 sunt lăsate la discreția ta.

---

## Deciziile planner-ului (22-10-2026)

Rezolvate direct de planner (schimbări de 1–3 linii fiecare, sub pragul fluxului):
- **1:** intrarea „Spillway" scoasă din `L3_PARTS`. Geometria pragului de ieșire rămâne în scenă; e o piesă reală, doar fără callout.
- **2:** `claims: ["C4"]`.
- **3:** „Sand that gets through wears the equipment".
- **4:** „Head is almost constant, flow varies over the year".
- **5:** propoziția „trickle/torrent" scoasă din intro-ul L3.
- **6:** `PlantScene.stopDrop()` adăugat și apelat în `selectLesson`.
- **12:** excepția pentru text gol scoasă din `lessons.test.ts`. Edit de o linie în fișierul tester-ului, făcut de planner.

Rezultate după corecturi:
- `npx vitest run`: 13 fișiere, 286 de teste trec, inclusiv cele 38 din `tests/learn`.
- Typecheck: trece.
- `verify-learn-build`: trece.
- `verify-learn-page`: trece în 4 din 5 rulări consecutive. Rularea care a crăpat a venit imediat după un `vite build`; de urmărit ca posibilă instabilitate.

Amânate, notate ca limitări cunoscute:
- **7–8:** ferestre sub ~1100 px lățime sau sub ~330 px înălțime. Ținta acum e desktop 1280–1920.
- **9:** animația de nisip nu reacționează la diametrul grăuntelui. Intră la iterația vizuală a lecției 3, împreună cu cazul „bazin prea scurt".
- **10, 13, 15:** lăsate.
- **14:** teste pentru `placeCallouts`, la următorul task de UI.
