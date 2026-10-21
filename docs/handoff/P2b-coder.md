# P2b: corecturi mici în model (coder)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Aplică cele 3 observații neblocante ale reviewer-ului din `docs/handoff/P2-reviewer-raport.md`, secțiunea „Neblocante (coder)”. Nimic altceva.

1. **`grid.ts` ~330 (aFRR back-calculation):** fie corectezi decalajul de un pas (folosești `delivered` după actualizarea `u.afrr`), fie lași logica și adaugi un comentariu scurt care explică de ce decalajul e intenționat și inofensiv. Alege varianta mai simplă și corectă și justifică alegerea în raport.
2. **`grid.ts` ~357–362 (`fcrDeployed` vs. clamp):** contribuțiile raportate (`fcrDeployed`, `afrrDeployed`, plus orice câmp per unitate pe care îl expune starea) trebuie să reflecte ce a livrat **efectiv** unitatea după limitarea finală a lui `p` la `[minLoad·pMax, pMax]`. Interfața va afișa cifrele astea, deci nu au voie să fie optimiste. Dacă o unitate e la limită, starea internă a FCR nu trebuie să se acumuleze dincolo de ce poate livra (fără windup pe FCR).
3. **`grid.ts` ~165 (baterie la creare):** limitează `p` inițial după SOC, la fel ca în `step`.

## Context
Citește: `AGENTS.md`, `docs/handoff/P2-coder-raport.md` (raportul tău anterior), `docs/handoff/P2-reviewer-raport.md`, `src/model/grid.ts`.

## Rezultatul așteptat
- Modificări doar în `src/model/grid.ts`. În `config.ts`, numai dacă e strict necesar.
- Comportamentul testat în T1–T7 nu se schimbă. Planner-ul rulează cele 20 de teste existente.
- **Raport:** `docs/handoff/P2b-coder-raport.md`, cu ce ai schimbat, de ce și ce câmpuri din stare și-au schimbat semnificația.

## Constrângeri dure
- TypeScript strict, fără `any`. Fără funcționalități noi.
- Puritate: fără three/DOM/ceas/random în `src/model`.

## Ce NU ai voie să atingi
- `tests/**`, `src/scene/**`, `src/main.ts`, `src/ui/**`, `src/game/**`, `docs/**` (în afară de raportul tău), config, `GATES.md`, `TASKS.md`.
- Nu rulezi comenzi.
