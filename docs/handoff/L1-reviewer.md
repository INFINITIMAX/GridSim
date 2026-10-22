# L1 · reviewer — pagina /learn/ (lecțiile 1–3) și testele ei

Planner: Claude. Data: 22-10-2026. Nu ai unelte de scriere: întorci verdictul în răspuns, iar planner-ul îl transcrie integral în `docs/handoff/L1-reviewer-raport.md`.

## Ce verifici

1. **Coder-ul.** Brief: `docs/handoff/L1-coder.md`; raport: `docs/handoff/L1-coder-raport.md`; cod: `learn/`.
   - E cod în plus față de task (funcții nefolosite, opțiuni neutilizate, abstracții inutile)?
   - Respectă contractul DOM din `docs/learn/pelton/plan.md`?
   - `learn/sim/` e pur (fără three, fără DOM)?
   - Conținutul tehnic din `learn/lessons.ts` vine din `docs/learn/pelton/lectia-0N.md`? Uită-te în special la textele pe care coder-ul spune că le-a scris singur (L2/L3 „How it works” și Specs) și la ID-urile de afirmații alese de el pentru intro-uri (L1: A6, A8, A10; L3: C1, C3, C4). Susține afirmația ID-ul pus lângă text?
2. **Planner-ul** (abatere de la flux, de verificat la fel de strict). După livrarea coder-ului, planner-ul a făcut el ajustări vizuale, cu capturi de ecran la fiecare pas, fiindcă coder-ul nu poate vedea randările:
   - `learn/scenes/plant.ts`: centrala mărită (S 0,35 → 0,55, Z0 3,3 → 3,0), pereții calculați din `Box3` al agregatului, stâlpii relativ la perete, cota H mutată la x = 1,15, extent 11,5 × 8,8;
   - `learn/scenes/intake.ts`: terenul scurtat pe z, debitul de servitute scurtat, grăunții în așteptare mutați dincolo de planul îndepărtat, extent 12 × 5,8;
   - `learn/ui.ts`: `placeCallouts` rescris în rânduri sus/jos, cu surplusul pe laterale;
   - `learn/main.ts`: `fit()` lasă o bandă de 118 px sus și jos pentru rândurile de callout-uri;
   - `learn/style.css`: callout-uri de 206 px.

   Aceleași întrebări: cod inutil, regresii, cazuri limită (de ex. o lecție cu 1–2 callout-uri, fereastră îngustă).
3. **Tester-ul.** Brief: `docs/handoff/L1-tester.md`; raport: `docs/handoff/L1-tester-raport.md`; teste: `tests/learn/`.
   - Sunt teste redundante?
   - Sunt teste care trec indiferent de cod?
   - Controlul Ruby & Zanke e cu adevărat independent de implementare?
   - Testul de integritate a afirmațiilor prinde un ID „de găsit” folosit în UI?

## Ce a rulat deja planner-ul (rezultate reale)

- `npx vitest run tests/learn`: 4 fișiere, 38 de teste trec.
- Mutație g = 10 în `learn/sim/power.ts`: 3 teste pică; fișierul a fost restaurat.
- `node scripts/verify-types.mjs`: trece.
- `node scripts/verify-learn-build.mjs`: trece.
- `node scripts/verify-learn-page.mjs`: trece. Lungimea L3 e afișată 3.59 m (vD exact 27,889 mm/s); documentul a fost corectat.

## Format verdict

- **ACCEPTAT** sau **RESPINS**.
- Lista problemelor, fiecare cu `fișier:linie`, severitate (blocant / neblocant) și cui îi aparține (coder / tester / planner).
