# P6: interfața (HUD, meniuri, ecrane) și `main.ts` (coder)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Scrie interfața DOM peste scena 3D și firul principal (`src/main.ts`), care leagă sesiunea de joc (`src/game`), scena (`src/scene`, scrisă în paralel în P5) și interfața.

## Context
Citește: `AGENTS.md`, `docs/spec.md`, `docs/level1.md`, `src/game/session.ts` (API-ul și tipurile `Snapshot`/`Session`), `docs/handoff/P5-coder.md` (contractul `mountScene`/`SceneHandle`; P5 îl implementează în paralel, deci lucrează pe contract), `src/scene/palette.ts`.

## Design read (planner)
Interfață de joc educațional peste o dioramă 3D luminoasă, pentru publicul de pe X (curios, nespecialist). Limbaj calm, tehnic-prietenos, de instrument de măsură, nu de dashboard.

Dials: VARIANCE 5, MOTION 4, DENSITY 4. Temă: luminoasă, blocată, fiindcă scena e o dimineață luminoasă. Fără mod întunecat în felia verticală; e o excepție declarată de la regula dark mode.

## Sistem vizual (obligatoriu)
- **Tokeni CSS** într-un singur fișier, `src/ui/tokens.css`. Culorile vin din `src/scene/palette.ts` (apa `#b7c9d6`, nisip/salvie, accentul electric `#f2a900`). Suprafețele HUD sunt alb-cald opac (nu glassmorphism, nu blur), cu text gri-ardezie închis (contrast WCAG AA ≥ 4,5:1).
- **Un singur accent:** chihlimbarul electric, folosit doar pentru electricitate și pentru acțiunea principală („Start the day”). Roșul e permis **doar** ca stare semantică de pericol (sub 49,0 Hz, UFLS, blackout), nu decorativ.
- **Tipografie:** `@fontsource-variable/geist` pentru text și `@fontsource-variable/geist-mono` pentru **toate cifrele** (Hz, MW, %). Ambele sunt instalate. Fără Inter, fără serif.
- **Colțuri:** o singură scară, 10 px pentru panouri și carduri, 8 px pentru butoane. Fără butoane-pastilă amestecate.
- **Iconițe:** doar `@phosphor-icons/core` (instalat; SVG-uri importate ca fișiere sau inline din pachet), cu aceeași grosime peste tot. Fără SVG-uri desenate de mână, fără emoji.
- **Lista interzisă a lui Lucian** (se verifică integral): gradiente mov-albastru, text cu gradient, emoji în titluri, Inter, carduri cu bordură colorată în stânga, glassmorphism, trei casete cu iconițe la rând, badge deasupra titlului, Lucide, componente shadcn neatinse, secțiuni care apar la scroll, efect care urmărește cursorul, hover care estompează butoanele, spațiere inconsistentă, linii de pauză lungi (em dash) oriunde în text, copy cu buzzword-uri, serif italic pentru cuvinte de accent, Space Grotesk/Instrument, grain peste gradient.
- **Zero em-dash** (`—`) sau en-dash (`–`) în orice text vizibil.

## Componente
1. **Cadranul de frecvență** (piesa centrală a HUD-ului): un arc 49–51 Hz în SVG, randat din cod (e un instrument, nu o iconiță), cu acul și valoarea în mono (de exemplu `49.87 Hz`).
   - Zonele colorate sunt discrete: normal în jurul a 50, avertizare, pericol sub 49,0.
   - Acul se mișcă fluid; sub reduced-motion sare direct la valoare.
2. **Bara producție/consum:** două valori în MW și diferența lor. Diferența e cuvântul-cheie al jocului.
3. **Graficul de frecvență pe ultimele 60 s:** canvas 2D, o singură linie, cu linia de 50 Hz și pragul de 49,0 Hz marcate subțire. Fără grilă grea, fără fundal cu bandă umplută. Încarcă skill-ul `dataviz` ca referință înainte să-l scrii.
4. **Rezervele:** FCR și aFRR livrate acum, în MW, ca text și număr. Fără bare de progres cu fundal umplut.
5. **Panoul de construcție** (faza `prepare` și sandbox-ul): carduri pentru cele 5 construcții, fiecare cu mărime, cost, „ce face” într-o propoziție (de exemplu „Reacts in one second. No inertia.”) și butonul de construcție. Refuzurile (buget, motiv) apar inline, lângă card, nu în alertă.
   - Sub panou: bugetul rămas și butonul „Start the day”.
   - Construcțiile existente se pot demola din aceeași listă.
6. **Mesajele narative** (`snapshot.newMessages`): un fir scurt, cu ultimul mesaj vizibil. Mesajele nu dispar înainte de ~6 s și nu acoperă cadranul.
7. **Ecranul de rezultat** (`won`/`lost`): stelele (Phosphor), motivul (`result().reason`), cele două cifre-cheie (nadir, UFLS maxim) și acțiunile „Try again” și „Open sandbox”.
8. **„How real is this?”:** un buton mic, mereu accesibil, care deschide un panou cu simplificările modelului:
   - insula vs. rețeaua europeană;
   - **România e sincronizată cu Europa continentală, unde abaterile reale sunt de câteva sutimi de Hz**;
   - invertoare grid-following;
   - un singur nod;
   - presupunerile de joc din `docs/calcule.md`.
   Plus sursele principale, cu link (SO GL, NC ER, RfG, NESO DC). E obligatoriu (G12).
9. **Sandbox:** viteză 1×/2×/4×, adăugare și scoatere de consumatori, construcțiile în curs (`pendingBuilds`, cu timp rămas) și butonul „Reconnect load” (`restoreLoad`).
10. **Contor fps** discret (pentru gate-ul manual G11), afișat cu `?fps` în URL.

## Layout
- **Desktop (≥ 1024 px):** cadranul și cifrele sus-stânga, compacte. Panoul de construcție/sandbox e o coloană în dreapta (de aproximativ 340 px), cu `scene.setPaddingRight`. Graficul stă jos-stânga.
- **Telefon (390 px):** cadranul și cifrele sus, într-o bandă compactă. Panoul de construcție e o foaie de jos care se poate restrânge, cu `scene.setPaddingBottom`. Graficul e restrâns sub cadran. **Fără scroll orizontal.** Toate țintele de atingere au ≥ 44 px.
- Folosește `100dvh`, niciodată `100vh`.

## `src/main.ts`
- Creează sesiunea (`level1` implicit; `?mode=sandbox` pornește sandbox-ul), scena (`mountScene`) și interfața.
- Bucla: `requestAnimationFrame`; `dt` din timestamp-uri, plafonat; `session.advance(dt)`; un singur `snapshot()` pe cadru, transmis scenei și interfeței (mesajele se consumă o singură dată).
- „Try again” și „Open sandbox” recreează sesiunea fără reîncărcarea paginii.
- **Hook-uri pentru e2e (G6–G10, G12)**, fără efect vizual:
  - `window.__gridsim = { session, snapshot(): Snapshot, forceTrip(id) }`;
  - `forceTrip` trimite `tripUnit` prin modelul real; dacă API-ul sesiunii nu permite, scrie în raport ce lipsește și oprește-te;
  - atribute `data-testid` pe cadran, cifra de producție, panoul de construcție, butonul de start, ecranul de rezultat și butonul/panoul „How real is this?”.

## Accesibilitate
Cifrele importante sunt anunțate cu `aria-live="polite"`, cu limită de frecvență (nu la fiecare cadru). Toate butoanele au etichete. Meniurile se pot folosi de la tastatură. Ordinea focusului e logică.

## Rezultatul așteptat
- `src/ui/**` (de exemplu `tokens.css`, `hud.ts`, `dial.ts`, `chart.ts`, `buildPanel.ts`, `result.ts`, `howReal.ts`, `sandbox.ts`, `index.ts`) și `src/main.ts`. Poți ajusta și `src/style.css`/`index.html`.
- **Raport:** `docs/handoff/P6-coder-raport.md`, cu structura, deciziile și o auto-verificare explicită față de lista interzisă a lui Lucian și regula zero em-dash.

## Constrângeri dure
- TypeScript strict, fără `any`. Vanilla DOM, fără framework.
- Dependențe: doar cele deja instalate (`three`, fonturile Geist, `@phosphor-icons/core`).
- Nu modifici `src/model/**`, `src/game/**`, `src/scene/**` (P5 lucrează acolo). Dacă îți lipsește ceva din API-ul jocului, notezi în raport.
- Textul vizibil e în engleză, scurt și concret, fără buzzword-uri.

## Ce NU ai voie să atingi
`src/model/**`, `src/game/**`, `src/scene/**`, `tests/**`, `docs/**` (în afară de raportul tău), config, `package.json`, `GATES.md`, `TASKS.md`. Nu rulezi comenzi.
