# Gates: Learn Energy · Hydro · Pelton, lessons 1-3

OWNS: learn/**, tests/learn/**, scripts/verify-learn-build.mjs, scripts/verify-learn-page.mjs, docs/learn/**, vite.config.ts, tsconfig.json, vitest.config.ts

Scope: the /learn/ page with lessons 1-3 playable, built from the approved variant A frame, with every simulator number checked against hand values and every on-screen claim backed by two sources.

- [ ] L0: this ledger states outcomes that can fail
  CHECK: node C:/Users/Lucian-PC/.claude/skills/unlazy/scripts/gate-lint.mjs docs/learn/pelton/GATES.md
  EXPECT: LINT OK
  EVIDENCE: pending

- [ ] L1: the lesson simulator and data tests pass, including the hand values 14.13 kW, 27.9 mm/s and 3.58 m
  CHECK: npx vitest run tests/learn
  EXPECT: Test Files\s+\d+ passed
  EVIDENCE: pending

- [ ] L2: the whole codebase, including learn/, type-checks under strict mode
  CHECK: node scripts/verify-types.mjs
  EXPECT: type verification passed
  EVIDENCE: pending

- [ ] L3: the production build emits dist/learn/index.html alongside the main page
  CHECK: node scripts/verify-learn-build.mjs
  EXPECT: learn build verification passed
  EVIDENCE: pending

- [ ] L4: in headless Chrome, lessons 1-3 load with no console errors, a non-blank scene, at least 4 callouts, the credit line, and simulator outputs that match the hand values when the inputs are set
  CHECK: node scripts/verify-learn-page.mjs
  EXPECT: learn page verification passed
  EVIDENCE: pending

- [x] L5: Lucian has seen screenshots of lessons 1-3 and approved them against frame/hydro-frame.png
  MANUAL: Lucian approves the three screenshots
  EVIDENCE: Lucian, 23-10-2026: „toate acele frames arata foarte bine”
