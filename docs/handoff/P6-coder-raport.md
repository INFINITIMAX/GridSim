# P6: raport coder
21-10-2026. Nu am rulat nimic (typecheck, build, e2e rămân pentru planner).

## Schimbarea de scope primită în timpul lucrului
Fără telefon: doar desktop (>= 1024 px, `min-width: 1024px` pe `.ui`). Nu există foaie de jos, nu apelez `setPaddingBottom`, nu am reguli pentru 390 px. Butoanele au 40 px (48 px "Start the day"). G10 (mobile) nu poate trece cu acest cod.

## Fișiere
Create (`src/ui/`):
- `tokens.css`: tokeni (culori din palette, fonturi, scară de spațiu, raze 10/8 px, lățime coloană 340 px).
- `ui.css`: layout desktop și componente. Importă și fonturile `@fontsource-variable/geist` și `geist-mono` (în `index.ts`).
- `dom.ts`: helper `el`, `icon` (SVG Phosphor `bold`, importate cu `?raw`; stelele: `fill` pentru câștigate, `bold` pentru goale), `fmt`, `prefersReducedMotion`.
- `labels.ts`: nume și descrieri în engleză (catalogul din model e în română, nu l-am afișat).
- `dial.ts`: cadran SVG din cod, ac cu easing pe dt, sare direct sub reduced-motion.
- `chart.ts`: canvas 2D, 60 s, o linie, repere subțiri 50,0 și 49,0, eșantion la 0,25 s simulate.
- `hud.ts`: titlu, buton "How real is this?", cadran, producție/consum/diferență, rezerve FCR/aFRR, mesaje, grafic, regiune `aria-live` (max o dată la 5 s).
- `buildPanel.ts`: carduri (mărime, cost sau timp de pornire în sandbox, o propoziție, buton), buget, lista "On the island" cu demolare, "Start the day". Refuzurile apar inline lângă control.
- `sandbox.ts`: viteză 1x/2x/4x, "Reconnect load", adăugare/scoatere consumatori, construcții în curs cu timp rămas și anulare.
- `result.ts`: ecran de rezultat (stele, motiv, nadir, UFLS maxim, "Try again", "Open sandbox").
- `howReal.ts`: dialog cu simplificările, propoziția "Romania is synchronised with continental Europe...", sursele cu link (SO GL, NC ER, RfG, NESO DC). Escape închide, focus capturat, focusul revine la buton.
- `index.ts`: `mountUi({ root, onPaddingRight, onRetry, onOpenSandbox, showFps })` returnează `{ bind(session, mode), update(snapshot, dt) }`.

Modificate: `src/main.ts` (rescris), `src/style.css` (`100dvh`, lățime 100%), `index.html` (adăugat `<div id="ui" class="ui">`).

## main.ts
`mountScene(canvas)`, `mountUi`, buclă `requestAnimationFrame` cu dt plafonat la 0,1 s, un singur `snapshot()` pe cadru către scenă și UI. `?mode=sandbox`, `?fps`. "Try again" și "Open sandbox" recreează sesiunea fără reload. `setPaddingRight` = lățimea coloanei + 24 px (ResizeObserver). Nu apelez `setPaddingBottom`.

## Blocaj: `forceTrip(id)` LIPSEȘTE
`Session` nu expune nicio cale de a injecta `tripUnit` (singurul `tripUnit` e în scriptul nivelului la t = 50 s, iar `queue` e privat). Conform brief-ului m-am oprit: `window.__gridsim` are doar `{ session, snapshot() }`. G7 (și orice e2e care forțează o pierdere) are nevoie de ceva ca `session.injectEvent(event)` sau `session.tripUnit(id)` în `src/game`, adăugat de planner. Odată adăugat, `forceTrip` e o linie în `startSession`.
`snapshot()` din hook întoarce ultimul snapshot al cadrului (nu apelează `session.snapshot()`, ca să nu consume mesajele).

## Decizii care nu erau în task
- Arcul cadranului e 48,5 - 51,0 Hz (nu 49 - 51), altfel zona de pericol sub 49,0 Hz nu ar fi vizibilă. Zone: pericol < 49,0 (roșu), avertizare 49,0-49,8 și 50,2-51 (nisip închis), normal 49,8-50,2 (salvie). Graficul: 48,5 - 50,5.
- Diferența = `pGen - pLoad` (pLoad e sarcina conectată); roșie dacă |diferența| > 50 MW (prag ales de mine).
- Pe durata zilei din nivel, coloana din dreapta arată doar lista centralelor (fără carduri/start), ca scena să nu se mute. "Reconnect load" doar în sandbox.
- Demolare în nivel: doar pentru construcțiile jucătorului (id-urile `hydro`/`gas` de start nu au buton). În sandbox toate se pot demola.
- Mesajele: minim 6 s pe ecran înainte de înlocuire (coadă), dispar după 14 s în timpul zilei; stau sub cadran, nu îl acoperă.
- Skill-ul `dataviz` nu există în `C:\Users\Lucian-PC\.claude\skills`; am urmat principiile din brief (o linie, repere subțiri, fără grilă/umplere).
- Modul `?mode=sandbox` nu mai folosește bugetul; descrierile construcțiilor sunt scrise de mine (în `labels.ts`).

## Auto-verificare, lista interzisă
Gradiente: niciunul. Text cu gradient: nu. Emoji: nu (doar SVG Phosphor, aceeași grosime `bold`; stelele câștigate sunt `fill`). Inter/serif/Space Grotesk: nu (Geist, Geist Mono pentru toate cifrele). Cardurile nu au bordură colorată în stânga (bordură uniformă). Glassmorphism/blur: nu (fundal opac; scrim plat la overlay). Trei casete cu iconițe la rând: nu (carduri în coloană). Badge deasupra titlului: nu. Lucide/shadcn: nu. Reveal la scroll, efect pe cursor: nu. Hover care estompează: nu (doar schimbare de fundal). Spațiere: doar tokeni `--sp-*`. Un singur accent: chihlimbar doar la "Start the day"; ROȘU doar pericol (zonă, valori, refuzuri, "offline"). Notă: textele de refuz sunt roșii (semantic, eroare). Zero em/en-dash: verificat cu grep în `src/ui/**`, `main.ts`, `style.css`: 0 rezultate. Contrast: ink `#232d36` și muted `#526069` pe `#fbfaf6` (estimat >= 6:1, neverificat cu unealtă). `100vh`: 0 apariții (se folosește `100dvh`).

## data-testid
`dial`, `dial-value`, `production`, `consumption`, `gap`, `build-panel`, `build-<kind>`, `start-button`, `result`, `try-again`, `open-sandbox`, `how-real-button`, `how-real-panel`, `how-real-close`, `side`, `message`, `budget`, `chart`, `fps`, `speed-<n>`, `reconnect-load`, `add-<kind>`, `pending-builds`, `sandbox-panel`.

## De verificat de planner
- `npm run typecheck`: riscuri: importurile `*.svg?raw` (se bazează pe `vite/client`), `mountScene`/`SceneHandle` din `./scene` (contractul P5), importul `buildStartSeconds` din `../game/builds` (nu e re-exportat în `game/index.ts`).
- G6: textul "Production" (`data-testid="production"`) arată `snapshot.pGen`; în faza `prepare` valoarea depinde de ce întoarce `createGrid` înainte de primul `step` (în `grid.ts` `pGen` pornește de la 0 la creare). Dacă rămâne 0 până la start, e o problemă în `src/game`/`src/model`, nu în UI.
- Verificare vizuală desktop 1280x800: coloana stânga (cadran, mesaj, grafic jos) și coloana dreapta nu se suprapun cu scena (padding).
- Nu am scris teste (rolul tester-ului); logica UI e DOM, de acoperit prin e2e.
