# Gates: Learn Energy · Hydro · Pelton, lessons 4-6

OWNS: learn/**, tests/learn/**, scripts/verify-learn-page.mjs, docs/learn/**, docs/handoff/L2-*

Scope: lessons 4-6 (Penstock, Valve & water hammer, Nozzle & spear) playable on /learn/, in the approved variant A layout, with every simulator formula reproducing the ESHA and LMU worked examples and every on-screen claim backed by two sources. Lessons 1-3 must keep passing.

- [x] M0: this ledger states outcomes that can fail
  CHECK: node C:/Users/Lucian-PC/.claude/skills/unlazy/scripts/gate-lint.mjs docs/learn/pelton/GATES-L4-6.md
  EXPECT: LINT OK
  EVIDENCE: gate-lint: LINT OK (3 warnings: manual gates), 23-10-2026

- [x] M1: the lesson tests pass, including the ESHA examples 2.5, 5.7 and 5.9 and the LMU jet example, each within its stated tolerance
  CHECK: npx vitest run tests/learn
  EXPECT: Test Files\s+\d+ passed
  EVIDENCE: 94/94 tests in 7 files pass, 23-10-2026

- [x] M2: the whole codebase, including learn/, type-checks under strict mode
  CHECK: node scripts/verify-types.mjs
  EXPECT: type verification passed
  EVIDENCE: type verification passed, 23-10-2026

- [x] M3: the production build still emits dist/learn/index.html alongside the main page
  CHECK: node scripts/verify-learn-build.mjs
  EXPECT: learn build verification passed
  EVIDENCE: learn build verification passed, 23-10-2026

- [x] M4: in headless Chrome, lessons 1-6 load with no console errors and a non-blank scene; lessons 4-6 show hf 0.98 m and net 59.0 m, c 1024.7 m/s and surge 4.02 m at 5 s, jet 33.3 m/s and 41.9 L/s, and the warnings and the deflector note switch on and off with the inputs
  CHECK: node scripts/verify-learn-page.mjs
  EXPECT: learn page verification passed
  EVIDENCE: learn page verification passed (lessons 1-6), 23-10-2026, after the planner moved the L4 cotes

- [x] M5: a planted bug in each new formula (friction, wave speed, jet speed) makes at least one test fail, and the file is restored afterwards
  MANUAL: the planner plants each mutation, runs npx vitest run tests/learn, records the failing test names, and restores the file
  EVIDENCE: friction.ts 5.74→5.0: 4 failing; hammer.ts 2L→L: 5 failing; jet.ts 2g→g: 7 failing; files restored and 94/94 again, 23-10-2026

- [x] M6: Lucian has seen screenshots of lessons 4-6 and approved them
  MANUAL: Lucian approves the three screenshots
  EVIDENCE: Lucian, 23-10-2026: „totul arata foarte bine”
