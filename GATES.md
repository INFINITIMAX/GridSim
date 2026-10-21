# Gates: GridSim vertical slice (level 1 + sandbox)

OWNS: src/**, scripts/**, tests/**, data/**, docs/**, public/**, index.html, package.json, package-lock.json, tsconfig.json, vite.config.ts, vitest.config.ts, playwright.config.ts, .npmrc, .gitignore, LICENSE, AGENTS.md, TASKS.md, GATES.md

Scope: a playable level-1 grid simulator in the browser, built on a physics model that reproduces hand calculations, with every runnable claim checked by a repository script.

- [ ] G0: this ledger states outcomes that can fail
  CHECK: node C:/Users/Lucian-PC/.claude/skills/unlazy/scripts/gate-lint.mjs GATES.md
  EXPECT: LINT OK
  EVIDENCE: pending

- [ ] G1: production build succeeds and the gzipped JS+CSS bundle is under 1 MB
  CHECK: node scripts/verify-build.mjs
  EXPECT: build verification passed
  EVIDENCE: pending

- [ ] G2: the whole codebase type-checks under TypeScript strict mode with zero errors
  CHECK: node scripts/verify-types.mjs
  EXPECT: type verification passed
  EVIDENCE: pending

- [ ] G3: model tests T1-T7 exist by name and all pass (ROCOF, reference incident, UFLS recovery, aFRR restore, duck curve, battery energy, determinism)
  CHECK: node scripts/verify-model.mjs
  EXPECT: model verification passed
  EVIDENCE: pending

- [ ] G4: every generator type in the unit catalog carries a primary-source citation URL that also appears in docs/calcule.md
  CHECK: node scripts/verify-sources.mjs
  EXPECT: source verification passed
  EVIDENCE: pending

- [ ] G5: src/model imports nothing from three.js or the DOM, and the purity scanner rejects a planted positive-control file
  CHECK: node scripts/verify-purity.mjs
  EXPECT: purity verification passed
  EVIDENCE: pending

- [ ] G6: in a real browser the app loads with a non-blank WebGL canvas, zero console errors, and adding a gas plant raises the HUD supply figure
  CHECK: node scripts/verify-e2e.mjs smoke
  EXPECT: e2e smoke passed
  EVIDENCE: pending

- [ ] G7: forcing a large generation loss triggers load shedding at 49.0 Hz, the HUD reports it, and the number of lit buildings in the scene drops
  CHECK: node scripts/verify-e2e.mjs ufls
  EXPECT: e2e ufls passed
  EVIDENCE: pending

- [ ] G8: frequency falling below 47.5 Hz ends the run with a game-over screen that explains the blackout
  CHECK: node scripts/verify-e2e.mjs blackout
  EXPECT: e2e blackout passed
  EVIDENCE: pending

- [ ] G9: level 1 plays its three scripted events end to end and awards stars computed from the measured frequency nadir
  CHECK: node scripts/verify-e2e.mjs level1
  EXPECT: e2e level1 passed
  EVIDENCE: pending

- [ ] G10: at 390 px width the page has no horizontal scroll and the frequency dial and build menu are visible
  CHECK: node scripts/verify-e2e.mjs mobile
  EXPECT: e2e mobile passed
  EVIDENCE: pending

- [ ] G11: Lucian measures at least 60 fps on his laptop and at least 30 fps on his phone with the in-app fps counter during level 1
  EVIDENCE: pending

- [ ] G12: the How real is this screen opens from the HUD and states that Romania is synchronised with continental Europe
  CHECK: node scripts/verify-e2e.mjs honesty
  EXPECT: e2e honesty passed
  EVIDENCE: pending

- [ ] G13: npm cache and Playwright browsers resolve to the D: drive, not C:
  CHECK: node scripts/verify-env.mjs
  EXPECT: env verification passed
  EVIDENCE: pending

- [ ] G14: no tracked file contains a token or key pattern, .env is git-ignored, and the scanner flags a planted positive-control secret
  CHECK: node scripts/verify-secrets.mjs
  EXPECT: secrets verification passed
  EVIDENCE: pending

- [ ] G15: the repository has an MIT LICENSE file naming the copyright holder and year
  CHECK: node scripts/verify-license.mjs
  EXPECT: license verification passed
  EVIDENCE: pending

- [ ] G16: Lucian plays level 1 without help and can explain afterwards why frequency falls when demand outruns supply
  EVIDENCE: pending

- [ ] G17: Lucian compares the app side by side with learn-arduino-red.vercel.app and confirms no copied layout, assets or code
  EVIDENCE: pending
