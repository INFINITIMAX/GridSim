# S3: raport coder

Nu am rulat nimic. Nimic nu e verificat (tsc, vitest, vizual).

## Fișiere atinse
- `2d/hydro.ts`: rescris. Constantele din brief, `TECHNOLOGIES` / `SIZES` (cu `technologyById`, `sizeById`), `PlantSetup` nou, `operate(setup, riverFlow, clog)`, `stepClog`, `annual`, `powerCurve(setup, clog, maxFlow, steps)`. Eliminate: `HEAD_M`, `TURBINES`, `turbineById`, `peakEfficiency`/`minLoad` pe mărime.
- `2d/panel.ts`: rescris. `createPanel(root, hooks)` primește acum un obiect `{ onChange, onClose, onCleanNow, floodedTiles }`. `Panel` are în plus `setClog(clog)`. `PanelState` are în plus `clog`.
- `2d/main.ts`: rescris pe baza S2 (baraj 3 înălțimi, lac, teren inundat, canal, 3 forme de rotor, stavile, scară de pești, grătar cu resturi și curățitor, clog în stare).
- `2d/style.css`: stiluri noi (zonă sticky, comutatoare, avertisment, bare noi, bare lunare, opțiuni dezactivate), tokenuri `--eco`, `--clog`, `--warn`.
- `2d/index.html`: doar textul „Step 3: all the hydro upgrades" (era „Step 2"). Neceruta explicit.

## Decizii neacoperite de brief
- **Teren inundat** (în `main.ts`, nu în `hydro.ts`, cum permitea brief-ul): doar la 8 m. Un pătrățel de iarbă e inundat dacă centrul lui e la cel mult `lățime/2 + 1` tile de axa râului, iar poziția lui în lungul râului e între `damS - lac (7)` și `damS - house.length/2`. Ultima limită oprește lacul înainte de clădire (care stă lângă baraj), ca să nu fie clădirea pe teren inundat. Panoul primește numărătoarea prin `hooks.floodedTiles`.
- **Canalul:** priza (0,6 tile lățime) pornește din râu, în amonte de baraj, pe lângă grătar. Canalul merge din dreptul barajului până la 3,5 tile aval, la distanța de axa râului a centrului clădirii. Clădirea începe unde se termină canalul. Cu canal, spațiul râu-clădire devine canal de fugă de 0,6 tile (fără canal rămâne 0,4 ca în S2), deci clădirea e cu 0,2 tile mai departe de râu.
- **Rotoarele cu canal:** în canalul de fugă (bandă de apă între clădire și râu), la nivelul solului, aliniate în lungul râului. Fără canal: pe creasta barajului, ca în S2.
- **Rotor crossflow:** tambur cu axa perpendiculară pe direcția de aliniere a rotoarelor, 4 linii care alunecă.
- **Stavilele:** 3 cutii pe creastă; ridicate (lift 0,22) cât `spilledFlow > 0,01`. În vederea Top ridicarea nu se vede (doar în iso).
- **Scara de pești:** 4 bazine pe malul opus clădirii, imediat în aval de baraj; înălțimea scade pe trepte; liniuțe cu `lineDash` animat între bazine.
- **Grătarul:** în amonte de baraj peste tot râul (fără canal) sau la gura prizei (cu canal). Curățitorul e o cutie la capătul `a` al grătarului, cu un braț până la mijlocul lui.
- **Hit-test și contur:** `plantAtScreen` acoperă baraj + clădirea mutată (liste de cutii recalculate la schimbarea canalului). Canalul propriu-zis nu intră în hit-test și nu are contur.
- **Panoul:** `setClog` redesenează panoul doar dacă e deschis și procentul rotunjit s-a schimbat; `setOpen(true)` redesenează. Grafic putere: axa Y vine din maximul curbei (nu din `installedKW`, fiindcă Francis poate depăși plăcuța la L=0,85). Subtitlul e acum „Run-of-river" (fără „5 m head").
- Faza de stop `head`: text diferit pentru cădere prea mare („at most N m... Lower the dam"), generic din intervalul tehnologiei; nu se poate ajunge acum la ea cu datele curente.
- Adăugat `HOURS_PER_YEAR = 8760` în `hydro.ts` pentru factorul de capacitate.

## Abateri de la brief
- Nu am avut abateri deliberate. Singurul lucru în plus: textul din `index.html`.

## De verificat de planner
- `npx tsc --noEmit` (strict, `noUncheckedIndexedAccess`), în special tipurile din `panel.ts` (`setup[key] = !setup[key]`, `q<HTMLElement>`) și `main.ts`.
- `tests/2d/hydro.test.ts` e vechi și nu va compila (API schimbat); tester-ul îl rescrie. Puncte de testat: ordinea `stopReason`, conservarea apei cu `ecoFlow`, `installedKW`, `stepClog` cu și fără curățitor, `annual`.
- Vizual: sticky-ul din panou (`.up-sticky`, `top: 0` într-un container cu padding), Francis disponibil doar la 8 m + canal (12 m), poziția clădirii la canal (capătul ei de aval se apropie de cotul râului la x=20), resturile și curățitorul, scara de pești în iso.
- Risc: `rotorAngles` are 8 sloturi (MAX_TURBINES e 4), ca în S2.
