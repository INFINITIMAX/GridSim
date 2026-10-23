# Gates: Learn Energy · Hydro · Pelton, lessons 7-9

OWNS: learn/**, tests/learn/**, scripts/verify-learn-page.mjs, docs/learn/**, docs/handoff/L3-*

Scope: lessons 7-9 (Pelton runner, Efficiency, Speed size choice) playable on /learn/, in the approved variant A layout. Every simulator formula reproduces its external worked example or published curve within the tolerance stated in its lesson file, and every on-screen claim is backed by two sources. Lessons 1-6 must keep passing.

- [x] M0: this ledger states outcomes that can fail
  CHECK: node C:/Users/Lucian-PC/.claude/skills/unlazy/scripts/gate-lint.mjs docs/learn/pelton/GATES-L7-9.md
  EXPECT: LINT OK
  EVIDENCE: gate-lint: LINT OK (3 warnings: manual gates), 23-10-2026

- [x] M1: the lesson tests pass, including the LMU bucket example within 1 percent, both ESHA specific-speed examples within 1 percent, the JICA part-load drop between 2 and 3 percent, and the ESHA figure 6.30 curve within 8 points
  CHECK: npx vitest run tests/learn
  EXPECT: Test Files\s+\d+ passed
  EVIDENCE: 188/188 tests in 10 files green (187 plus the reviewer's N2 test), 23-10-2026; full suite 436/436

- [x] M2: the whole codebase, including learn/, type-checks under strict mode
  CHECK: node scripts/verify-types.mjs
  EXPECT: type verification passed
  EVIDENCE: type verification passed, 23-10-2026

- [x] M3: the production build still emits dist/learn/index.html alongside the main page
  CHECK: node scripts/verify-learn-build.mjs
  EXPECT: learn build verification passed
  EVIDENCE: learn build verification passed, 23-10-2026

- [x] M4: in headless Chrome, lessons 1-9 load with no console errors and a non-blank scene; lessons 7-9 show the hand-computed outputs from their lesson files and the verdict changes with speed and jets
  CHECK: node scripts/verify-learn-page.mjs
  EXPECT: learn page verification passed
  EVIDENCE: learn page verification passed (lessons 1-9), 23-10-2026, re-run after the nQE text fix

- [x] M5: a planted bug in each new formula (bucket efficiency, RETScreen curve, specific speed) makes at least one test fail, and the file is restored afterwards
  MANUAL: the planner plants each mutation, runs npx vitest run tests/learn, records the failing test names, and restores the file
  EVIDENCE: bucket.ts φ=θ: 9 failing; efficiency.ts coefficient under the power: 16 failing; specific.ts (gH)^0.75→H^0.75: 8 failing; files restored and 187/187 again, 23-10-2026

- [x] M6: Lucian has seen lessons 7-9 and approved them
  MANUAL: Lucian approves the three lessons
  EVIDENCE: Lucian, 23-10-2026: „aprob”
