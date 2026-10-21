# P4a: verdictul reviewer-ului (transcris integral de planner, 21-10-2026)

## Verdict P4a: ACCEPTAT

Nu am rulat nimic. Verificarea e pe cod și pe calcule de mână, plus rezultatele raportate de planner (65/65, typecheck, G4 și G5 OK).

### Coder (`src/model/*`)
- **Regula de limitare** (`grid.ts:391-403`) e corectă în toate cazurile cerute:
  - Limita de sus (`p < raw`): se taie aFRR pozitiv, apoi FCR pozitiv. Cele negative nu se ating.
  - Limita de jos (`p > raw`): oglindă, cu componentele negative.
  - Semne egale (X3): aFRR 10, FCR 40, adică FCR are prioritate.
  - Semne opuse (X4b/X4c): componenta opusă rămâne neatinsă.
  - Când nu se limitează nimic (`p === raw`), nu se atinge nimic, deci fără zgomot de virgulă mobilă.
- **Ciclu limită și windup:** nu apar.
  - Componenta tăiată reaccelerează la pasul următor și e tăiată iar. Rezultatul e stabil, cu p fix la limită.
  - Componenta opusă nu mai e resetată, deci cauza ciclului din X4b dispare.
  - Anti-windup-ul aFRR folosește `delivered` (valoarea după tăiere), deci integratorul nu se acumulează.
  - Baza peste limită: componentele pozitive ajung la 0 și restul îl preia clamp-ul din `p`. Documentat în raportul coder-ului.
- **`fcrFullTimeS`:** `units.ts:38` (opțional pe spec), `units.ts:149` (baterie = 1) și `grid.ts:376` (`spec.fcrFullTimeS ?? config.fcrFullTimeS`) sunt minime și corecte.
- **`sources`:** URL-ul [J] apare literal în `calcule.md:113`, iar `source` a rămas pentru G4. G4 e raportat OK de planner, inclusiv `sources`.
- **`ISLAND_CONFIG`** (`config.ts:76-80`) are exact valorile cerute și un comentariu-sursă.
- **`setSetpoint`** (`grid.ts:276-285`) limitează online la `[minLoad·pMax, pMax]`, bateria la `[-pMax, pMax]`, și limitează și `setpointRamped`. Offline păstrează comportamentul vechi, conform cu „pentru unitățile online".
- **Cod în plus:** nu am găsit. Singura decizie nemandatată e `sources` ca array, justificată și raportată.

### Tester (`tests/model/*`)
Fiecare test poate pica pe cod greșit:
- **X1:**
  - Cade dacă `spec.fcrFullTimeS` e ignorat: bateria ar da 3,33 în loc de 100.
  - Cade dacă 1 s se aplică tuturor: apare 25 în loc de 100/T.
  - Sondaj: rampa 100/1·0,05 = 5 MW/pas dă 50 la 0,5 s și 100 la 1 s. Corect.
- **X2:** 58 și 38 MW (0,29/0,5 și 0,19/0,5) și controlul DEFAULT de 66,7 MW (100·20/30) sunt corecte și discriminează între preset și DEFAULT.
- **X3:**
  - Aserțiunile la 15 s (FCR 20, aFRR 30) separă regula nouă de tăierea proporțională veche (20/30 doar în staționar, iar la 15 s FCR ar fi sub 20).
  - Sondaj: 950 + 20 + 30 = 1000. FCR 40, aFRR 10 în staționar. Corect.
  - Cazul negativ (fără tăiere) e util.
- **X4a:** cade dacă formula de prioritate se aplică și când nu se limitează nimic, sau dacă `k` zero-ează ambele.
- **X4b:** cade exact pe vechiul ciclu limită (minP 992,67). Aserțiunile afrr = −10 și fcr = 30 discriminează de varianta cu reset.
- **X4c:** calculul de mână e corect: 220 − 30 + 10 = 200 = minLoad hidro (0,2·1000). Cade dacă aFRR pozitiv e tăiat sau dacă FCR rămâne la −40.
- **X5:**
  - Valorile sunt corecte: OCGT minLoad 0,45, rampă 0,1·1000/60·0,05 = 0,0833 MW/pas, 450 + 1,667 după 1 s.
  - Testul de „fără timp mort" cade dacă `setpointRamped` nu e limitat.
  - Tabelul de clamp acoperă toate tipurile de unități.
- **X6:** bateria are rampa 60·50/60 = 50 MW/s, deci −30 la 1 s și ±50 la limite sunt corecte. Cade dacă bateria e limitată la 0.
- **`runPinned` și `afrrIntegralMW = ±1e6`:** legitim.
  - Frecvența fixă izolează cererea, iar bara OCGT de 100 000 MW evită declanșarea protecțiilor.
  - `afrrIntegralMW` e câmp public al `GridState`, iar fereastra de ≤120 s e justificată prin calcul (tau 30 s, ~230 s).
  - Rămâne puțin fragil: dacă integratorul primește mai târziu un clamp propriu, X4 se strică. Vezi neblocantul 2.
- **Mutarea în `helpers.ts`:** valorile vechi sunt păstrate.
  - `island(50, 250)` dă hidro 300, OCGT 250, solar 250, FCR 25+25 și sarcină 800.
  - `ceSystem(0)` înlocuiește `ceLike`.
  - `runUntilBlackout` a fost înlocuit cu `simulate`, iar rezultatul total e 65/65.

### Blocante
Niciunul.

### Neblocante
1. `tests/model/extensions.test.ts:73`: titlul testului X1 negativ („a battery without its own ramp spec…") nu corespunde cu ce verifică. Verifică de fapt că specificația bateriei (1 s) bate config-ul (4 s), iar OCGT-ul urmează config-ul. Redenumire cosmetică. Aplică tester-ul.
2. `tests/model/extensions.test.ts:186`: dependența de `afrrIntegralMW = ±1e6` are comentariul de justificare, dar nu are o aserțiune de gardă. Dacă integratorul primește un clamp, X4 pică cu un mesaj obscur. Opțional: o aserțiune `expect(h.afrr).toBeCloseTo(±R)` înainte de cele principale. Aplică tester-ul.
3. `tests/model/extensions.test.ts:287`: comentariul tuplei zice „5 elemente", dar are 6. Cosmetic.
4. Rămân neacoperite, recunoscute de tester: limita de SOC la baterie cu FCR+aFRR active, limita de disponibilitate solară cu FCR, setpoint offline și `makeUnit` cu setpoint sub `minLoad`. Nu sunt cerute explicit în task. Pot intra într-un P4b sau în testele de nivel.
5. `makeUnit` (`grid.ts:145-146`) nu clamp-ează la `minLoad` pentru termice (`Math.min(lo, 0)` lasă 0). Asta e o inconsistență față de `setSetpoint` online, de decis de planner. Coder-ul a semnalat-o corect, iar task-ul nu o cerea.

### Cine repară și ce
Nimeni nu e obligat să repare. Planner-ul transcrie verdictul în `docs/handoff/P4a-reviewer-raport.md`. Neblocantele 1–3 sunt opționale pentru tester. Punctul 5 e o decizie a planner-ului pentru un task viitor.

---

## Decizia planner-ului (21-10-2026)
- **P4a închis** (65/65, ACCEPTAT).
- Neblocantele 1–3 (cosmetice/gardă) se fac la următoarea atingere a `extensions.test.ts`.
- Punctul 5 (`makeUnit` sub `minLoad`): rămâne așa în model. Stratul de joc (P4) dă mereu setpoint-uri valide prin `rebalance`, iar testul L4 din P4 verifică asta. Revin la el dacă apare un caz real în sandbox.
- Punctul 4: limita de SOC cu FCR+aFRR intră în testele de nivel/sandbox (P4), unde bateriile chiar se descarcă.
