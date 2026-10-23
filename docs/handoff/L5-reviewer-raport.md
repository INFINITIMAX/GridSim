# L5 · reviewer · verdict (transcris integral de planner)

## Verdict L5 (reviewer, 23-10-2026): ACCEPTAT

Nu există probleme blocante. Mai jos sunt cele 4 puncte din brief, apoi observațiile neblocante.

### 1. Coder (`learn/index.html`, `learn/style.css`, `learn/main.ts`)
- **Cod în plus:** nu am găsit. Tot ce e în blocul `@media (max-width: 1099px)` (`style.css:699-881`) corespunde punctelor din spec. `centerCurrentLesson()` e cerută explicit în brief. `viewport()`, `resizeRenderer()` și `stackMq` sunt strict necesare.
- **Fișier rătăcit:** `learn/style.css.append.tmp` nu mai există (Glob nu găsește nimic).
- **Desktop (≥ 1100 px):**
  - `viewport()` întoarce `innerWidth`/`innerHeight` (`main.ts:165-167`).
  - `resizeRenderer()` păstrează vechiul `setSize(innerWidth, innerHeight)` (`main.ts:175`).
  - `sceneArea()` are valorile 290 și W−440 neschimbate (`main.ts:182-184`).
  - Banda de 118 px rămâne la fel pe desktop (`main.ts:192`).
  - `updateCallouts()` pe desktop merge ca înainte (`main.ts:219-225`).
  - Regulile CSS noi sunt toate în `@media`.
  - `#stage` e un wrapper fără stil pe desktop, iar copiii rămân `position: fixed`.
  - `verify-learn-page.mjs` trece, după rularea planner-ului.
- **`fit()`, rezoluția liniilor, camera:** toate folosesc `viewport()`, adică `canvas.clientWidth/clientHeight` în modul stack (`main.ts:180,188,481,506`). `setViewOffset` e calculat pe cutie.
- **Comutarea la `resize`:** e corectă.
  - Handler-ul apelează `resizeRenderer()`, `drawTraces()`, `refreshView()` și `centerCurrentLesson()` (`main.ts:466-471`).
  - `resizeRenderer()` golește stilul inline în stack. La revenirea pe desktop, `setSize` cu `updateStyle` îl rescrie.
  - Lipsa unui listener `matchMedia change` nu e problemă: rotirea declanșează `resize`.
- **Pointer:** folosește diferențe `clientX/Y`, deci nu depinde de poziția canvas-ului.
- **`touch-action: none` (`style.css:40`):** e o limitare de folosire, nu un bug, și o accept.
  - Scena ocupă cel mult 460 px.
  - Pagina rămâne derulabilă de pe antet, lista de lecții, panou și credit.
  - Pe landscape (≈390 px înălțime), scena de min 260 px acoperă mult din ecran, dar tot rămân zone de derulare.
  - Alternativa `pan-y` ar strica rotirea pe orizontală sau modul Pan, deci decizia coder-ului e corectă.

### 2. Planner (slider-e 28 → 40 px)
- Corect. Blocul mobil are acum `input[type="range"] { height: 40px }` (`style.css:848-850`), conform spec-ului ("ținte de atingere ≥ 40 px").
- Abaterea de la flux e minoră și justificată de o verificare picată. A fost urmată de o re-rulare a ambelor scripturi, care au trecut.
- Raportul coder-ului (`L5-coder-raport.md:15`) spune încă "range cu înălțime 28 px". Planner-ul ar trebui să noteze corecția în raportul transcris.

### 3. Tester (`scripts/verify-learn-mobile.mjs`)
- **Verificările pot pica.** Planner-ul a demonstrat asta în practică: prima rulare a picat pe slider-ele de 28 px. Celelalte verificări sunt legate de defecte concrete, de exemplu `scrollWidth`, logo, canvas, callout-uri, lecția curentă în lista vizibilă, tab-uri, `#sim` și credit.
- **Interacțiunile** (L2 "14.1", L9 "Pelton (1 jet)", L12 "19.2") verifică valori concrete, nu doar existența.
- **Redundanță:** nu e semnificativă.
  - Cele două `hasHScroll` (la încărcare și după derulare) verifică momente diferite.
  - Verificarea "controale în card" și cea de "ținte ≥ 40" sunt complementare.
- **Pragul canvas** `max(4000, 0,02 × aria)` e rezonabil: o scenă uniformă comprimă mult sub el. Mesajul afișează valorile, deci pragul poate fi reglat dacă apare un fals-pozitiv. Planner-ul a confirmat că nu a dat fals-pozitiv.
- **Blocul 390 → 1440 → 390** testează cu adevărat comutarea fără reîncărcare, în ambele sensuri.
  - La 1440 cere ≥ 4 callout-uri vizibile.
  - Înapoi la 390 cere callout-uri invizibile și fără derulare orizontală.
  - Nu pică pe un `matchMedia` care nu se actualizează.

### Observații neblocante
1. `verify-learn-mobile.mjs:53` (tester, foarte minor): `checkLesson(page, tag, width, height, n)` primește `height` și `n` pe care nu le folosește. Cod mort.
2. `verify-learn-mobile.mjs:170-180` (tester, minor): după round-trip nu se verifică dimensiunea canvas-ului, adică dacă `fit()` și renderer-ul au revenit la cutie. Comutarea de callout-uri o dovedește parțial. Poți adăuga o aserțiune pe lățimea canvas-ului la 390 după revenire.
3. `L5-coder-raport.md:15` (planner): informația de 28 px e depășită (vezi punctul 2).
4. Neacoperite de test, recunoscute de tester: tragerea cu degetul pe scenă și derularea paginii în afara ei. Rămân pentru verificare umană pe un telefon real.

### Fișiere citite
- D:\GridSim\docs\handoff\L5-reviewer.md
- D:\GridSim\docs\learn\pelton\mobil.md
- D:\GridSim\docs\handoff\L5-coder.md
- D:\GridSim\docs\handoff\L5-coder-raport.md
- D:\GridSim\docs\handoff\L5-tester-raport.md
- D:\GridSim\scripts\verify-learn-mobile.mjs
- D:\GridSim\learn\main.ts (liniile 155-234, 380-515, plus Grep)
- D:\GridSim\learn\style.css (liniile 690-881, plus Grep)
- Glob: D:\GridSim\learn\*.tmp (nimic găsit)

---

## Decizia planner-ului (23-10-2026)

- **Verdict acceptat.** Nu retrimit nimic.
- **Corecție la raportul coder-ului (punctul 3):** în blocul mobil, slider-ele au acum 40 px, nu 28 px. Le-a schimbat planner-ul, după ce verificarea mobilă a picat. Raportul coder-ului rămâne neatins, ca istoric; corecția e notată aici.
- **Observațiile 1 și 2** (parametri nefolosiți, lipsa verificării lățimii canvas-ului după revenire) rămân. Nu schimbă ce vede utilizatorul.
- **Punctul 4:** gestul cu degetul pe un telefon real îl verifică Lucian pe site-ul live.
- **Următorul pas:** commit, push, redeploy automat pe Vercel, verificare live pe telefon simulat, apoi aprobarea lui Lucian.
