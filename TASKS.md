# TASKS

Index de stare. Detalii: `docs/plan.md`; predări: `docs/handoff/`.

| # | Task | Cine | Stare |
|---|---|---|---|
| — | intent.md + spec.md | planner + Lucian | aprobat 21-10-2026 |
| — | plan.md + GATES.md | planner | aprobat 21-10-2026 |
| P0 | Verificarea surselor → docs/calcule.md | planner | gata 21-10-2026 (4 surse secundare de reverificat înainte de lansare) |
| P1 | Scaffold | planner | gata 21-10-2026 (build 118 KB gzip, vitest OK) |
| P1b | Spike vizual | coder → planner | gata, aprobat de Lucian 21-10-2026 |
| P2 | Model fizic (cornerstone) | coder → tester → reviewer | gata: 20/20 teste, reviewer ACCEPTAT |
| P2b | Teste protecții + corecturi neblocante | coder → tester → reviewer | gata: 41/41 teste, reviewer ACCEPTAT |
| P4a | Extensii model: FFR baterii, preset insulă, prioritate FCR, setSetpoint limitat | coder → tester → reviewer | gata: 65/65, reviewer ACCEPTAT (bug ciclu limită găsit de tester și reparat) |
| P3 | Date ENTSO-E | planner + coder | **blocat: Lucian își face cont gratuit ENTSO-E** (Energy-Charts interzice redistribuirea) |
| P4 | Nivelul 1 + sandbox | coder → tester → reviewer | gata: 145/145 (model+joc), reviewer ACCEPTAT |
| P4b | tripUnit, plafon log, redenumire, teste sandbox | coder → tester → reviewer | coder + tester gata, 164/164; review împreună cu P5/P6 |
| P5 | Scena 3D | coder → tester → reviewer | **coder în lucru** |
| P6 | UI + main.ts | coder → tester → reviewer | coder gata; integrare după P5 (forceTrip de legat) |
| P7 | Verificare e2e | planner + tester | de făcut |
| P8 | Review + gate-uri manuale | planner + Lucian | de făcut |
| P9 | Deploy (GitHub public + Vercel) | planner, după aprobare | de făcut |

## Learn Energy · Hydro · Pelton (din 22-10-2026)

Detalii: `docs/learn/pelton/plan.md`; criterii: `docs/learn/pelton/GATES.md`.

| # | Task | Cine | Stare |
|---|---|---|---|
| L0 | Programa, sursele, conținutul lecțiilor 1–3 | planner + Lucian | gata, aprobat 22-10-2026 |
| L-a | Configurare build/test pentru learn/ | planner | gata 22-10-2026 |
| L-b | Pagina /learn/, lecțiile 1–3 | coder (+ ajustări vizuale planner) | gata 22-10-2026 |
| L-c | Teste tests/learn/ | tester | gata: 38/38, mutația g=10 prinsă |
| L-d | Review | reviewer | ACCEPTAT, neblocantele 1–6 + 12 rezolvate |
| L-e | Scripturi de verificare + gate-uri + capturi | planner | L0–L5 trec (L5 aprobat de Lucian 23-10-2026) |

### Lecțiile 4–6 (din 23-10-2026)

Criterii: `docs/learn/pelton/GATES-L4-6.md`; predări: `docs/handoff/L2-*`.

| # | Task | Cine | Stare |
|---|---|---|---|
| L2-0 | Surse, conținut lectia-04..06, plan, gate-uri | planner | gata 23-10-2026 |
| L2-a | Codul lecțiilor 4–6 (sim, scene, UI) | coder (+ cotele L4 mutate de planner) | gata 23-10-2026 |
| L2-b | Testele (după specificație, în paralel cu coder-ul) | tester | gata: 94/94, 3 mutații prinse |
| L2-c | Review | reviewer | ACCEPTAT 23-10-2026, doar neblocante |
| L2-d | verify-learn-page extins la 1–6, rulare gate-uri, capturi | planner | M0–M6 trec; M6 APROBAT de Lucian 23-10-2026 |

### Lecțiile 7–9 (din 23-10-2026)

Criterii: `docs/learn/pelton/GATES-L7-9.md`; predări: `docs/handoff/L3-*`. Pachetul 2 (lecțiile 10–12) vine după aprobarea acestuia.

| # | Task | Cine | Stare |
|---|---|---|---|
| L3-0 | Surse (S19, S20), conținut lectia-07..09, plan, gate-uri | planner | gata 23-10-2026 |
| L3-a | Codul lecțiilor 7–9 (sim, scene, UI) | coder | gata 23-10-2026 |
| L3-b | Testele (după specificație, în paralel cu coder-ul) | tester | gata: 188/188 (cu N2 adăugat de planner), 3 mutații prinse |
| L3-c | Review | reviewer | ACCEPTAT 23-10-2026, doar neblocante (N1, N2 rezolvate) |
| L3-d | verify-learn-page extins la 1–9, rulare gate-uri, capturi | planner | M0–M6 trec; M6 APROBAT de Lucian 23-10-2026 |

### Lecțiile 10–12 (din 23-10-2026)

Criterii: `docs/learn/pelton/GATES-L10-12.md`; predări: `docs/handoff/L4-*`.

| # | Task | Cine | Stare |
|---|---|---|---|
| L4-0 | Surse (S21, S13 extins; S5/S6 înlocuite), conținut lectia-10..12, plan, gate-uri | planner | gata 23-10-2026 |
| L4-a | Codul lecțiilor 10–12 (sim, scene, UI) | coder | gata 23-10-2026 |
| L4-b | Testele (după specificație, în paralel cu coder-ul) | tester | gata: suita completă 522/522, 3 mutații prinse |
| L4-c | Review | reviewer | ACCEPTAT 23-10-2026, doar neblocante |
| L4-d | verify-learn-page extins la 1–12, rulare gate-uri, capturi | planner | M0–M5 verzi; M6 = aprobarea lui Lucian |
