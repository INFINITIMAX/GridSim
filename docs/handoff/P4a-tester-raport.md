# P4a: raport tester
Nu am rulat nimic. Nu afirm că testele trec; planner-ul le rulează.

## Fișiere
- **Nou:** `tests/model/extensions.test.ts` (X1-X6).
- **Modificate (neblocantele P2b):**
  - `tests/model/helpers.ts`: adaugă `ceSystem(afrrPerUnitMW, cfg?)`, `island(fcrTotalMW, lossMW, cfg?)` (mutate din teste) și `runPinned(state, cfg, seconds, fHz, events?, onStep?)` (frecvență ținută fixă).
  - `tests/model/grid.test.ts`: importă `ceSystem` și `island` din helpers; definițiile locale au fost scoase.
  - `tests/model/protection.test.ts`: `ceLike()` devine `ceSystem(0)`, `island()` devine `island(50, 250)` (aceleași valori: hidro 300 / OCGT 250 / solar 250, FCR 25+25, sarcină 800), iar `runUntilBlackout` este înlocuit cu `simulate`.
  - Ca meaning, testele existente nu s-au schimbat.

## Metodă
Pentru FCR/aFRR la limită, frecvența se ține fixă la fiecare pas (`runPinned`), ca cererea să fie constantă. Altfel rețeaua (swing) ar muta cererea și calculul de mână n-ar mai fi exact. Fiecare grilă are o bară OCGT de 100 000 MW, ca un pas izolat să nu poată declanșa protecții. dt = 0,05 s. Pentru aFRR negativ în X4 setez `state.afrrIntegralMW = -1e6` (câmp public al stării).

## Teste, calcule de mână, ce le-ar face să cadă
**X1 (FFR baterie), la f = 49,3 Hz, rezerva 100 MW, în DEFAULT și în ISLAND**
- devEff = 0,69 Hz, iar raportul depășește 1 în ambele configurări, deci ținta = 100 MW.
- Baterie: pas = 100/1·0,05 = 5 MW, deci 50 MW la 0,5 s și 100 MW la 1 s. Bateria are și `p` = 100.
- OCGT cu aceeași rezervă: 100/30 = 3,33 MW la 1 s în DEFAULT și 100/10 = 10 MW în ISLAND.
- Cade dacă `spec.fcrFullTimeS` e ignorat (bateria ar da 3,33), sau dacă spec bate config-ul și pentru unități fără spec.
- Test negativ cu `fcrFullTimeS: 4` în config: OCGT 25 MW, bateria tot 100 MW. Prinde un "1 s pentru toți".

**X2 (ISLAND_CONFIG)**
- Câmpurile sunt 10 și 0,5, iar restul e identic cu DEFAULT (`toEqual`).
- f = 49,4 Hz: rampa e 100/10 = 10 MW/s, deci 50 MW la 5 s și 100 MW la 10 s. DEFAULT ar da 16,7 și 33,3.
- f = 49,7 Hz: ținta = 0,29/0,5·100 = **58 MW**, stabilă la 20 s. Cu 0,2 Hz ar fi 100.
- f = 49,8 Hz (Δf = 0,2): 0,19/0,5·100 = **38 MW**, nu e plin. Acesta e cazul "nu la 0,2".
- Control: DEFAULT la 49,7 Hz, 20 s dă 100·20/30 = 66,7 MW.
- Cade dacă presetul are valori greșite sau nu e folosit.

**X3 (prioritate FCR, semne egale)**
- Hidro pMax 1 000 la 950, headroom 50, FCR 40, aFRR 60, f = 49,5 Hz.
- aFRR: L = 50 950, kp·L·e = 254,9 ≥ 60, deci comanda e saturată la +60. Rampa e 5 MW/s.
- La 15 s: FCR e netăiat (rampa 40/30 MW/s dă 20 MW) și aFRR primește 1000 − 970 = **30**. Tăierea începe la ~7,9 s.
- La 60 s: FCR = **40**, aFRR = **10**, p = 1 000, iar fcr + afrr = p − 950.
- Tăierea proporțională veche (k = 50/100) ar da 20/30 în starea staționară și fcr < 20 la 15 s. Testul cade.
- Negativ: setpoint 800, deci 800 + 40 + 60 = 900 ≤ 1 000, fără tăiere (40 / 60 / p = 900).

**X4 (semne opuse)**
- X4a: setpoint 980, FCR +40, aFRR −30, raw = 990 ≤ 1 000, deci netul e livrabil. Așteptat: fcr 40, afrr −30, p 990, maxim p ≤ 990.
- FCR singur (1 020) ar depăși limita. Testul cade dacă se aplică formula de prioritate chiar când nu se limitează nimic (ar da fcr 20 / afrr −10), sau dacă `k` zero-ează ambele.
- X4b: vezi suspiciunea de mai jos.

**X5 (setSetpoint online)**
- OCGT 1 000 MW, minim 450, rampă 100 MW/min, pornit la 460. Cerere 0.
- Setpoint raportat = 450, `setpointRamped` = 450 și p = 450 după 20 s. Fără clamp pe ținta de rampă ar fi 460 − 33,3 = 426,7.
- Apoi cerere 800: după 1 s, p = 450 + 20·0,0833 = **451,667**. Fără clamp, p ar sta la 450 încă ~14 s (timp mort).
- Tabel de clamp: OCGT peste pMax → pMax, hidro 10 → 200, cărbune 0 → 350, solar și eolian −5 → 0, solar peste pMax → pMax. Negativ: 700 rămâne 700.

**X6 (baterie)**
- pMax 50, rampă 50 MW/s = 2,5 MW/pas. Cerere −30: setpoint −30, p = −30 la 1 s, SOC > 0,5.
- Cerere −100 → setpoint −50, p = −50 la 2 s. Cerere +100 → setpoint 50, p = 50 după 4 s.
- Cade dacă bateria e limitată la 0 sau dacă nu se limitează la ±pMax.

## Suspiciune de bug (X4b): limit cycle la limită cu semne opuse
Scenariu: setpoint 980, FCR rezervă 40 (+), aFRR rezervă 10 (−), f = 49,7 Hz, comanda aFRR saturată la −10. Cerut net +30, livrabil +20 (p = 1 000).

Traseul din `updateUnit` (`grid.ts:392-397`):
1. La tăiere, `fcr = pFcrOnly − base = 20` și `afrr = p − pFcrOnly = 0`.
2. Pasul următor: `afrr = −0,25` și `fcr = 20,067`, deci raw = 999,82 ≤ 1 000, **nimic nu se mai taie**.
3. Puterea livrată coboară: la n = 40 de pași aFRR = −10, fcr = 22,67 și p = 992,67.
4. p urcă înapoi spre 1 000 (fcr crește cu 0,067 MW/pas). La fcr > 30 raw > 1 000 și se taie din nou: afrr → 0, fcr → 20.
5. Ciclul are ~150 pași (7,5 s). `fcr` oscilează 20-30, `afrr` 0 la −10, iar **p scade periodic cu până la ~7,3 MW sub maximul posibil (1 000)**.

Testul `X4b` (`tests/model/extensions.test.ts`) cere ca, între 60 și 120 s, p ≥ 1 000 − 1e-6 la fiecare pas, ca la final fcr + afrr = 20, fcr = 20 și afrr = 0. Se așteaptă să cadă pe codul actual, dacă analiza mea e corectă. Taskul spune "livrarea netă să fie maximul posibil", iar acest test cere exact asta. Nu e o chestiune de stabilitate (p rămâne ≤ pMax), ci de model: afrr este zerat la fiecare tăiere și apoi reaccelerează. Remediul e decizia planner-ului. Pentru X4a, X3, X5, X6, X1 și X2 nu am găsit probleme.

## Retur 1 (21-10-2026)
Doar `tests/model/extensions.test.ts`, conform regulii: la limită se taie doar componentele care împing spre limita depășită (întâi aFRR, apoi FCR); cele în sens opus nu se taie. Nu am rulat nimic.
- **X4b ajustat.** Se păstrează p ≥ 1000 − 1e-6 la fiecare pas între 60 și 120 s și fcr + afrr = 20. La final: **afrr = −10 (neatins), fcr = 30** (980 + 30 − 10 = 1000). Cade dacă aFRR opus e zerat sau tăiat, sau dacă FCR rămâne la 20.
- **X4c nou (oglinda, minLoad).** Hidro minLoad 20% = 200 MW, setpoint 220, FCR 40, aFRR 10, f fixă 50,3 Hz, integrala aFRR = +1e6.
  - FCR țintă = −40, aFRR comandă = +10. Cerut net: 220 − 40 + 10 = 190 < 200; livrabil 200.
  - Integrala revine spre ~−296 cu tau 30 s, iar raw ≥ 10 durează ~230 s, deci aFRR rămâne +10 pe toată simularea (120 s).
  - Așteptat la 120 s: afrr = +10, fcr = −30 (220 − 30 + 10 = 200), p = 200.
  - Cade dacă aFRR pozitiv e tăiat sau dacă FCR rămâne raportat la −40 (livrare declarată peste cea reală).

## Ce nu am acoperit
- Limita de SOC la baterie cu FCR + aFRR active (neblocant P2b, punct 4). Ar cere o baterie aproape golită plus o abatere susținută. Nu l-am făcut pentru că scenariul seamănă cu X3/X4 și ar dubla calculul de mână. Se poate adăuga dacă planner-ul vrea.
- Limita `minLoad` cu FCR/aFRR negative (cădere pe minim): aceeași formulă, simetrică.
- Limita de disponibilitate la solar/eolian cu FCR.
- Setpoint la unități **offline** (coder-ul a păstrat vechiul clamp [0, pMax]). Brief-ul nu cere test.
- `makeUnit` cu setpoint sub minLoad (declarat de coder ca neschimbat).
- Gate G4 pentru `sources` ([J] în `sources`, nu în `source`): nu e test de model; coder-ul îl declară de verificat.
- Nu am acoperit `S_sys = 0` cu sarcină 0 (rămas din P2b), nefiind legat de P4a.

## Comanda pentru planner
```
npm run typecheck; npx vitest run tests/model
```
(sau `npm test`). Singurul test despre care am o ipoteză de eșec este X4b (vezi mai sus). Dacă X4b cade cu `puterea minimă în 60-120 s: ~992.67`, suspiciunea e confirmată.
