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
