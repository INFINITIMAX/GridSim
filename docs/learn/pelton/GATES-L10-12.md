# Gates: Learn Energy · Hydro · Pelton, lessons 10-12

OWNS: learn/**, tests/learn/**, scripts/verify-learn-page.mjs, docs/learn/**, docs/handoff/L4-*

Scope: lessons 10-12 (Generator, Load controller, The whole chain) playable on /learn/, in the approved variant A layout. Every simulator formula reproduces its external example within the tolerance stated in its lesson file, and every on-screen claim is backed by two sources. Lessons 1-9 must keep working.

- [x] M0: this ledger states outcomes that can fail
  CHECK: node C:/Users/Lucian-PC/.claude/skills/unlazy/scripts/gate-lint.mjs docs/learn/pelton/GATES-L10-12.md
  EXPECT: LINT OK
  EVIDENCE: gate-lint: LINT OK (3 warnings: manual gates), 23-10-2026

- [x] M1: the lesson tests are green, including ESHA table 6.5 within 1 rpm, the 28-pole Kaplan example within 0.5 percent, the analytic runaway curve within 0.01 Hz, the NRCan 14.7 kW and Holland 18 kW examples within their tolerances
  CHECK: npx vitest run tests/learn
  EXPECT: Test Files\s+\d+ passed
  EVIDENCE: learn tests green after the planner fixed one cross-lesson claim (B3 on L11); full suite 522/522 in 22 files, 23-10-2026

- [x] M2: the whole codebase, including learn/, type-checks under strict mode
  CHECK: node scripts/verify-types.mjs
  EXPECT: type verification passed
  EVIDENCE: type verification passed, 23-10-2026

- [x] M3: the production build still emits dist/learn/index.html alongside the main page
  CHECK: node scripts/verify-learn-build.mjs
  EXPECT: learn build verification passed
  EVIDENCE: learn build verification passed, 23-10-2026

- [x] M4: in headless Chrome, all 12 lessons load with no console errors and a non-blank scene; lessons 10-12 show the hand-computed outputs from their lesson files, and the ELC switch changes the 10-second frequency
  CHECK: node scripts/verify-learn-page.mjs
  EXPECT: learn page verification passed
  EVIDENCE: learn page verification passed (all 12 lessons), 23-10-2026, re-run after the text touch-ups

- [x] M5: a planted bug in each new formula (frequency, governor, chain) makes at least one test fail, and the file is restored afterwards
  MANUAL: the planner plants each mutation, runs npx vitest run tests/learn, records the failing test names, and restores the file
  EVIDENCE: generator.ts /120 to /60: 7 failing; governor.ts w(2-w) to (2-w): 8 failing; chain.ts 8760 to 8700: 9 failing; files restored, 522/522 green again, 23-10-2026

- [x] M6: Lucian has seen lessons 10-12 and approved them
  MANUAL: Lucian approves the three lessons
  EVIDENCE: Lucian, 23-10-2026: „ok, imi place”
