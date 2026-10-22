# S5: brief pentru tester. Testele pentru `2d/explain.ts`

## Ce citești

- `docs/handoff/S5-coder.md`, care e specificația;
- `docs/handoff/S5-coder-raport.md`;
- `2d/explain.ts`;
- `2d/hydro.ts`.

## Ce scrii

Fișierul nou `tests/2d/explain.test.ts`. Testezi doar funcțiile pure, fără DOM.

1. **Cazul din brief**, adică Kaplan medium ×1, baraj 5, debit 3, fără scara de pești, grătar curat. Verifici, calculate de mână:
   - water: 3 / 0 / 1 / 2;
   - head: 5 / 0 / 0 / 5;
   - turbine: running 1, flowEach 2, load 1, efficiency ≈ 0,8438;
   - powerKW ≈ 77,85.
2. **Un caz cu canal, scara de pești și grătar înfundat 50%**, cu valori de mână.
3. **Consistența**, pe o grilă de setup-uri și debite:
   - `water.used = river − eco − spilled`;
   - `head.net = gross − canal − rack`;
   - pentru cazurile care rulează, `9,81 · water.used · head.net · turbine.efficiency · chain.generator · chain.transformerKeep = powerKW`, la toleranța de 1e-9.

   Asta e garanția că formula afișată reproduce chiar puterea.
4. **Pe un caz oprit** (de exemplu flood), `stopReason` e propagat.
5. **`SECTION_INFO`:**
   - are toate cele 10 chei, fiecare cu text nevid;
   - `fish`, `gates`, `rack`, `canal` și `year` conțin un paragraf care începe cu „Simplified:”;
   - textele conțin numerele din constante. De exemplu, `gates` conține „7 m³/s”, iar `fish` conține „0.3”. **Valorile le scrii de mână, nu le citești din constante.**

## Ce nu ai voie

- să modifici codul din `2d/`;
- să scrii teste care se compară pe ele însele cu codul acolo unde poți pune o valoare de mână;
- să rulezi comenzi.

## Raport

Scrie în `docs/handoff/S5-tester-raport.md`.
