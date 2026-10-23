# L5 · tester — verificarea pe telefon pentru /learn/

Planner: Claude. Data: 23-10-2026. Raportul îl scrii în `docs/handoff/L5-tester-raport.md`.

Coder-ul face varianta de telefon în paralel, după `docs/learn/pelton/mobil.md`. Tu scrii **verificarea automată** din secțiunea „Criterii verificabile” a acelui document, **după specificație**, nu după cod. Pentru layout nu există teste unitare utile; testul real e un script Playwright, ca la desktop.

## Citește înainte

1. `docs/learn/pelton/mobil.md`: criteriile, ecranele și capturile cerute.
2. `scripts/verify-learn-page.mjs`: modelul de urmat. Copiezi felul în care:
   - pornește serverul Vite pe portul 5199;
   - lansează Chrome (`channel: "chrome"`);
   - așteaptă `window.__learnReady`;
   - setează intrările (`setRange`, `setField`, `setSelect`);
   - adună `problems` și iese cu `fail(...)` din `scripts/lib.mjs`.
3. `scripts/lib.mjs`.

## Ce scrii

`scripts/verify-learn-mobile.mjs`:
- Rulează pe 360×740, 390×844 și 768×1024, cu `isMobile: true`, `hasTouch: true` și `deviceScaleFactor: 2`.
- Verifică pentru lecțiile 1–12 toate criteriile din spec.
- Face interacțiunile L2, L9 și L12 la 390×844.
- Salvează capturile cerute în `shots/`.
- La final:
  - scrie „learn mobile verification passed” dacă nu e nicio problemă;
  - altfel listează problemele și iese cu cod nenul.
- Folosește portul 5199, ca scriptul desktop. Cele două nu rulează simultan.
- Pentru captura canvas-ului, pragul de „nu e gol” se raportează la aria lui. Scrie în raport ce prag ai ales și de ce.

## Reguli

- Verificările vin din spec, nu din cod. Nu citi implementarea coder-ului ca să-ți alegi pragurile.
- Fiecare verificare trebuie să poată pica: de exemplu, dacă callout-urile ar rămâne vizibile, dacă pagina ar derula orizontal, sau dacă canvas-ul ar rămâne pe tot ecranul.
- Fără verificări redundante.

## Ce nu ai voie să atingi

Tot în afară de `scripts/verify-learn-mobile.mjs` și raportul tău.

## Rezultatul

- Scriptul.
- `docs/handoff/L5-tester-raport.md`, cu ce verifică fiecare bloc și ce defect l-ar face să pice.

Nu rulezi comenzi și nu poți spune că trece; îl rulează planner-ul.
