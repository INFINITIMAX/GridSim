# L2 · coder — lecțiile 4–6 din „Hydro · Pelton” (Penstock, Valve & water hammer, Nozzle & spear)

Planner: Claude (sesiunea principală). Data: 23-10-2026. Raportul îl scrii în `docs/handoff/L2-coder-raport.md`.

## Sarcina

Adaugi lecțiile 4–6 în pagina `/learn/` existentă (lecțiile 1–3 sunt gata și aprobate de Lucian). După tine, lecțiile 1–6 sunt deblocate și 7–12 rămân blocate. Stilul, layout-ul și mecanica paginii rămân exact cele de acum.

## Citește înainte (în ordinea asta)

1. `docs/learn/pelton/plan.md`: secțiunea „Plan: lecțiile 4–6” (fișiere, contractul DOM extins, riscuri) și contractul DOM inițial de mai sus în același fișier.
2. `docs/learn/pelton/lectia-04.md`, `lectia-05.md`, `lectia-06.md`: **conținutul exact**:
   - obiectul central;
   - callout-urile: textele din coloana „Text”, verbatim;
   - tab-urile;
   - simulatorul, cu formulele și intervalele;
   - ID-urile afirmațiilor.
3. Codul existent, ca model de stil și ca bază de reutilizat: `learn/lessons.ts`, `learn/ui.ts`, `learn/main.ts`, `learn/toon.ts`, `learn/scenes/plant.ts`, `learn/scenes/intake.ts`, `learn/scenes/pelton.ts`, `learn/sim/*.ts`.
4. `AGENTS.md`: regulile repo-ului.

## Ce trebuie să facă

### Simulatoare, cod pur în `learn/sim/` (fără three, fără DOM, tipuri explicite, comentariu-sursă în capul fișierului ca în `settling.ts`)

- **`friction.ts`** (L4):
  - `NU = 1.31e-6`;
  - `ROUGHNESS_MM = { pe: 0.003, steel: 0.6 }`;
  - `pipeVelocityMs(flowLps, diameterMm)` = 4Q/(πD²);
  - `reynolds(velocityMs, diameterM)` = V·D/NU;
  - `swameeJainF(roughnessMm, diameterM, re)` = 0,25 / [log₁₀(e/(3,7D) + 5,74/Re^0,9)]², cu e și D în aceeași unitate;
  - `frictionLossM(f, lengthM, diameterM, velocityMs)` = f·(L/D)·V²/(2g), g = 9,81.
- **`hammer.ts`** (L5):
  - constantele `K_WATER = 2.1e9`, `RHO = 1000`;
  - `PIPES = { steel: { e: 2.1e11, dOverT: 100 }, pvc: { e: 2.75e9, dOverT: 400 / 14 } }`;
  - `waveSpeedMs(eModulusPa, dOverT)` = √[(K/ρ) / (1 + K·(D/t)/E)];
  - `criticalTimeS(lengthM, c)` = 2L/c;
  - `joukowskyM(c, dvMs)` = c·ΔV/g;
  - `allieviM(h0M, lengthM, v0Ms, closeS)`: N = (L·V₀/(g·H₀·t))², ΔH = H₀·(N/2 + √(N + N²/4));
  - `surgeM(c, lengthM, v0Ms, h0M, closeS)` → `{ dH, sudden }`. Dacă t ≤ Tc: Joukowsky, `sudden = true`. Altfel: min(Allievi, Joukowsky), `sudden = false`.
- **`jet.ts`** (L6):
  - `CV = 0.98`;
  - `NOZZLE_MM = 40`;
  - `jetSpeedMs(headM, cv)` = Cv·√(2gH);
  - `jetFlowLps(speedMs, nozzleMm, opening)` = v · deschiderea · π·d₀²/4 · 1000, cu deschiderea 0–1.
  - Puterea se calculează cu `powerKW` din `power.ts`, cu e = 0,6, nu cu o funcție nouă.

### Date (`learn/lessons.ts`)

- L4, L5, L6 complete, cu textele din `lectia-0N.md`.
- `UNLOCKED = 6`.
- `SceneId` primește `"penstock"` (L4, L5) și `"nozzle"` (L6); `SimId` primește `"friction"`, `"hammer"` și `"jet"`.
- **Nu folosi F6** (marcat „de găsit”) în nicio lecție.
- Orice text afișat care afirmă ceva poartă ID-urile lui de afirmație.

### Scene

- **`learn/scenes/penstock.ts`** (L4 și L5): versantul ca obiect de birou, în aceeași paletă, cu același contur și aceleași materiale ca `plant.ts`. Conține:
  - camera de încărcare sus, cu nivelul apei;
  - conducta forțată pe pantă, cu 2–3 coturi și blocuri de ancoraj la coturi;
  - vana de admisie jos, vizibil mai mare decât în `plant.ts`;
  - agregatul din `pelton.ts` (`makeUnit`), refolosit, nu redesenat.
  - L4:
    - cota „H gross” (verticala de la nivelul apei la duză, ca cota H din L2);
    - linia de energie: o linie roșie punctată care coboară de la nivelul apei spre duză. Căderea ei la capăt e hf exagerat vizual ×5, cu o etichetă mică „not to scale”;
    - cota „H net”;
    - funcția `setLoss(hfM, h0M)` mută linia la fiecare schimbare din simulator.
  - L5:
    - un manometru lângă vană (cadran cu ac);
    - `runHammer(params, onDone)` animă închiderea vanei: un inel roșu urcă pe conductă până la camera de încărcare și coboară înapoi, încetinit, cu o etichetă „slowed down”. Acul manometrului urcă la H₀ + ΔH și revine;
    - `stopHammer()` oprește animația fără să cheme `onDone` (la schimbarea lecției, ca `stopDrop` din `plant.ts`).
  - Ancore pentru callout-uri și `highlight(partId)`, ca la celelalte scene. ID-urile pieselor:
    - `forebay`, `penstock`, `anchor`, `energy`, `net`;
    - `valve`, `wave`, `wall`, `gauge`.
  - Callout-urile fiecărei lecții le alegi din coloana „Piesă” a lecției respective.
- **`learn/scenes/nozzle.ts`** (L6): duza Pelton în secțiune, mare. Conține:
  - corpul duzei tăiat pe jumătate, cu interiorul vizibil;
  - acul, cu vârful conic, care alunecă pe axă;
  - jetul de apă (cilindru din `C.water`);
  - 3–4 cupe din `makeRunner`, sau o porțiune din rotor;
  - deflectorul: o placă pe pivot deasupra jetului.
  - Funcții:
    - `setOpening(0..1)` mută acul și schimbă grosimea jetului;
    - `setDeflector(on)` rotește placa în jet, iar jetul se abate în jos, departe de cupe.
  - ID-uri: `nozzle`, `spear`, `jet`, `deflector`, `runner`.
- Miniaturile din coloana de lecții pentru 4–6 folosesc scenele noi sau elemente din `pelton.ts`, cum e mai simplu. Nu fac obiectul unui gate.

### Simulatoare în UI (cardul „Try it yourself”, același stil ca L2 și L3)

**L4:**
- intrări:
  - `flow` 10–100 L/s (40);
  - `diameter` 100–300 mm (200), pas 10;
  - `length` 50–500 m (150), pas 10;
  - `<select name=material>` cu `pe` („Polyethylene”, implicit) și `steel` („Welded steel”).
- ieșiri:

| `data-out` | Format | Exemplu |
|---|---|---|
| `velocity` | 2 zecimale | „1.27 m/s” |
| `f` | 4 zecimale | „0.0158” |
| `loss` | 2 zecimale | „0.98 m” |
| `net` | 1 zecimală | „59.0 m” |
| `pct` | 1 zecimală | „1.6 %” |
| `warn` | text | vizibil doar când pct > 5 |

- H brută fixă = 60 m, afișată ca text.

**L5:**
- intrări:
  - `time` 0,1–20 s (5), pas 0,1;
  - `length` 50–500 m (150), pas 10;
  - `<select name=material>` cu `steel` (implicit) și `pvc`.
- fixe: Q = 40 L/s, D = 200 mm, deci V₀ cu `pipeVelocityMs(40, 200)`; H₀ = 60 m.
- ieșiri:

| `data-out` | Format | Exemplu |
|---|---|---|
| `c` | 1 zecimală | „1024.7 m/s” |
| `tc` | 2 zecimale | „0.29 s” |
| `surge` | 2 zecimale | „4.02 m” |
| `max` | 1 zecimală | „64.0 m” |
| `mode` | text | „gradual” sau „sudden” |
| `warn` | text | vizibil doar când ΔH > 0,3·H₀ |

- butonul `[data-run]` „Close the valve” pornește `runHammer`.

**L6:**
- intrări:
  - `head` 20–200 m (59);
  - `opening` 10–100 % (100);
  - `<input type=checkbox name=deflector>`, implicit nebifat.
- ieșiri:

| `data-out` | Format | Exemplu |
|---|---|---|
| `speed` | 1 zecimală | „33.3 m/s” |
| `flow` | 1 zecimală | „41.9 L/s” |
| `power` | 1 zecimală | „14.6 kW”, „0.0 kW” cu deflectorul pus |
| `note` | text | vizibil doar cu deflectorul pus: „Water still flows: no water hammer.” |

- scena urmează `setOpening` și `setDeflector`.

Sub fiecare simulator pui nota de limită din documentul lecției: „friction only”, „no friction, full stop” sau „area ∝ opening (simplified)”.

### Pagina

- `main.ts` leagă scenele noi (aceeași logică de `fit()`, callout-uri, ground și `stopX` la schimbarea lecției). Lecțiile 1–3 nu trebuie să se schimbe vizual.
- `window.__learnReady` și restul contractului rămân.

## Constrângeri dure

- TypeScript strict. three din npm (0.180). Fără dependențe noi. Nu copia nimic de la learn-arduino-red.vercel.app.
- Nu inventa conținut tehnic: orice text vine din `lectia-04.md`, `lectia-05.md` sau `lectia-06.md`. Dacă lipsește ceva, scrie în raport.
- Fără cod mort, fără opțiuni nefolosite, fără abstracții noi dacă un pattern existent ajunge. Refolosește helperii din `toon.ts` și piesele din `pelton.ts`.

## Ce nu ai voie să atingi

- `src/`, `2d/`, `map/`, `plant/`, `art/`;
- `tests/`, inclusiv `tests/learn/`;
- `scripts/`;
- `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `package.json`;
- `docs/`, în afară de raportul tău.

## Rezultatul așteptat

- Fișierele noi și cele schimbate din `learn/`.
- `docs/handoff/L2-coder-raport.md` cu:
  - lista fișierelor;
  - ce ai refolosit și ce ai scris nou;
  - orice abatere de la brief și motivul ei;
  - ce n-ai putut face.

Nu rulezi comenzi și nu poți spune că ceva „trece”; planner-ul rulează verificările.
