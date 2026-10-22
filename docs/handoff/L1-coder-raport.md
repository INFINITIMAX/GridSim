# L1 · coder — raport

Nu am rulat nimic (nici typecheck, nici build). Tot ce urmează e scris „pe hârtie”; planner-ul verifică.

## Fișiere create (toate în `learn/`)

- `index.html`: markup-ul din contractul DOM, fonturi Google prin `<link>`, `<script type="module" src="./main.ts">`.
- `style.css`: CSS-ul frame-ului în forma finală (fără rail, clock, hint, zoombar, progress-card; fără `display:none`).
- `main.ts`: renderer, cameră ortografică, drag/scroll/pan/+/−/reset, schimbarea lecției (`?lesson=N` cu `history.replaceState`), miniaturi, bucla de randare, `window.__learnReady`.
- `toon.ts`: helperi portați din frame, tipați, plus interfața `LessonScene`.
- `lessons.ts`: datele lecțiilor 1–3, ID-uri de afirmații pe fiecare text (`claims`), cele 12 titluri.
- `ui.ts`: progres, lista de lecții, panou cu tab-uri, callout-uri (layout automat), simulatoare L1/L2/L3.
- `scenes/pelton.ts`: agregatul portat 1:1 din frame (+ makere pentru miniaturi).
- `scenes/plant.ts`: diorama L1/L2 (nouă).
- `scenes/intake.ts`: priza + deznisipatorul L3 (nouă).
- `sim/power.ts`, `sim/settling.ts`, `sim/order.ts`: cod pur, funcțiile cerute (`powerKW`, `zankeVdMmS`, `trapLengthM`, `widthTooLarge`, `PLANT_ORDER`, `isCorrectOrder`).

## Portat din frame

CSS (variabile, brand, callout, panou, tab-uri, slidere, outs, lecții, sctl, credit), `hullMat`/`lineMat`/`part`/`at`/`box`/`rbox`/`cyl`/`xcyl`/`zcyl`/`textTex`/`decal`/`tube`, lumina, camera ortografică (unghi 1,0.85,1, `setViewOffset`), proiectarea ancorelor, stilul callout-urilor (linii punctate, puncte roșii), miniaturile, `makeRunner`/`makeNozzle`/`makeGenerator`/`makeCabinet`/`makeUnit`, traseele de fundal.

## Scris nou

- Diorama (`plant.ts`): bloc de teren în pantă (extrudat, pantă 0,38), pârâu, prag + priză, canal pe curba de nivel, camera de încărcare cu grătar, conductă forțată pe pantă cu 2 suporți, clădire cu pereți fără acoperiș ce conține agregatul Pelton la scara 0,35, canal de fugă spre pârâu, 2 stâlpi cu fire. Cota H (linie verticală, capete, linii punctate de nivel, etichetă „H”) și săgeata Q cu etichetă, vizibile doar în L2. Picătura din Run (șir de 5 sfere pe 7 ținte; ultima parte a drumului, linia electrică, e galbenă).
- `intake.ts`: albie în groapă, bazin în amonte cu prag, deversor peste prag, priză cu grătar, deznisipator (pereți, prag la ieșire, depozit de nisip, vană de spălare cu canal înapoi la râu), începutul canalului, 64 de particule de nisip.
- Layout automat al callout-urilor (două coloane lângă scenă, sortate după poziția ancorei, fără suprapuneri); se recalculează la fiecare schimbare de cameră.
- Pan: butonul din colțul scenei comută modul „drag = pan”.

## Abateri de la brief și motive

1. **Iconuri din `@phosphor-icons/core` (SVG `?raw`)**, nu `@phosphor-icons/web` de pe unpkg: nu depinde de rețea, deci nu apar erori în consolă la verificare. Fonturile rămân Google Fonts prin `<link>`, cum permite brief-ul (offline cad pe fonturile de rezervă și pot apărea erori de rețea în consolă).
2. **Callout-ul „Efficiency (e)”** (L2): textul verbatim conținea „Small plants keep 50–70%” (B5, interzis ca afirmație). L-am înlocuit cu „NRCan uses e = 0.5–0.7”, claims `["B3"]`, ca în regula din brief. Aceeași formulare în rândul din Overview și în Parts.
3. **Texte care nu sunt verbatim în `lectia-0N.md`** (md-ul dă doar descrieri în română): am scris scurt în engleză, doar din ce spune md-ul:
   - L2 „How it works”: 3 pași (B1+B3, B4, B6); Parts g: „In the formula g = 9.81.”;
   - L3 „How it works”: 2 pași (al doilea: „The basin must be long enough for a grain to reach the floor before the water leaves.”); Specs: 3 rânduri (0,2 mm C4+C7, Zanke C9, L = Q/(vD·B) C5);
   - intro-urile au claims alese de mine (L1: A6, A8, A10; L3: C1, C3, C4) fiindcă md-ul nu le atribuie. **Planner-ul sau reviewer-ul să confirme.**
   - verdictul L1 („Correct order.” / „k of 7 in the right place. Try again.”), subtitlurile cardului și avertismentul L3 („Warning: B is more than L/8 (ESHA).”).
4. **L3 Parts** are o a cincea intrare „Spillway (outlet sill)” cu text gol, fiindcă md-ul listează „deversor” fără descriere. Nu am inventat text. Dacă nu o vrei, se scoate din `L3_PARTS`.
5. **Specs L1**: doar A1 (A11, A12 omise, cum cere brief-ul). C8 omis în L3.
6. **Simulator L2**: am adăugat a doua ieșire `[data-out=gross]` (putere brută, e = 1), pentru că lectia-02 o cere ("plus putere brută").

## Ce n-am făcut / limite

- **Cele două conducte-comparație** din L2 („cădere mare, debit mic” / „cădere mică, debit mare”): nu sunt în brief, nu le-am desenat.
- **Animația L3**: nu există lungime de bazin ca intrare, deci grăunții se depun întotdeauna în bazin (aterizează la fracția u din lungime). Debitul și lățimea B schimbă doar viteza de traversare; diametrul grăuntelui nu schimbă animația. Nu apare cazul „trece mai departe”. Nici roșul de pe duza din miniatură nu e făcut.
- Geometria bazinului nu se redimensionează cu B (cere rebuild; n-a fost cerut).
- Nu am putut vedea randarea: pozițiile și scările (diorama, callout-uri peste model la 1440x900, ancore) sunt estimate din calcul; probabil necesită 1–2 iterări după capturi.
- Nivelurile apei din L3 nu sunt fizic consistente (bazinul stă pe teren, mai sus decât bazinul de acumulare); e ilustrativ.

## De verificat de planner

- `npm run typecheck`: riscuri probabile: tipurile `LineMaterial` (`dashed`, `dashSize`, `gapSize` în constructor), `sh.uniforms.thick` în `onBeforeCompile`, importurile `?raw` pentru SVG (`play-fill.svg` din `fill/`, `drop-bold.svg` din `bold/` există; celelalte din `regular/`).
- `npm run build` (intrarea `learn/index.html` e deja în `vite.config.ts`; `/favicon.svg` e referit ca în `map/index.html`).
- Pagina în Chrome headless la `?lesson=1|2|3`: `canvas#gl` nu e gol, `#callouts .callout` ≥ 4, `window.__learnReady`.
- Valorile de mână: L2 setat 60/40/0.6 → „14.1 kW”; L3 setat 40/0.2/0.4 → „27.9 mm/s”, „3.58 m”, warn ascuns; width 0.5 → „2.87 m” și warn vizibil. Inputurile reacționează la evenimentul `input`.
- Performanța (< 40 ms/cadru): conturul hull dublează geometria; unitatea din centrală are ~100 de piese cu contur. Dacă e prea scump: în `makeRunner` numărul de cupe (N = 18).
- Pentru tester: `tests/learn` poate importa `learn/sim/*.ts` și `learn/lessons.ts` (acesta din urmă n-are importuri, e pur date).
