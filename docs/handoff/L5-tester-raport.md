# L5 · raport tester (23-10-2026)

Nu am rulat nimic; nu afirm că trece.

## Fișier creat

`D:\GridSim\scripts\verify-learn-mobile.mjs` (scris din spec, fără să citesc implementarea coder-ului; singura căutare în cod: selectorul `.logo` din `learn/index.html`, care nu e în spec).

Comanda: `node scripts/verify-learn-mobile.mjs` (portul 5199, nu rula simultan cu `verify-learn-page.mjs`). Succes: „learn mobile verification passed”. Capturi: `shots/learn-mobile-390-{1,7,12}.png`, `-360-1`, `-768-1`.

## Ce verifică și ce defect îl pică

Pe 360×740, 390×844, 768×1024 (isMobile, hasTouch, DPR 2), lecțiile 1–12:

| Bloc | Pică dacă |
|---|---|
| `__learnReady` + erori consolă | JS aruncă la `matchMedia`/`fit()` pe cutie |
| `scrollWidth ≤ innerWidth+1` (la încărcare și după derulare) | un panou fix de 250/400 px mai ieșe din ecran |
| `.logo` în vizor | antetul tăiat în stânga/dreapta |
| `#gl` lățime ≥ iw−34, înălțime 240–470 | canvas rămas pe tot ecranul sau prea scund |
| captura `#gl` ≥ prag | scenă goală (fit greșit, 0×0, context pierdut) |
| `#callouts .callout` invizibile | callout-uri rămase peste text |
| `#lesson-list`: scrollWidth > clientWidth, `.lesson.on` în întregime în lista vizibilă, pastile ≥ 44 px | listă pe mai multe rânduri/ascunsă, lecția curentă nederulată în vizor, pastile mici |
| 4 tab-uri: după `scrollIntoViewIfNeeded` sunt vizibile și în 0..iw | tab lipsă sau rând de tab-uri care iese din pagină fără să deruleze |
| `#sim` în 0..iw; controalele în card; ținte ≥ 40 px; SVG-uri ≤ iw | card ieșit din ecran, input mai lat decât cardul, butoane/selecturi mici, grafic L8/L11 nescalat |
| `.credit` există, vizibil, text corect, în 0..iw | credit ascuns sau acoperit |
| L2 (390): 60/40/0,6 → „14.1”; L9: „Pelton (1 jet)”; L12: „19.2” | simulatoarele nu merg pe telefon / evenimente de intrare pierdute |
| 390, lecția 1: lărgit la 1440×900 → ≥ 4 callout-uri vizibile, înapoi la 390 → invizibile, fără scroll orizontal | comutarea de mod cere reîncărcare |

## Pragul canvas

`max(4000, 0.02 × lățime × înălțime CSS)` bytes. Desktop: 30000 bytes la un canvas de ordinul a ~640k px² ≈ 0,047 B/px; am luat ~40 % din raport, pentru că PNG-ul la DPR 2 și cu scenă mai mică comprimă diferit și nu vreau fals-pozitive. O scenă uniformă comprimă mult sub prag. Dacă dă fals-pozitiv, mărturisește valoarea afișată în mesaj (apare bytes vs. necesar) înainte de a-l slăbi.

## Neacoperit

- Tragerea cu degetul pe scenă (rotire) și derularea paginii în afara ei: nu e în criteriile verificabile și e fragil în headless.
- Aspectul (pastile nu se taie urât, tipografie): se vede doar în capturi, de judecat uman.
- Checkbox-urile sunt excluse din regula de 40 px (de obicei au etichetă mare în jur); range-urile sunt incluse, deci pot pica dacă spec-ul „ținte 40 px” nu e aplicat și lor.

## Riscuri de fals-pozitiv

- `setViewportSize` cu `isMobile` poate să nu declanșeze `matchMedia` în toate versiunile; dacă blocul „resize round trip” pică izolat, verifică întâi asta.
- Logo: selectorul `.logo` (din `learn/index.html`). Nicio suspiciune de bug în codul coder-ului deocamdată.
