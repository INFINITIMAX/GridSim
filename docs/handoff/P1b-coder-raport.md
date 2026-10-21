# P1b coder: raport

## Fișiere
- `src/scene/palette.ts` (nou): obiectul `PALETTE` (as const), singurul loc cu hex-uri. Accent unic: `electric` (#f2a900).
- `src/scene/spike.ts` (nou): `buildSpikeScene(scene)` -> `{ update(dt) }`. Funcții: `makeIsland`, `makeHouse` (3 specificații), `makeFence`, `makeTree`, `makePowerPlant`, `makeTransformer`, `makeWindTurbine`, `makePylon`, `makeLine`, helperi (`solid`, `roundedBox`, `beam`, `makeWindow`).
- `src/main.ts` (rescris): renderer cu `PCFSoftShadowMap`, `OrthographicCamera` (azimut 45°, elevație 33°), `OrbitControls`, resize, buclă cu dt plafonat la 1/30, `window.__gridsimReady = true` după primul render (declarat prin `declare global`).

## Decizii
- Acoperiș = prismă triunghiulară (`CylinderGeometry` cu 3 segmente), nu două plăci; acoperă și frontoanele.
- Limită de pan: `OrbitControls` n-are; am prins `target` într-o cutie (±6, ±3, ±6) în bucla de animație, mutând și camera. Polar: min 0.5 rad, max π/2−0.15; zoom 0.6–2.5.
- Cadrare: semi-înălțime max(10.5, 11/aspect), deci pe 390 px lățime insula încape pe orizontală.
- Animații: turbină (0.9 rad/s), culoarea apei (lerp între două tokeni), inel de spumă pulsând, emisia liniilor pulsând ușor.
- Liniile: transformator -> 2 izolatori superiori ai stâlpului; stâlp -> cele 3 case (izolatorul inferior cel mai apropiat), la un catarg mic cu izolator pe coama fiecărei case.
- Rocile de pe margine sunt poziționate pe index (deterministe, fără `Math.random`).

## Lăsat simplu
- Apă = plan plat cu schimbare de culoare, fără ondulație de vertecși.
- Fără fum din coș, fără drumuri/cărări, fără cabluri de gardă pe stâlp.
- Ferestrele: cadru + sticlă + cruce, fără perdele/detalii interioare.

## De verificat (planner)
- `npm run typecheck`, `npm run build`, captură de ecran la 1280x800 și 390x844.
- Riscuri vizuale: umbre (poziția soarelui (-8,16,8), frustum ±13), culoarea fundalului vs. planul de apă la orizont, ferestrele luminate să fie vizibile din unghiul izometric, linii care se pot suprapune cu stâlpul.
- `src/style.css` are încă fundal crem `#f3efe6` (în afara task-ului; nu l-am atins). Vizibil doar înainte de primul cadru; de aliniat cu paleta ulterior.
- Nu am scris teste.
