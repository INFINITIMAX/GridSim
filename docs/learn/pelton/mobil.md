# Varianta de telefon pentru /learn/ (spec, 23-10-2026)

Cerută de Lucian înainte de lansarea pe X („fa varianta de telefon acum”). Pagina e publicată la https://grid-sim-ebon.vercel.app/learn/.

## Problema

Layout-ul de acum are toate panourile `position: fixed`, cu valori fixe gândite pentru ecran lat:
- lista de lecții la stânga, de 250 px;
- coloana din dreapta, de 400 px;
- scena între ele: `sceneArea()` din `main.ts` presupune `left = 290` și `right = W − 440`.

Sub ~1100 px panourile se suprapun și ies din ecran. La 390 px (iPhone):
- panourile sunt tăiate în stânga;
- callout-urile se suprapun peste text;
- scena e acoperită;
- lista de lecții lipsește.

Vezi `shots/live-mobile.png`.

## Regula de comutare

- **Mod „stack”** când lățimea ferestrei e **sub 1100 px**: în CSS cu `@media (max-width: 1099px)`, în JS cu `matchMedia("(max-width: 1099px)")`.
- **Peste 1100 px** pagina rămâne **exact ca acum**. Verificarea desktop existentă (`scripts/verify-learn-page.mjs`, 1440×900) trebuie să treacă neschimbată.
- La rotirea telefonului sau la redimensionarea ferestrei, pagina comută între moduri fără reîncărcare.

## Modul stack: o singură coloană, pagina se derulează vertical

De sus în jos:

1. **Antet**: logo-ul și „Learn Energy” mai mici (logo ~40 px, titlu ~22 px), plus progresul ca text „n / 12”. Segmentele de progres pot dispărea.
2. **Lista de lecții** (`#lesson-list`): un singur rând derulabil pe orizontală, în propria cutie.
   - Fiecare lecție e o „pastilă” cu numărul și titlul, înaltă de cel puțin 44 px.
   - Miniatura e opțională; titlul nu se taie urât (poate avea două rânduri).
   - Lecția curentă e marcată ca acum și e derulată în vizor.
3. **Scena 3D**: o cutie pe toată lățimea, cu înălțimea `clamp(260px, 55vh, 460px)`.
   - Canvas-ul `#gl` umple cutia, nu tot ecranul.
   - Obiectul încape în cutie (același `fit()`, dar calculat pe dimensiunile cutiei).
   - Butoanele scenei (`.sctl`) stau în colțul cutiei, pe un rând.
   - Un deget care trage pe scenă o rotește. În afara scenei, pagina se derulează normal.
4. **Callout-urile și liniile lor** (`#callouts`, `#leaders`) sunt **ascunse** în modul stack. Informația lor e deja în tab-ul Parts.
5. **Panoul cu tab-uri** (`.side .panel`): în fluxul paginii, pe toată lățimea, cu margini laterale de 16 px. Înălțimea e naturală, fără tăieri sau derulare internă.
   - Rândul de tab-uri poate derula orizontal în propria cutie, dacă nu încape.
6. **Simulatorul** (`#sim`): sub panou, pe toată lățimea.
   - Intrările ocupă toată lățimea cardului.
   - Țintele de atingere au cel puțin 40 px.
   - Graficele SVG (L8, L11) se scalează la lățime.
7. **Creditul** („Layout inspired by Learn Arduino by Dilum Sanjaya”) rămâne vizibil, la final, în flux.

Fundalul cu trasee (`#traces`) poate rămâne fix.

## Criterii verificabile (pentru `scripts/verify-learn-mobile.mjs`)

Pe trei ecrane, cu `isMobile` și `hasTouch`: 360×740, 390×844 și 768×1024. Pentru fiecare dintre lecțiile 1–12:

- pagina ajunge la `window.__learnReady === true`, fără erori în consolă;
- **fără derulare orizontală a paginii**: `document.documentElement.scrollWidth ≤ innerWidth + 1`;
- **logo-ul** e în întregime în vizor pe orizontală;
- **canvas-ul `#gl`**:
  - vizibil, cu lățimea ≥ innerWidth − 34 și înălțimea între 240 și 470 px;
  - captura lui nu e goală (același prag de bytes ca la desktop, ajustat la aria mai mică);
- **callout-urile** (`#callouts .callout`) nu sunt vizibile;
- **`#lesson-list`**:
  - vizibil, cu `scrollWidth > clientWidth` (derulează pe orizontală);
  - lecția curentă (`.lesson.on`) e în întregime în vizorul listei;
- **cele 4 tab-uri** există și sunt vizibile după derulare (cele care nu încap pot fi în rândul derulabil);
- **`#sim`**: după `scrollIntoView`, cardul e în întregime în vizor pe orizontală (marginile stânga și dreapta între 0 și innerWidth);
- **creditul** există și e vizibil după derulare;
- **interacțiuni** pe 390×844, ca dovadă că simulatoarele merg pe telefon:
  - L2: head 60, flow 40, eff 0,6 → puterea „14.1”;
  - L9: valorile implicite → „Pelton (1 jet)”;
  - L12: valorile implicite → „19.2”;
- **capturi**: `shots/learn-mobile-<lățime>-<n>.png`, pe toată pagina, pentru 390 și lecțiile 1, 7 și 12, plus 360 și 768 pentru lecția 1.

Desktop-ul nu se schimbă: `scripts/verify-learn-page.mjs` trece neschimbat.
