# L4 · raport coder (lecțiile 10–12)

Nu am rulat nicio comandă. Nimic de mai jos nu e verificat (typecheck, teste, randare): le rulează planner-ul.

## Fișiere

Noi:
- `learn/sim/generator.ts`: `frequencyHz`, `syncSpeedRpm`, `ratioFor50Hz`.
- `learn/sim/governor.ts`: `TM_S`, `turbinePowerPU`, `waterStartS`, `frequencyTrace` (RK4, pas 1 ms, 101 valori), `ballastKW`.
- `learn/sim/chain.ts`: `GEN_EFF`, `SMALL_TURBINE_EFF`, `MachineSet`, `chainKW`, `annualKWh`. În plus `DESIGN_FLOW_LPS` (Qd = 41,9 L/s), exportat ca să fie folosit de L11 (P₀) și de scena L12, fără să-l redefinesc în trei locuri. `GROSS_HEAD_M` vine din `friction.ts`.
- `learn/scenes/unit.ts`: scena L10/L11 (`createUnit`, `UnitScene`). Exportă și `makeHouse()` (refolosit de `plant.ts` pentru casele din L12).

Modificate:
- `learn/lessons.ts`: L10–L12 complete (callout-uri verbatim din `lectia-1N.md`), `UNLOCKED = 12`, `SceneId` + `"unit"`, `SimId` + `generator|governor|chain`. Fără J6, K7, L6.
- `learn/scenes/plant.ts`: `setChain(p | null)`. Banda e un grup invizibil implicit (`chain`), deci L1/L2 nu se schimbă. Conține: 4 trepte de bandă (brut → net → ax → electric) pe traseul priză → canal → conductă → centrală → linie → sat, 3 fâșii gri care se desprind la fiecare treaptă, 2 case mici de sat. Ancore noi: `stream`, `turbine`, `generator`, `village`. Alias-uri de highlight noi: `stream`, `turbine`, `generator`. `update()` returnează acum `true` și când banda se îngustează (easing exponențial).
- `learn/ui.ts`: `SimHooks` extins, `mountGenerator`, `mountGovernor`, `mountChain`, grafic SVG f(t) (`graphHtml`).
- `learn/main.ts`: `getUnit`, `GROUND_Y.unit = 0`, hook-urile noi, `unitScene.stopRun()` + `setLesson(n)` + `plant.setChain(null)` la schimbarea lecției.
- `learn/style.css`: `.curve .ref` (linia de 50 Hz) și `.okline` (textul „50 Hz ✓”, culoarea `--ok`).

## Refolosit / scris nou

- Refolosit: `makeRunner`, `makeGenerator`, `makeCabinet`, helperii din `toon.ts`, `bindSliders`/`selectHtml`/`cell`/`setOut`/`setWarn`, `friction.ts`, `efficiency.ts`, `jet.ts`, `power.ts`, stilul curbei SVG din L8.
- Nou: sim-urile, `unit.ts`, banda din `plant.ts`, cele trei `mount*`.

## Decizii care nu erau în brief

- **Ancore în `unit.ts`:** un singur obiect `anchors` cu toate cheile L10 și L11 (nu se comută la `setLesson`); `createCallouts` folosește doar cheile lecției curente. `setLesson` comută `target`, `extent` și vizibilitatea obiectelor.
- **Ancora `belt` în modul `direct`** și **`coupling` în modul `belt`** nu au obiect propriu; cad pe aceeași zonă a axului. Callout-urile „Coupling” și „Belt” apar mereu amândouă, deci unul arată spre axul gol. Dacă nu e acceptabil, trebuie un mecanism de ascundere a callout-urilor în `main.ts`.
- **Panoul:** peste LCD-ul din `makeCabinet` (care scrie fix „50.0 Hz / DUMP 2.1kW”) pun un decal propriu cu frecvența curentă, plus un bec de frecvență (verde/gri în L10, verde/galben/roșu în L11). Cabinetul rămâne neschimbat. Pe L10 afișajul scrie „50 Hz” când e ok, „-- Hz” altfel.
- **Fereastra polilor:** un mic manșon deschis (cilindru cu un decupaj) peste un inel de rotor care se învârte; petele de poli sunt pe inel. Nu am modificat `makeGenerator`.
- **Viteza vizuală:** rotoarele se învârt la 2 % din viteza reală (proporțional cu rpm); la L11, ∝ f/50. Eticheta „slowed down” e vizibilă cât timp ceva se învârte.
- **L11 în scenă:** forțez `direct` și 4 poli. Becurile: 8 (4 case × 2), `round(load·8)` aprinse. `stopRun()` pune afișajul și turația înapoi la 50 Hz în L11; UI-ul îl cheamă la orice schimbare de intrare, deci scena nu rămâne blocată pe valorile unei rulări vechi.
- **Graficul L11:** la orice schimbare de intrare se desenează imediat curba completă (consistentă cu ieșirile). La „Run 10 s” se golește și se desenează progresiv, cu un cronometru propriu în UI (`requestAnimationFrame`, 10 s pe ceas), pentru că `runTrace` nu raportează progresul. La `onDone` se desenează curba completă.
- **Satul din L11:** puterea „village” = `loadPU · P₀` și cu, și fără ELC (sarcină constantă, simplificarea din lecție).
- **Fâșiile gri din L12:** lățime proporțională, dar cu minim 0,03 unități când pierderea e > 0, altfel pierderea conductei (~2 %) ar fi invizibilă. Banda gri nu e deci strict proporțională la valori mici.
- **Claim-uri pentru specs L11 „Our turbine”:** `["B3", "K4"]` (P₀ calculat cu formula din L2; t_m din ecuația K4). Lecția nu dă ID pentru P₀ = 14,6 kW; dacă tester-ul cere altceva, e un punct de decis.
- **Specs L10:** un singur rând „Speed at 50 Hz” cu cele șase perechi poli-rpm (J2).

## Ce nu am făcut

- Miniaturile 10–12: `THUMB_MAKERS` are deja `makeGenerator`, `makeCabinet`, `makeUnit` pentru acestea; nu am atins `pelton.ts`.
- `waterStartS` e implementat și exportat dar nu e folosit în UI (cerut în brief; folosit probabil doar de teste).
- Nu am scris teste și nu am atins `tests/`, `scripts/`, config-uri, `docs/` (în afară de acest raport).

## De verificat de planner

- `npm run typecheck`. Puncte de risc: `noUncheckedIndexedAccess` (am folosit `??` peste tot, dar nu am avut cum să confirm); generice `at()`/`reg()` în `unit.ts` și `plant.ts`.
- `npm test` pentru `tests/learn/` existent: `lessons.test.ts` poate presupune 9 lecții sau `UNLOCKED = 9`.
- Valori de mână pe sim-uri: `frequencyTrace(0, false, 2)` → f[10] = 69,7 și f[100] = 99,7; `chainKW(1, "maker")` → 24,66 / 24,23 / 21,06 / 19,17 / 77,7 %; `small` → 14,53 kW, 58,9 %.
- Randare (nu am văzut-o): poziția manșonului/ferestrei polilor (unghi π/4, față de cameră), curba curelei (`beltGeometry`, mapare shape x → −z), banda de energie din L12 (înălțimea de 0,45 peste teren, case pe pantă), că L1/L2 arată identic (grupul `chain` e ascuns), că fiecare callout din L10–L12 are leader pe un obiect vizibil.
- Contract DOM: `#sim select[name=turbine|poles|drive]`, `input[name=ratio]` (range, `disabled` la `direct`), `[data-out=gen|freq|need|ok]` (`ok` cu `hidden`); L11: `input[name=load]`, `input[name=elc]` (checkbox), `[data-run]`, `[data-out=f1|f10|ballast|village|warn]`, `svg[data-curve] .line`; L12: `input[name=flow|load]`, `select[name=machines]`, `[data-out=gross|net|shaft|elec|overall|energy]`.
