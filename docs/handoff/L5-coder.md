# L5 · coder — varianta de telefon pentru /learn/

Planner: Claude. Data: 23-10-2026. Raportul îl scrii în `docs/handoff/L5-coder-raport.md`.

## Sarcina

Faci pagina `/learn/` utilizabilă pe telefon și pe tabletă, după `docs/learn/pelton/mobil.md`, care e sursa de adevăr. Pe desktop (≥ 1100 px) pagina rămâne exact ca acum.

## Citește înainte

1. `docs/learn/pelton/mobil.md`: regula de comutare, ordinea în modul stack, criteriile.
2. `learn/index.html`, `learn/style.css`: tot layout-ul `position: fixed` de acum.
3. `learn/main.ts`, locurile care presupun fereastra întreagă:
   - `drawTraces()`;
   - `sceneArea()` și `fit()`, cu `left = 290` și `right = W − 440`;
   - `updateCallouts()`;
   - handler-ul `resize`;
   - `renderer.setSize(innerWidth, innerHeight)`;
   - `setLineResolution(innerWidth, innerHeight)` în `tick` și în `boot`;
   - handler-ele de pointer pe canvas.
4. `learn/ui.ts`: `buildLessonList`, `createCallouts`, `placeCallouts`, plus felul în care se construiesc cardurile simulatoarelor și graficele SVG (L8, L11).
5. `shots/live-mobile.png`: cum arată acum la 390 px.

## Ce trebuie să facă

- **CSS:** un bloc `@media (max-width: 1099px)` care pune pagina într-o singură coloană, în ordinea din spec.
  - Panourile trec din `position: fixed` în flux. Canvas-ul stă într-o cutie de scenă.
  - Callout-urile și liniile lor sunt ascunse.
  - Lista de lecții e un rând orizontal derulabil.
  - Nicio derulare orizontală a paginii la 360 px.
- **HTML:** schimbări minime. Dacă ai nevoie de un container pentru scenă (de ex. `<div id="stage">` în jurul lui `#gl` și `.sctl`), adaugă-l așa încât layout-ul desktop să rămână identic.
- **JS (`main.ts`):**
  - mărimea renderer-ului, `fit()`, rezoluția liniilor și camera se calculează pe dimensiunile reale ale canvas-ului, nu pe `innerWidth`/`innerHeight`, când suntem în modul stack;
  - pe desktop, comportamentul și cifrele rămân aceleași;
  - în modul stack, aria scenei e cutia canvas-ului, fără benzi pentru callout-uri;
  - la comutarea între moduri (resize, rotire), totul se recalculează;
  - lecția curentă se derulează în vizor în rândul de lecții;
  - coordonatele pointer-ului pentru rotire rămân corecte când canvas-ul nu mai e la (0, 0).
- **Simulatoarele și graficele** se adaptează la lățime: intrările pe toată lățimea, SVG-urile cu `viewBox` și `width: 100%`.

## Constrângeri dure

- **Desktop identic:** la ≥ 1100 px nu se schimbă nimic vizibil. `scripts/verify-learn-page.mjs` (1440×900) trebuie să treacă neschimbat.
- TypeScript strict, fără dependențe noi, fără cod mort.
- Nu schimbi conținutul lecțiilor (`lessons.ts`), simulatoarele pure (`learn/sim/`) sau scenele 3D, în afară de ce cere strict încadrarea.
- Nu copia nimic de la learn-arduino-red.vercel.app.

## Ce nu ai voie să atingi

- `src/`, `2d/`, `map/`, `plant/` de la rădăcină, `art/`;
- `tests/`, `scripts/`;
- `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `package.json`, `vercel.json`;
- `docs/`, în afară de raportul tău.

## Rezultatul

- Fișierele schimbate din `learn/`.
- `docs/handoff/L5-coder-raport.md` cu:
  - lista fișierelor;
  - ce ai schimbat și de ce;
  - ce riscuri vezi pentru desktop;
  - ce n-ai putut face.

Nu rulezi comenzi și nu poți spune că ceva „trece”; planner-ul rulează verificările.
