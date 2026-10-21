# P2b: verdictul reviewer-ului (transcris integral de planner, 21-10-2026)

## Verdict: ACCEPTAT (cu observații neblocante)

Am citit brief-urile, rapoartele, `src/model/grid.ts`, `config.ts`, `tests/model/{helpers,grid.test,protection.test}.ts` și verdictul P2. Nu am rulat nimic. Mă bazez pe rularea planner-ului: 41/41, typecheck, G4 și G5 trecute. Calculele de mână le-am refăcut eu, pe alt drum decât tester-ul.

## Probleme blocante
Niciuna.

## Coder (`src/model/grid.ts`)

**Cele 3 corecturi sunt făcute și nu e nimic în plus.**
1. **Back-calculation aFRR (`:338-342`):** a păstrat logica și a adăugat un comentariu. Comentariul e adevărat. În `updateAfrr`, `delivered` se citește din `u.afrr` înainte de actualizare, deci e valoarea de la pasul anterior, deja redusă de `updateUnit`. Dacă l-ar fi citit după actualizare, ar fi măsurat ținta rampată, nu livrarea reală. Cuvântul „intenționat" e puțin forțat, dar conținutul e corect.
2. **Raportare după clamp (`:374-387`):** `base` = puterea fără reglaj, cu aceleași limite. `k = clamp((p-base)/requested, 0, 1)`; `u.fcr` și `u.afrr` se înmulțesc cu `k`. Corect: clamp-ul de putere și cel pe SOC sunt monotone și 1-Lipschitz, deci livrarea efectivă are semnul cererii și modulul ≤ cererea. `fcrDeployed` și `afrrDeployed` (`refreshDerived`) sunt acum sume de valori livrate.
3. **Baterie la creare (`:164-166`):** `clampBySoc` e extras din `step` și refolosit în `makeUnit` și `updateUnit`. Nu sunt abstracții în plus.

**Windup sau instabilitate nouă:** nu am găsit.
- FCR: starea se rescrie la valoarea livrată, deci nu se acumulează peste headroom. Cu headroom 50 MW, `fcr` converge la 50 și rămâne acolo (la fiecare pas se adaugă ≤ 6,67 MW, apoi `k` readuce valoarea la 50).
- aFRR: bucla de back-calculation vede acum și saturarea de putere sau SOC, ceea ce e un câștig.
- Erorile de virgulă mobilă în `k` sunt neglijabile (~1e-14).

## Neblocante (coder, pentru P4 sau mai târziu)
1. **Reducerea proporțională (`:381-387`) nu respectă prioritatea FCR.**
   - Când o unitate e la limită și are atât `fcr`, cât și `afrr`, ambele se taie cu același `k`.
   - Exemplu: fcr 40 + afrr 60, headroom 50. FCR livrează 20, deși ar fi încăput întreg.
   - Fizic, FCR e reglajul de siguranță și ar trebui să aibă prioritate față de aFRR (cea lentă). Cu semne opuse (fcr+, afrr−), `k` poate zero-a ambele deși netul ar fi livrabil.
   - Nu e bug de stabilitate, doar o abatere de model. Recomand ori prioritate FCR (se taie întâi `afrr`), ori o notă în `docs/calcule.md` că e o simplificare asumată. Decide planner-ul. Coder-ul spune în raport că e alegere proprie, deci e declarat.
2. **`setSetpoint` poate lăsa `setpoint` și `setpointRamped` sub minimul tehnic (`:276` față de `:145-146`). Nu e doar o chestiune de afișare.**
   - Afișarea: `setpoint` raportat poate fi sub `minLoad·pMax`, iar interfața îl va arăta ca atare.
   - Comportament ascuns: `setpointRamped` continuă să coboare sub minim, în timp ce `p` rămâne prins la `lo`. La o cerere ulterioară de urcare apare un timp mort, în care rampa urcă prin zona moartă cât `p` nu se mișcă.
   - Ar trebui rezolvat în P4, înainte de interfață. Coder-ul clamp-uiește `setSetpoint` la aceleași limite ca `makeUnit` (`[min(lo,0), pMax]`) sau stabilește explicit semantica „0 = oprit". Planner-ul decide care.
   - Nu se repară acum: nu e în brief-ul P2b și nu invalidează nimic din testele curente.

## Teste (`tests/model/protection.test.ts`, `helpers.ts`, `grid.test.ts`)

**Calcule de mână verificate prin sondaj, toate corecte:**
- **P5:**
  - La echilibru, I = R + (Tt·ki − kp)·L·e = 30 + 0,02·10 000·0,7 = 170 MW. Pragul de 230 MW (e ≤ 1 Hz) e deasupra lui, iar fără anti-windup integrala ar fi ~1 400 MW. Testul cade dacă back-calculation dispare.
  - Faza 2 separă net cele două cazuri: cu anti-windup f revine la |Δf| < 0,05, fără el rămâne la 50,3 Hz. Alegerea de a nu afirma „vârf ≤ 50,1" e corectă, pentru că vârful e mărginit de R/(D·L) în ambele cazuri.
- **P1:** 550 MW sarcină rămasă (după UFLS 45%) față de 500 MW generare. La 47,5 Hz, 550·0,975 = 536, deci deficit ≈ 36 MW pentru orice f ≥ 47,5. Scăderea e monotonă. Aserțiunea t > 1,0 s e justificată (|ROCOF| ≤ 2,5 Hz/s și 2,5 Hz de parcurs).
- **P2:** ROCOF ≈ 1,995 Hz/s. Primul pas peste 51,5 Hz e pasul 16 (cumulat 1,596 Hz), deci t = 0,80 s, în (0,6; 1,0).
- **P10:** FCR cerut e ~220 MW, tăiat la 50. Vechiul cod ar raporta 200 (cade testul). Negativul (Δf = 0,0909, FCR ≈ 81) apără împotriva unui `k` prea agresiv.
- **P7:** echilibrul 550 + 250·(−Δf−0,01) = 568 + 5,68·Δf dă Δf ≈ −0,08. Precondițiile sunt corecte. Pentru `pLoad` după restore, `refreshDerived` rulează cu `f` vechi, exact ce presupune formula din test.

**P4 (`structuredClone` + `toEqual`):** este un test valid de inerție.
- `toEqual` acoperă toată starea: t, f, rocof, pGen, pLoad, unități, sarcini, shedFraction, log, blackout. Cade dacă `step` aplică vreun eveniment (`addUnit` ar adăuga „late") sau avansează ceva.
- `expect(returned).toBe(state)` fixează și contractul de referință.

**Teste care trec întotdeauna sau redundante:** nu am găsit. Orice P# are o schimbare concretă de cod care îl strică (notate și în raportul tester-ului). P# nu dublează niciun T#. Suprapuneri acceptabile:
- Cele două P3 „no-synchronous" acoperă căi diferite (de la început, față de după `tripUnit`).
- Testele de control (P8 „existing id changes state", negativele P6/P10/P11) apără exact împotriva trecerii triviale.

**Sugestiile mele 1–4 din P2:** toate aplicate corect.
1. T2 „aFRR = 0" eliminat, iar `afrrDeployed === 0` e în T2 principal.
2. A rămas un singur test „fără incident" (T3).
3. `expectWithinPct` în `helpers.ts` arată actual, expected și toleranța la eșec.
4. T3 verifică `shedFraction >= 0.25`. Planner-ul confirmă că trece.

## Neblocante (tester)
1. **Duplicare ușoară de scenarii:**
   - `ceLike()` în `protection.test.ts` reia `ceSystem(0)` din `grid.test.ts`.
   - `island()` e definit separat în ambele fișiere, cu aceleași valori în cazul 50/250.
   - Dacă le muți în `helpers.ts`, se evită derivarea ulterioară a scenariilor. Merită făcut când se mai atinge fișierul, nu acum.
2. **Wrapperul `runUntilBlackout` (`protection.test.ts:27`)** e doar `simulate` cu alt nume, iar numele sugerează că se oprește la blackout, ceea ce nu face (nu se oprește; `step` e inert după blackout). Poate fi înlocuit cu `simulate`.
3. **Aserțiuni slabe, dar inofensive:**
   - P8 `addLoad` duplicat: `toThrow(/load/)` are regex foarte larg.
   - P7 negativ: `shedFraction >= shed` e aproape tautologic, dar prinde un reset spontan al UFLS.
4. **Acoperire rămasă (declarată de tester):**
   - Reducerea proporțională când `fcr` și `afrr` sunt ambele active la limită.
   - aFRR cu limită de putere.
   - FCR cu limită de SOC la baterie.
   - `S_sys = 0` cu sarcină 0.
   Ar merita teste când se rezolvă punctul 1 din partea coder-ului, pentru că acela le va schimba oricum comportamentul.

## Cine repară și când
- **Nimic de retrimis acum.** P2b se poate închide.
- **Planner:** decide prioritatea FCR față de aFRR (coder, neblocant 1) și semantica `setSetpoint` sub minim (coder, neblocant 2). Ambele, înainte de interfața din P4. Dacă schimbă (1), tester-ul adaugă atunci testele pentru reducerea la limită cu ambele reglaje active.
- **Tester:** neblocante 1–2, la următoarea atingere a fișierelor.

Fișiere citite: `D:\GridSim\src\model\grid.ts`, `D:\GridSim\src\model\config.ts`, `D:\GridSim\tests\model\helpers.ts`, `D:\GridSim\tests\model\grid.test.ts`, `D:\GridSim\tests\model\protection.test.ts`, plus brief-urile și rapoartele din `D:\GridSim\docs\handoff\`.

---

## Decizia planner-ului (21-10-2026)
- **P2b închis** (41/41 teste, ACCEPTAT).
- **Prioritate FCR:** da. La limită se taie întâi aFRR, apoi FCR. Intră în P4a.
- **`setSetpoint`:** cât timp unitatea e online, setpoint-ul se limitează la `[minLoad·pMax, pMax]`. Oprirea unei unități se face prin `removeUnit`, nu prin setpoint 0. Intră în P4a.
- **P4a** mai conține: FFR pentru baterii (activare completă FCR în 1 s, sursa [J] din `calcule.md`) și un preset de configurare „insulă” (FCR în 10 s la ±500 mHz, SO GL Anexa V, coloana GB). Ambele au reieșit din calibrarea nivelului 1: pe o insulă, cu rampa FCR de 30 s, orice treaptă de 10% din consum declanșează UFLS.
- Neblocantele tester-ului 1–2 se fac în P4a, la atingerea fișierelor.
