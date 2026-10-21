# P1b: spike vizual (coder)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Construiește o **singură scenă 3D statică** (cu animații mici, ambientale) care fixează aspectul vizual al GridSim, înainte să investim în rest. Lucian o aprobă pe baza unei capturi de ecran.

## Context
- Proiect: `D:\GridSim`. Citește întâi `AGENTS.md`, `docs/spec.md` (secțiunea Aplicație) și `docs/intent.md`.
- Stack: Vite + TypeScript strict + three.js 0.180 (deja instalat). `src/main.ts` conține acum un cub placeholder.
- Inspirație de *nivel de finisaj*: learn-arduino-red.vercel.app (scenă 3D curată, de jucărie). **Nu copia** paleta (crem/bej cald), layout-ul sau asset-urile lor. Vrem identitatea noastră.

## Direcția vizuală (de respectat)
- **Cameră:** `OrthographicCamera`, unghi izometric (azimut ~45°, elevație ~30–35°), ca o dioramă pe o masă. `OrbitControls` (din `three/examples/jsm/controls/OrbitControls.js`): rotire, zoom limitat, pan limitat. Unghiul polar e limitat ca să nu se vadă sub insulă.
- **Paletă proprie:** dimineață rece și curată. Apă albastru-gri deschis, insulă nisip deschis/verde salvie, clădiri albe cu acoperișuri în 2–3 culori de accent stinse. **Un singur accent puternic, rezervat electricității** (de exemplu un galben-chihlimbar pentru liniile sub tensiune și ferestrele luminate). Definește culorile o singură dată, ca tokeni, într-un `src/scene/palette.ts`.
- **Low-poly din primitive:** `BoxGeometry`, `CylinderGeometry`, `ConeGeometry` etc., cu `flatShading`. Colțuri ușor teșite unde contează (de exemplu `RoundedBoxGeometry` din `three/examples/jsm/geometries/RoundedBoxGeometry.js`).
- **Lumină:** `HemisphereLight` plus o `DirectionalLight` cu umbre moi (`PCFSoftShadowMap`, hartă 2048, frustum strâns pe insulă). Fără bloom, fără post-procesare în spike.
- **Detaliu purtat de piese reale, nu de zgomot:** ferestre, uși, coșuri, balustrade, izolatori pe stâlpi. Nimic generic de tip „cub cu textură”.

## Conținutul scenei
1. **Insulă:** o placă rotunjită, groasă, cu margine de stâncă/nisip, pe un plan de apă (cu o ușoară animație de culoare sau ondulație simplă, ieftină).
2. **3 case:** de mărimi diferite, cu acoperiș în două ape, ferestre (unele luminate cu accentul), ușă, un mic gard sau copac lângă ele.
3. **O centrală pe gaz:** corp, coș înalt, transformator mic lângă ea.
4. **O turbină eoliană:** pilon, nacelă, 3 pale care se rotesc lent.
5. **Un stâlp de înaltă tensiune** (zăbrele simplificate din bare subțiri) și **linii** de la centrală la stâlp și de la stâlp la case: curbe catenare (`CatmullRomCurve3` + `TubeGeometry` subțire) în culoarea accentului electric.
6. 4–6 copaci low-poly (con + cilindru) pentru scară și viață.

## Rezultatul așteptat
- `src/scene/palette.ts`: tokenii de culoare.
- `src/scene/spike.ts`: o funcție `buildSpikeScene(scene: THREE.Scene): { update(dt: number): void }` care adaugă tot conținutul și animă turbina și apa.
- `src/main.ts`: înlocuiește cubul cu spike-ul. Ține renderer-ul, camera ortografică, controalele, redimensionarea (inclusiv pe telefon, 390 px lățime) și bucla de animație cu `dt` din timestamp-uri, plafonat la 1/30 s.
- `window.__gridsimReady = true` după primul cadru randat (pentru captura automată).
- `npm run typecheck` și `npm run build` trebuie să treacă. Nu le poți rula tu: planner-ul le rulează și îți întoarce rezultatul.
- **Raport:** `docs/handoff/P1b-coder-raport.md`, cu ce ai făcut, fișierele atinse, deciziile de design și ce ai lăsat deliberat simplu.

## Constrângeri dure
- TypeScript strict, fără `any`, fără `// @ts-ignore`.
- Fără dependențe noi (doar `three` și modulele din `three/examples/jsm`).
- Fără texturi sau modele externe; totul din cod.
- Bundle-ul total rămâne sub 1 MB gzip (acum e 118 KB).
- Codul e lizibil: funcții mici pe obiect (`makeHouse`, `makeWindTurbine`, `makePylon` etc.), constante de dimensiune cu nume.

## Ce NU ai voie să atingi
- `src/model/`, `src/game/`, `src/ui/` (rămân goale).
- `GATES.md`, `TASKS.md`, `docs/` (în afară de raportul tău), `package.json`, fișierele de config.
- Nu rulezi comenzi.
