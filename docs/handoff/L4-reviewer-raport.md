# L4 · reviewer · verdict (transcris integral de planner)

# Verdict reviewer L4 (lecțiile 10–12): ACCEPTAT

Nu am găsit probleme blocante. Am citit tot codul nou și toate testele noi. Nu am rulat nimic, deci mă bazez pe rezultatele raportate de planner (522 teste verzi, verificările `verify-*`, cele 3 mutații).

## 1. Coder-ul

**Cod în plus (cele declarate de coder):**
- `DESIGN_FLOW_LPS` (`learn/sim/chain.ts:14`): justificat. Un singur loc pentru Qd, folosit de `chain.ts` și de `ui.ts:922` (P₀). Respectă „Qd din `jetFlowLps`”.
- `makeHouse` (`learn/scenes/unit.ts:91`): justificat. E refolosit în `plant.ts:239` și în `unit.ts:223`, deci nu e duplicat. Dependența `plant.ts` → `unit.ts` e acceptabilă.
- Decalul de frecvență peste `makeCabinet` (`unit.ts:193-209`): justificat. LCD-ul din cabinet scrie fix „50.0 Hz / DUMP 2.1kW”, iar brief-ul cere un indicator care se schimbă. `makeCabinet` rămâne neatins.
- Lățimea minimă a fâșiilor gri (`plant.ts:229`, `MIN_STRIP = 0.03`): justificat. Pierderea din conductă (~2 %) altfel n-ar fi vizibilă. Fâșia nu e strict proporțională la valori mici; coder-ul a declarat asta.
- Cronometrul din UI pentru graficul L11 (`ui.ts:996-1013`): justificat. `runTrace` nu raportează progresul. E mic și se oprește corect (`stop()`, `path.isConnected`).
- `waterStartS` nefolosit în UI (`governor.ts:21`): **neblocant, aparține planner-ului.** Brief-ul l-a cerut explicit. E cod mort în producție, dar îl acoperă teste (ESHA 6.34 și t_m/t_w > 4). Dacă nu vrei cod nefolosit, ori îl afișezi în L11, ori îl scoți împreună cu testele lui.
- Nu am găsit alt cod nenecesar. `parts.elc = parts.frequency` (`unit.ts:191`) e un alias simplu și suficient.

**Formule față de documente:**
- `generator.ts`: corect (120·f/p, p·n/120, raportul pentru 50 Hz).
- `governor.ts`:
  - RK4 corect, cu 4 pante, pas 1 ms și 101 eșantioane.
  - Ecuația `tm·w·dw/dt = P_t − P_sarcină`, deci `dw = (P_t − load)/(tm·w)`.
  - Cu ELC, `load = turbinePowerPU(w)`, deci w rămâne 1.
  - Valorile de mână 69,7 / 81,6 / 99,7 urmează din formulă, iar planner-ul le-a confirmat prin teste.
- `chain.ts`:
  - hf se calculează la debitul curent (`flowLps`, nu cel de proiect).
  - `GROSS_HEAD_M` vine din `friction.ts` și e refolosit.
  - Qd vine din `jetFlowLps`.
  - `net = gross·(60 − hf)/60`, `shaft`, `elec` și `overall = elec/gross` sunt corecte.
  - `GEN_EFF` și `SMALL_TURBINE_EFF` corespund documentului.

**`plant.ts`, L1 și L2 la `setChain(null)`:**
- Banda e un grup `chain` cu `visible = false` implicit (`plant.ts:186-188`).
- `update()` rulează animația benzii doar când `chain.visible` (`plant.ts:333`). Pe L1 și L2 deci nu se schimbă nimic și nu apare cadru în plus.
- `setChain(null)` ascunde grupul.
- Casele din bandă sunt copii ai lui `chain`, deci și ele sunt ascunse.
- Ancorele noi (`stream`, `turbine`, `generator`, `village`) sunt folosite doar de callout-urile L12.

**Callout-urile „Belt” și „Coupling” (`unit.ts:252`, `lessons.ts:393-394`):**
- Unul din ele arată spre aer, în funcție de mod: `coupling` în modul `belt`, `belt` în modul `direct`.
- **Neblocant.** Textele sunt corecte și comparative („same speed” față de „different speeds”), iar ancora cade pe zona axului. Dacă Lucian cere ascundere pe mod, ar fi un task separat în `main.ts`.

**Texte din `lessons.ts`:**
- Callout-urile L10, L11 și L12 sunt verbatim din documente.
- Nu apar J6, K7 sau L6.
- L5 apare doar ca definiție, în rândul „kWh per year…” (`lessons.ts:482` și `:489`), nu ca „40 % e tipic”.
- `lessons.ts:457`: spec-ul „Our turbine” poartă `["K4"]` pentru P₀ = 14,6 kW și tm = 2 s. P₀ nu are ID propriu în document. Neblocant, aparține planner-ului: textul numeric nu e „susținut” de K4, doar tm e. Poți lăsa așa, fiindcă documentul însuși nu dă ID.

**`main.ts`:**
- `unitScene?.stopRun()`, `plant.setChain(null)` și `unitScene?.setLesson(n)` rulează la fiecare schimbare de lecție (`main.ts:245-250`).
- Toate sunt idempotente și nu fac nimic pe L1–L9. `stopRun` pe o scenă ascunsă doar oprește un trace inexistent și, în L11, resetează la 50 Hz.
- `GROUND_Y.unit = 0` e adăugat.
- Nu văd risc pentru L1–L9.

**Contractul DOM:**
- L10: selecturile `turbine`, `poles` și `drive`, plus slider-ul `ratio` (dezactivat la `direct`). Ieșirile `gen`, `freq`, `need` și `ok` au formatele cerute. `ok` e `hidden` când |f − 50| ≥ 0,5.
- L11: ieșirile se calculează imediat, în `update()` (`ui.ts:979-993`), din `frequencyTrace`. Butonul doar pornește `runTrace` și desenează progresiv. Avertismentul `warn` apare doar la max f > 55 Hz.
- L12: formatele corespund, inclusiv `toLocaleString("en-US")` pentru „67,200”.

**Modificările planner-ului (abatere de la flux):**
- `["B3","K4"]` → `["K4"]`: corect, B3 e din L2.
- `t_m` → `tm`, `η_t·η_g` → `ηturbine · ηgenerator`: consecvente în `lessons.ts` și `ui.ts`.
- „ballast heater” → „ballast resistor”: corect, fiindcă K7 are o singură sursă.
- Sunt retușuri mici de text, nu logică. Le notez ca abatere de la flux, fără obiecții.

## 2. Tester-ul

**Verificări pe teste (fișiere în `D:\GridSim\tests\learn\`):**
- Valorile vin din documente și din ESHA. Rândurile de 60 Hz din `generator.test.ts:60-71` (3600, 1800, 1200, 900, 720, 600, 360 și 300) se potrivesc exact cu tabelul 6.5 din `data/refs/learn-dl3/t66.png`.
- Erata din sursă (14 poli = „540” și 26 poli = „377” la 60 Hz) e tratată corect și exclusă din controalele de 60 Hz. Rândurile de 50 Hz (14 valori) se potrivesc și ele cu tabelul.
- Mutațiile raportate (7, 8 și 9 teste picate) arată că testele chiar prind schimbări în formule.
- `governor.test.ts:49-51`: compară tot traseul cu soluția analitică, deci prinde erori în RK4 care ar scăpa de punctele alese. Bun.
- `chain.test.ts:26-30`: hf la debitul curent, nu la cel de proiect, prins de testul dedicat. Bun.

**Redundanțe și teste slabe (toate neblocante, aparțin tester-ului):**
- `chain.test.ts:37-39` („factor 1 → P·8760”) e redundant cu `:35` (10 kW × 0,5 → 43 800). Același lucru.
- `chain.test.ts:64-69` („control extern 3”, E/(8760·P) = factor) verifică în practică doar `annualKWh`. E acoperit de `:35` și de coloana kWh din tabel. Aduce puțin.
- `chain.test.ts:42-49` („control extern 1”, NRCan și Holland) apelează `powerKW` din `power.ts`, nu cod nou din L4. Nu pică la nicio schimbare în `chain.ts`. Sunt controale externe ale unei formule existente. Valoare documentară, nu detector de regresii pentru L4.
- `generator.test.ts:83-85` („cuplat direct la 214 rpm”) e aproape duplicat al `:80-82`.
- `governor.test.ts:21-23` (`TM_S` = 2) fixează o constantă. E ok, dar rupe la orice recalibrare legitimă a lui tm.
- Nicio problemă de tip „trece mereu” în sensul strict. Fiecare test are o mutație plauzibilă care îl pică, în afară de cele de mai sus care sunt doar redundante.

**Controlul pentru L6 (`lessons.test.ts:98-100`):**
- Controlul în sine verifică doar că documentul conține fraza „doar în teste”. Dacă cineva reformulează documentul, pică fără motiv real. E slab, dar inofensiv.
- Plasa reală e lista `BANNED` (`lessons.test.ts:23`, testul de la `:113-116`), care interzice L6 în orice text de lecție. Aceea e o plasă reală, deci verdictul e ok.
- Nu cere schimbare.

**Neacoperit (declarat de tester):**
- Scenele three, `ui.ts`, formatele `data-out` și avertismentul L11. Le acoperă `verify-learn-page.mjs`, rulat de planner și verde.
- Nu am găsit un caz important din task rămas neacoperit în teste. „L5 doar ca definiție” nu se poate testa fără o regulă inventată.

## 3. Lista problemelor (toate neblocante)

| # | Fișier:linie | Problemă | Aparține |
|---|---|---|---|
| 1 | `D:\GridSim\learn\sim\governor.ts:21` | `waterStartS` nefolosit în UI, doar în teste | planner (cerut în brief) |
| 2 | `D:\GridSim\learn\scenes\unit.ts:252`, `D:\GridSim\learn\lessons.ts:393-394` | Callout „Belt” sau „Coupling” arată spre aer, după mod | planner, decizie de produs |
| 3 | `D:\GridSim\learn\lessons.ts:457` | P₀ = 14,6 kW nu are ID propriu; `K4` acoperă doar tm | planner |
| 4 | `D:\GridSim\tests\learn\chain.test.ts:37-39` | Redundant cu `:35` | tester |
| 5 | `D:\GridSim\tests\learn\chain.test.ts:64-69` | Verifică practic doar `annualKWh`, deja acoperit | tester |
| 6 | `D:\GridSim\tests\learn\chain.test.ts:42-49` | Controale pe `powerKW`, nu pe cod nou | tester |
| 7 | `D:\GridSim\tests\learn\generator.test.ts:83-85` | Aproape duplicat al `:80-82` | tester |
| 8 | `D:\GridSim\tests\learn\lessons.test.ts:98-100` | Controlul L6 verifică textul documentului, nu codul; plasa reală e `BANNED` | tester (nu cere schimbare) |

## Fișiere citite

- `D:\GridSim\docs\handoff\L4-reviewer.md`
- `D:\GridSim\docs\handoff\L4-coder.md`
- `D:\GridSim\docs\handoff\L4-coder-raport.md`
- `D:\GridSim\docs\handoff\L4-tester-raport.md`
- `D:\GridSim\docs\learn\pelton\lectia-10.md`
- `D:\GridSim\docs\learn\pelton\lectia-11.md`
- `D:\GridSim\docs\learn\pelton\lectia-12.md`
- `D:\GridSim\learn\sim\generator.ts`
- `D:\GridSim\learn\sim\governor.ts`
- `D:\GridSim\learn\sim\chain.ts`
- `D:\GridSim\learn\sim\friction.ts`
- `D:\GridSim\learn\scenes\unit.ts`
- `D:\GridSim\learn\scenes\plant.ts` (liniile 150–409)
- `D:\GridSim\learn\main.ts`
- `D:\GridSim\learn\ui.ts` (liniile 300–360 și 840–1057)
- `D:\GridSim\learn\lessons.ts` (liniile 396–497, plus grep)
- `D:\GridSim\tests\learn\generator.test.ts`
- `D:\GridSim\tests\learn\governor.test.ts`
- `D:\GridSim\tests\learn\chain.test.ts`
- `D:\GridSim\tests\learn\lessons.test.ts` (extrase prin grep)
- `D:\GridSim\data\refs\learn-dl3\t66.png`

---

## Decizia planner-ului (23-10-2026)

- **Verdict acceptat.** Nu retrimit nimic la coder sau la tester.
- **#1, `waterStartS`:** rămâne. E controlul extern al regulii ESHA t_m/t_w > 4, care justifică parametrul t_m = 2 s, și îl acoperă testele.
- **#2, callout-urile Belt/Coupling:** e decizie de produs. O semnalez lui Lucian la aprobarea M6. Dacă vrea, ascunderea pe mod devine un task mic separat.
- **#3:** P₀ e o valoare derivată din L6 (puterea de 14,6 kW afișată acolo), iar textul spune „(lesson 6)”. Rămâne așa.
- **#4–#8:** redundanțe în teste, fără efect asupra paginii. Rămân.
- **Următorul pas:** gate-ul M6, aprobarea lui Lucian pe lecțiile 10–12. Cu el se încheie programa.
