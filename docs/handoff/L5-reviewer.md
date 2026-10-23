# L5 · reviewer — varianta de telefon

Planner: Claude. Data: 23-10-2026. Nu ai unelte de scriere: întorci verdictul în răspuns, iar planner-ul îl transcrie integral în `docs/handoff/L5-reviewer-raport.md`.

## Ce verifici

1. **Coder-ul.** Spec: `docs/learn/pelton/mobil.md`; brief: `docs/handoff/L5-coder.md`; raport: `docs/handoff/L5-coder-raport.md`. Cod schimbat: `learn/index.html` (wrapper `#stage`), `learn/style.css` (blocul `@media (max-width: 1099px)`), `learn/main.ts`.
   - E cod în plus față de spec?
   - Desktop-ul (≥ 1100 px) poate fi afectat? Gândește-te la wrapper-ul `#stage`, la `resizeRenderer()`, `viewport()` și la ramurile pe `matchMedia`.
   - `fit()`, rezoluția liniilor și camera folosesc dimensiunile canvas-ului în modul stack? E corectă comutarea la `resize`?
   - `touch-action: none` pe canvas: pe telefon, un deget pe scenă nu derulează pagina. Scena ocupă cel mult 460 px din înălțime, deci pagina rămâne derulabilă în afara ei. E o problemă de folosire?
2. **Planner-ul** (abatere de la flux). După livrare, a schimbat înălțimea slider-elor din blocul mobil de la 28 px la 40 px. Verificarea mobilă a picat pe ținte de atingere sub 40 px, iar spec-ul cere minimum 40.
3. **Tester-ul.** Brief: `docs/handoff/L5-tester.md`; raport: `docs/handoff/L5-tester-raport.md`; script: `scripts/verify-learn-mobile.mjs`.
   - Fiecare verificare poate pica?
   - Sunt verificări redundante?
   - Pragul canvas-ului, max(4000, 0,02 × aria), e rezonabil?
   - Blocul de redimensionare 390 → 1440 → 390 testează cu adevărat comutarea?

## Ce a rulat deja planner-ul (rezultate reale)

- `node scripts/verify-types.mjs`: trece.
- `node scripts/verify-learn-page.mjs` (desktop, 1440×900, toate cele 12 lecții): trece, înainte și după fixul slider-elor.
- `node scripts/verify-learn-mobile.mjs`:
  - prima rulare a picat doar pe slider-ele de 28 px, pe 3 ecrane × 10 lecții;
  - după fix trece: 360, 390 și 768 px, lecțiile 1–12, interacțiunile L2, L9 și L12.
- Capturile `shots/learn-mobile-390-1.png`, `-390-7.png`, `-390-12.png`, `-360-1.png`, `-768-1.png` arată o coloană curată, fără tăieri.

## Format verdict

- **ACCEPTAT** sau **RESPINS**.
- Lista problemelor. Pentru fiecare:
  - `fișier:linie`;
  - severitate: blocant / neblocant;
  - cui îi aparține: coder / tester / planner.
