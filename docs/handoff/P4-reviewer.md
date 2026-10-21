# P4: review logica jocului (reviewer)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Verifică livrările P4 ale coder-ului (inclusiv „Retur 1”, echilibrarea la start) și ale tester-ului. Verdict: **ACCEPTAT** / **RESPINS**, cu fișier:linie.

## De citit
- Designul: `docs/level1.md`.
- Brief-urile: `docs/handoff/P4-coder.md` (cu „Retur 1”), `docs/handoff/P4-tester.md`.
- Rapoartele: `docs/handoff/P4-coder-raport.md`, `docs/handoff/P4-tester-raport.md`.
- Codul: `src/game/*.ts`. Testele: `tests/game/*.ts`.

## Rezultate rulate de planner (21-10-2026)
- Simulare cu toate cele 107 combinații de construcții din buget (înainte de reparația P4a): nicio combinație nu dă blackout; f maxim în primele 9 s = 50,00 Hz; stelele se potrivesc cu `level1.md`.
- `npx vitest run`: prima rulare 141/145. 4 eșecuri L5 au venit din regex-ul `/gas plant/` din test, care prindea și mesajul de introducere („the old gas plant may trip”). Nu e bug în cod. Planner-ul a restrâns regex-ul la `/gas plant tripped/` (`tests/game/level1.test.ts:347`). Verifică și corecția asta.
- **Acum: 145/145** (model + joc); typecheck OK.

## Ce verifici
**Coder:**
- Mașina de stări, acumulatorul cu pas fix și plafonul, evenimentele scriptate „exact o dată” indiferent de feliere.
- `rebalance`: corect, ordinea hidro → CCGT → OCGT, până la minimul tehnic; refuzul la surplus neabsorbabil. În sandbox, `setSetpoint` vine în același pas cu `addUnit`?
- `snapshot()`: chiar nu scapă referințe mutabile? Consumarea mesajelor e un design bun pentru două consumatoare (scenă + UI)? Planner-ul a cerut în P6 un singur `snapshot()` pe cadru.
- Puritate: fără three/DOM/random/ceas în `src/game`.
- Cod în plus față de brief.

**Tester:**
- Teste care trec întotdeauna, redundante, valori luate din rulări în loc de calcule (tester-ul declară că L2 se bazează pe măsurătorile planner-ului).
- Ce nu e acoperit și contează: starea `lost` și 0 stele (nicio combinație din buget nu dă blackout). Se poate testa altfel, de exemplu în sandbox, cu demolarea hidro?

## Format
Verdict; blocante; neblocante; cine repară și ce. Nu modifici nimic.
