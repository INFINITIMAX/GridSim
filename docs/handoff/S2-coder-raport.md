# S2 coder: raport

## Fișiere
- `2d/hydro.ts` (nou): `TURBINES`, `HEAD_M`, `MAX_TURBINES`, `RIVER_PRESETS`, `RIVER_MAX`, `operate`, `powerCurve`, plus `turbineById` (export în plus, folosit de panel și main). `operate` aplică corectura: `running` = k din 1..maxRunnable cu puterea maximă, la egalitate k mai mic.
- `2d/panel.ts` (nou): `createPanel(root, onChange, onClose)` întoarce `{ state, setOpen, isOpen }`. Conține toate cele 7 secțiuni din brief, inclusiv fraza „Not enough water for every turbine...” (ordine: running=0, deversare, running<count, rest). Grafic SVG cu clase CSS pe tokens.
- `2d/main.ts` (editat): vedere Top la start; `camera {zoom, focus}` + `layout()` separat de `fit()`; hover/click/Escape/click pe teren; animație 600 ms ease-out cubic; rotoare per turbină; spumă la deversare; viteza liniuțelor după debit; readout cu kW; contur alb la hover.
- `2d/index.html`: `<aside id="upgrade" class="upgrade">`; textul „Step 1...” schimbat în „Step 2: inspect and upgrade the hydro”.
- `2d/style.css`: tokens noi `--water`, `--spill`, `--accent`, `--panel-width` în `:root`; stiluri `.upgrade`, `.up-*`, `.ch-*`.

## Decizii neacoperite de brief
- `createPanel` primește un al treilea parametru `onClose` (pentru ×).
- Panoul e glisat cu `transform` + `visibility` (0.3 s); nu e gradient, nu e glass.
- Centrul zonei libere se citește din `upgradeRoot.offsetWidth` (nu e duplicat 340 în TS; lățimea e doar `--panel-width`).
- `zoomAmount` (0..1) comandă zoom, focus și centrul; același număr merge și la închidere.
- Hit-test: dreptunghiurile barajului și clădirii în coordonate de tile + `hitMargin` 0.2 (în iso, clădirea înaltă e doar aproximată la nivelul solului).
- Conturul de hover e amprenta la sol, extinsă cu `outlinePad`, desenată după hidrocentrală.
- Axa Y a graficului: `niceCeil` (1, 1.5, 2, 3, 5, 10 × putere a lui 10), 2 diviziuni.
- Spuma: dreptunghi alb în aval, lungime 0.9 tile, alpha = 0.85 · spilled/riverFlow.
- Închiderea cu click pe teren gol e doar când panoul e deschis (`closePlant` verifică `isOpen`).
- Rotoarele: unghi per index (max 8 sloturi), roțile oprite păstrează unghiul. Butucul rotorului redus la `unit * 0.06`.
- Click pe hidrocentrală când panoul e deja deschis: nu face nimic.

## Abateri
- Niciuna cunoscută. `HYDRO.rotorSpeed` eliminat (înlocuit de `maxTurnsPerSecond` 1.6).

## De verificat de planner
- `tsc` strict (`noUncheckedIndexedAccess`, posibil `noUnusedLocals`).
- Captură: Top la start, hover (contur + cursor), după click: iso, zoom 2.6, hidrocentrala în stânga panoului.
- Tester: `operate` (în special alegerea lui `running` la debit mic, ex. medium x4 la 1.5 m³/s, egalități), `powerCurve`, `niceCeil` nu e exportat.
- Risc: `.upgrade` e `position: fixed` peste canvas; clickul pe panou nu ajunge la canvas (nu e copil), deci nu închide.
