# P5: scena 3D legată de joc (coder)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Transformă spike-ul vizual aprobat (`src/scene/spike.ts`) într-o scenă care **reflectă starea jocului** din `Snapshot` (`src/game/session.ts`). Lucian a aprobat direcția vizuală, deci păstrezi paleta, unghiul camerei și stilul low-poly.

## Context
Citește: `AGENTS.md`, `docs/spec.md`, `docs/level1.md`, `docs/handoff/P1b-coder-raport.md` (deciziile spike-ului), `src/scene/*.ts`, `src/main.ts`, `src/game/session.ts` (tipurile `Snapshot`, `UnitView`, `ConsumerView`).

## API cerut (contract cu P6, care scrie `main.ts` și interfața)
`src/scene/index.ts` exportă:
```ts
export interface SceneHandle {
  update(snapshot: Snapshot, dtSeconds: number): void; // apelat în fiecare cadru
  resize(width: number, height: number): void;
  setPaddingRight(px: number): void; // ca dioramele să nu stea sub panoul lateral pe desktop
  setPaddingBottom(px: number): void; // același lucru pentru foaia de jos pe telefon
  dispose(): void;
}
export function mountScene(canvas: HTMLCanvasElement): SceneHandle;
```
`mountScene` deține renderer-ul, camera ortografică, controalele și lumina. Bucla de animație o ține P6 în `main.ts`; scena nu pornește propriul `setAnimationLoop`.

## Comportament cerut
1. **Unitățile din snapshot devin obiecte în scenă**, după `kind`:
   - hidro: un baraj cu lac (nou; păstrează-l low-poly și simplu);
   - gaz CCGT/OCGT: centrala din spike (OCGT mai mic);
   - solar: un câmp de panouri;
   - eolian: turbina din spike (mai multe turbine = mai multe obiecte);
   - baterie: containere.
   Obiectele apar și dispar când se construiesc sau se demolează. Fiecare tip are **locuri fixe predefinite** pe insulă (sloturi), ca nimic să nu se suprapună. Primul slot liber al tipului respectiv se ocupă.
2. **Unitatea offline** (de exemplu gazul după `tripUnit`) se vede clar: coșul nu mai scoate abur, luminile ei se sting, iar linia ei nu mai are accentul electric.
3. **Consumatorii și UFLS:** orașul are cartiere (grupuri de case). Când `shedFraction` crește, ferestrele luminate se sting **pe cartiere întregi**, în ordine fixă, proporțional cu fracția deconectată. Asta e momentul-cheie vizual al nivelului. În sandbox, consumatorii adăugați (fabrică, centru de date, încărcătoare EV) apar în sloturi proprii.
4. **Blackout:** toate luminile se sting, liniile își pierd accentul și scena devine ușor desaturată.
5. **Liniile electrice:** accentul (galben-chihlimbar) pulsează sau curge discret cu o intensitate legată de `pGen`. Mișcarea are un motiv: arată că prin linii curge energie.
6. **Animații:** turbinele se rotesc proporțional cu puterea lor, iar aburul centralei pe gaz e legat de `p`. Toate sunt pe `dtSeconds`, fără ceas propriu. Sub `prefers-reduced-motion`: fără rotație sau pulsare, doar stările statice (lumini aprinse/stinse).
7. **Telefon (390 px):** insula se încadrează în zona rămasă vizibilă peste foaia de jos (`setPaddingBottom`). Pe desktop se încadrează lângă panoul lateral (`setPaddingRight`).
8. `window.__gridsimReady = true` după primul cadru randat (se păstrează pentru testele e2e). Adaugă `window.__gridsimScene = { litWindowCount(): number }`, cu numărul de ferestre aprinse acum; gate-ul G7 îl folosește.

## Performanță
- Geometrie partajată și `InstancedMesh` pentru elementele repetate (ferestre, panouri, copaci).
- Umbre doar de la lumina principală. Fără post-procesare.
- Țintă: 60 fps pe laptop, ≥ 30 fps pe telefon.
- Bundle-ul total sub 1 MB gzip.

## Rezultatul așteptat
- `src/scene/` (poți împărți `spike.ts` în module: `island.ts`, `buildings/*.ts`, `slots.ts`, `index.ts`). Șterge ce rămâne nefolosit din spike.
- `src/main.ts` **nu** e al tău (îl scrie P6). Ca să poți verifica vizual, lasă în raport un exemplu minimal de folosire a API-ului.
- **Raport:** `docs/handoff/P5-coder-raport.md`, cu API-ul final, harta sloturilor și deciziile de design.

## Constrângeri dure
- TypeScript strict, fără `any`, fără dependențe noi.
- Nu importa din `src/ui/**`. Din `src/game` importi doar tipuri.
- Paleta rămâne în `palette.ts`. Un singur accent puternic (electric), folosit doar pentru electricitate.

## Ce NU ai voie să atingi
`src/model/**`, `src/game/**`, `src/ui/**`, `src/main.ts`, `tests/**`, `docs/**` (în afară de raportul tău), config, `package.json`, `GATES.md`, `TASKS.md`. Nu rulezi comenzi.
