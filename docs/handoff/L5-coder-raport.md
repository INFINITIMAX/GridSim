# L5 · raport coder (23-10-2026)

Nu am rulat nimic. Nimic de mai jos nu e verificat.

## Fișiere

- `learn/index.html`: `#gl` și `.sctl` (cu cele 4 butoane) mutate într-un `<div id="stage">`, în locul vechi al canvas-ului. Pe desktop `#stage` e un div static fără stil, iar copiii rămân `position: fixed`, deci layout-ul nu se schimbă.
- `learn/style.css`: bloc nou `@media (max-width: 1099px)` la final. Regulile de desktop nu sunt modificate.
  - Body flex pe coloană, ordinea prin `order`: antet, lecții, scenă, panou+sim (`.side`), credit.
  - Antet mai mic. `.steps` rămâne doar ca text „n / 12”, poziționat absolut în dreapta sus.
  - `#lesson-list`: rând derulabil pe orizontală. Pastile de 190 px lățime și minim 48 px înălțime. Miniaturile și eticheta „Lessons” sunt ascunse.
  - `#stage` are înălțimea `clamp(260px, 55vh, 460px)` și marginea 16 px. `#gl` e absolut în el. `.sctl` e un rând în colțul din dreapta jos, cu butoane de 40 px.
  - `#callouts` și `#leaders` au `display: none`.
  - Panoul și sim-ul sunt în flux, fără derulare internă. Tab-urile derulează pe orizontală dacă nu încap.
  - Ținte de atingere ≥ 40 px: `.ibtn`, `.act`, `.chk`, select/number (font 16 px, ca să nu facă zoom iOS), range cu înălțime 28 px, butoanele up/down din `.ordcard`.
  - Creditul e în flux, la final.
- `learn/main.ts`:
  - `stackMq = matchMedia("(max-width: 1099px)")`.
  - `viewport()` dă dimensiunile canvas-ului în modul stack și `innerWidth`/`innerHeight` pe desktop.
  - `resizeRenderer()`:
    - în stack: golește stilul inline și apelează `setSize(w, h, false)`;
    - pe desktop: apelul vechi `setSize(innerWidth, innerHeight)`.
  - `sceneArea()` în stack dă cutia întreagă, fără benzi. `fit()` folosește `viewport()`, iar banda de 118 px pentru callout-uri e 0 în stack.
  - `updateCallouts()` iese imediat în stack.
  - `setLineResolution` în `tick` și `boot` folosește `viewport()`. `resize` și `boot` apelează `resizeRenderer()`.
  - `centerCurrentLesson()` derulează lecția curentă la mijlocul listei. Se apelează în `selectLesson` și la `resize`. Pe desktop nu face nimic.

## Decizii care nu erau în task

- Handler-ele de pointer nu au nevoie de schimbare: folosesc diferențe `clientX/Y`, nu coordonate absolute.
- `drawTraces()` rămâne pe `innerWidth`/`innerHeight`, fiindcă fundalul e fix pe toată fereastra.
- `touch-action: none` pe canvas rămâne, ca în spec. Efect: pe telefon, un deget pus pe scenă nu derulează pagina, așa că se derulează de pe celelalte zone. Alternativa `pan-y` ar strica modul Pan.
- Graficele SVG aveau deja `viewBox` și `width: 100%`, deci nu le-am modificat.
- Nu am atins `lessons.ts`, `sim/`, scenele 3D, `ui.ts` sau `toon.ts`.

## Riscuri pentru desktop

- Wrapper-ul `#stage` e singura schimbare de DOM. Dacă `verify-learn-page.mjs` caută butoanele sau canvas-ul după ierarhie (nu după id), ar putea fi afectat.
- Pe desktop `fit()` și `sceneArea()` dau aceleași cifre ca înainte (`viewport()` returnează `innerWidth`/`innerHeight`).
- `resizeRenderer()` este apelat acum de două ori la boot (înainte și după fonturi). Pe desktop al doilea apel nu schimbă nimic.

## Neverificat și neacoperit

- Nu am rulat build, tsc sau browser. Trebuie verificat:
  - `tsc`;
  - `scripts/verify-learn-page.mjs`;
  - noul `scripts/verify-learn-mobile.mjs`, la 360, 390 și 768 px.
- Lățimea canvas-ului trebuie să fie ≥ innerWidth − 34. Am pus marginea de 16 px și fără bordură pe `#stage`, deci ar trebui să fie innerWidth − 32.
- Pe 768 px, 12 pastile × 190 px depășesc lista, deci ar trebui să deruleze. Verifică prin test.
- Nu am folosit o cale de `matchMedia.addEventListener("change")`: comutarea se bazează pe evenimentul `resize`, care se declanșează și la rotire.

## De șters

Am creat din greșeală `D:\GridSim\learn\style.css.append.tmp` (conține doar „x”). N-am cum să-l șterg fără shell. Șterge-l.
