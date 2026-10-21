# Plan: GridSim, felia verticală
Status: draft (21-10-2026). Surse: `docs/intent.md`, `docs/spec.md`. Criterii de acceptare: `GATES.md` (rădăcina repo-ului).

## Ordinea task-urilor

| # | Task | Cine | Depinde de | Rezultat |
|---|---|---|---|---|
| P0 | **Verificarea surselor**: SO GL (FCR, aFRR, UFLS, limite de frecvență), H pe tehnologie, autoreglajul sarcinii D, vitezele de variație, CO₂. Calculele de mână pentru T1–T4. | planner | — | `docs/calcule.md` cu citări |
| P1 | **Scaffold**: Vite + TS strict + three.js + Vitest + Playwright; `.npmrc` cu cache pe D:, browserele Playwright pe D:, LICENSE MIT, `.gitignore`, `AGENTS.md` cu comenzile proiectului | planner (direct, < 30 linii de config) | — | proiectul pornește cu `npm run dev` |
| P1b | **Spike vizual**: o singură scenă statică (insulă, 3 clădiri, o centrală, un stâlp), low-poly din primitive, ca să validăm aspectul înainte de investiție | coder → planner | P1 | o captură aprobată de Lucian |
| P2 | **Modelul fizic** (cornerstone): unități, swing equation, FCR, aFRR, protecții, baterie, determinism | coder → tester → reviewer | P0, P1 | `src/model/` + T1–T4, T6, T7 verzi |
| P3 | **Date**: snapshot ENTSO-E pentru o zi din România → `data/ro-day.csv` + loader + T5 | planner (descărcare) + coder | P2 | T5 verde |
| P4 | **Nivelul 1 + sandbox**: script de evenimente, scor (stele după nadir), stări (joc, game over) | coder → tester → reviewer | P2 | `src/game/` testat |
| P5 | **Scena 3D**: diorama completă, clădiri, centrale animate, luminile care se sting la UFLS, controale cameră desktop și telefon | coder → tester → reviewer | P1b, P4 | `src/scene/` |
| P6 | **UI**: cadranul de frecvență, bara producție/consum, graficul pe 60 s, meniul de construcție, ecranul „How real is this?”, game over | coder → tester → reviewer | P4 | `src/ui/` |
| P7 | **Verificare end-to-end**: scripturile `scripts/verify-*.mjs` (planner) + testele Playwright (tester) | planner + tester | P5, P6 | toate gate-urile runnable verzi |
| P8 | **Review**: `docs/REVIEW.md` pe bug-uri, securitate/date, conformitate cu spec + gate-urile manuale jucate de Lucian | planner + Lucian | P7 | REVIEW.md, gate-uri manuale bifate |
| P9 | **Deploy gate**: creare repo public pe GitHub + Vercel | planner, **doar după aprobarea explicită a lui Lucian** | P8 | URL public |

P5 și P6 pot merge în paralel după P4 (fișiere disjuncte: `src/scene/**` vs. `src/ui/**`).

## Fluxul de lucru
- Fiecare task cu coder/tester/reviewer are brief în `docs/handoff/<P#>-<rol>.md` și raport în `docs/handoff/<P#>-<rol>-raport.md`. Verdictul reviewer-ului îl transcrie planner-ul integral.
- `TASKS.md` e indexul de stare. După fiecare pas: commit + actualizare `TASKS.md` („în lucru”), ca orice agent să poată continua.
- Doar planner-ul rulează comenzi (PowerShell).

## Riscuri
| Risc | Impact | Atenuare |
|---|---|---|
| Parametri fizici greșiți (scriși din memorie) | modelul învață ceva fals | P0 înaintea oricărui cod; fiecare parametru cu sursă în `units.ts` (G4) |
| 3D din primitive arată ieftin | produsul nu „prinde” pe X | spike P1b devreme; design pass cu `design-taste-frontend`; Blender/Spline mai târziu |
| Performanță slabă pe telefon | experiență proastă pentru mulți utilizatori | geometrie instanțiată, umbre simple, test pe telefonul lui Lucian (G11) |
| Accesul la date ENTSO-E cere cont | P3 blocat | export CSV manual de pe site; Lucian își face cont gratuit dacă e nevoie |
| Scope creep (niveluri, quiz, topologie) | felia nu se termină | tot ce nu e în spec merge în „după felie” |
| Cache-uri pe C: (npm, Playwright) | încalcă regula globală | `.npmrc` + `PLAYWRIGHT_BROWSERS_PATH`, verificat de G13 |

## Dovada
Felia e gata doar când `node <unlazy>/scripts/gate-check.mjs --reverify GATES.md` raportează toate gate-urile runnable îndeplinite și Lucian a bifat gate-urile manuale (G11, G16, G17). Deploy-ul (P9) e un pas separat, după aprobare.
