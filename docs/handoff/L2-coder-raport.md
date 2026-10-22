# L2 · coder: raport (23-10-2026)

Nu am rulat nimic (typecheck, teste, build, randare). Tot ce urmează e scris „orb”; scenele 3D în special cer verificare vizuală.

## Fișiere

Noi:
- `learn/sim/friction.ts`: `NU`, `ROUGHNESS_MM`, `pipeVelocityMs`, `reynolds`, `swameeJainF`, `frictionLossM`. În plus: `GROSS_HEAD_M = 60` (folosit de ui și de scena penstock).
- `learn/sim/hammer.ts`: `K_WATER`, `RHO`, `PIPES`, `waveSpeedMs`, `criticalTimeS`, `joukowskyM`, `allieviM`, `surgeM`. În plus: tipul `HammerParams { closeS, h0M, dH }` (contractul ui → scenă).
- `learn/sim/jet.ts`: `CV`, `NOZZLE_MM`, `jetSpeedMs`, `jetFlowLps`. Puterea: `powerKW(h, q, 0.6)` din `power.ts`.
- `learn/scenes/penstock.ts`: `createPenstock()` → `PenstockScene` (`setLesson(n)`, `setLoss(hf, h0)`, `runHammer(params, onDone)`, `stopHammer()`, `highlight`, `update`).
- `learn/scenes/nozzle.ts`: `createNozzle()` → `NozzleScene` (`setOpening(0..1)`, `setDeflector(on)`, `highlight`, `update`).

Schimbate:
- `learn/lessons.ts`: L4–L6 complete, `UNLOCKED = 6`, `SceneId` + `"penstock" | "nozzle"`, `SimId` + `"friction" | "hammer" | "jet"`. F6 nefolosit.
- `learn/ui.ts`: `SimHooks` extins (`setLoss`, `runHammer`, `setOpening`, `setDeflector`), `mountFriction/mountHammer/mountJet`, helperi mici (`selectHtml`, `cell`, `setOut`, `setWarn`).
- `learn/main.ts`: getters lazy pentru scenele noi, `selectLesson` generalizat (vizibilitate + `highlight(null)` pe toate scenele create, `stopHammer`, `setLesson`), hook-urile noi (cele care mută scena setează `dirty`, `setLoss` reface și callout-urile), `GROUND_Y` tipat `Record<SceneId, number>`.
- `learn/toon.ts`: opțiunea `side` în `PartOpts`/`part()` (necesară pentru fața interioară a duzei tăiate) și `wordSprite(text, color, height)` (etichete cu cuvinte: „H gross”, „H net”, „not to scale”, „slowed down”; `labelSprite` încape doar o literă).
- `learn/style.css`: stil pentru `.sl select` și `.chk` (select și checkbox noi). Nimic altceva.

## Refolosit / scris nou
- Refolosit: `makeUnit(false)` (agregatul din penstock), `makeRunner` (duza), `tube`, `overlayLines`, `part`, `box/cyl/zcyl`, `textTex`, `setGlow`, `withThickMul`, `bindSliders`, `sliderHtml`, `head`, `resetBtn`, `.warn`, `.outs`, `.formula`, `.acts`. Miniaturile 4–6 exista deja în `THUMB_MAKERS`, neschimbate.
- Nou: cele de mai sus.

## Decizii care nu erau în brief
- Contract DOM: toate `data-out` și `name` din brief există. `data-out=warn` e `hidden` + text gol când nu e cazul (ca în L3). La L6 `note` la fel (text doar cu deflectorul pus).
- Mesajele de avertizare au `data-claims` (D6, E8; nota L6: F5).
- L4 tab Parts: „Valve” și „Nozzle” poartă claim D1 (D1 enumeră vanele printre pierderi; singurul claim din tabelul L4 care se potrivește; testul de integritate cere ID-uri din tabelul propriei lecții). „Nozzle” nu are `part` (nu e piesă separată în scena penstock).
- Textele Parts/How/Specs/rows s-au compus din descrierile din `lectia-0N.md`, cu claim-urile indicate acolo; câteva fraze de legătură sunt formulate de mine (ex. „More in lesson 5.”). Dacă planner-ul le vrea altfel, se schimbă în `lessons.ts`.
- Penstock, vana: e o vană nouă, mare, pusă în amonte de vana mică roșie din `makeUnit` (nu am putut ascunde pe aceea fără să modific `pelton.ts`). Vizual vor fi două vane în serie.
- Penstock, animație: timpul de închidere real 0,1–20 s se arată ca 0,4–2 s (0,4 + 0,08·t); unda urcă în 1,4 s și coboară în 1,4 s; acul revine în 0,7 s. Inelul stă parcat la mijlocul conductei în L5 când nu rulează. Cadranul manometrului merge 0–200 m.
- Linia de energie: căderea vizuală = min(0,85, 5·hf/H) din H brută în scenă (plafon ca „H net” să nu dispară la D = 100 mm).
- Duza: spear-ul nu atinge scaunul duzei; jetul se subțiază după √(deschidere) (aria ∝ deschidere), spear-ul doar alunecă vizibil. Jetul și apa abătută n-au `hull` din `part()` (ar ieși o pată la capete la scalare neuniformă), au contur propriu (mesh BackSide).
- Deflectorul „angajează” (jet scurtat + apă abătută în jos) când placa trece de 60 % din cursă.

## Ce nu am făcut
- Nu am afișat raportul Pmax/H₀ din tabul L5 (nu e în tabelul de ieșiri din brief).
- `highlight("energy")` și `highlight("net")` nu fac nimic vizibil (liniile sunt LineMaterial, `setGlow` atinge doar Lambert). Callout-urile merg.
- Niciun test (rolul tester-ului). `tests/learn/lessons.test.ts` existent verifică `UNLOCKED === 3` și 3 lecții: va pica până îl actualizează tester-ul.

## De verificat de planner
- `npm run typecheck` (risc: `noUncheckedIndexedAccess` în `penstock.ts`/`nozzle.ts`; tipul uniunii de scene în `main.ts` la `active = {…}[l.scene]()` și bucla `for (const s of [...])`).
- Vizual, L4–L6, pe ecran:
  - L4: linia de energie și cotele „H gross”/„H net” (poziții alese fără să văd), poziția etichetelor;
  - L5: manometrul vs. roata vanei (pot să se suprapună), inelul pe conductă, acul;
  - L6: duza tăiată (jumătatea apropiată de cameră e scoasă; de la cameră implicită se vede fața interioară și secțiunea), deflectorul care taie jetul, apa abătută față de rotor (la 5.0 distanță), supor­turile.
- Performanță: `makeRunner` scalat (18 perechi de cupe cu contur) în scena duzei.
- `?lesson=4|5|6` și că L1–L3 arată la fel (selectLesson a fost generalizat).
