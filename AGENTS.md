# AGENTS.md: GridSim

Simulator 3D al rețelei electrice (Vite + TypeScript strict + three.js). Documente: `docs/intent.md`, `docs/spec.md`, `docs/plan.md`, `docs/calcule.md`; criterii: `GATES.md`; stare: `TASKS.md`; predări: `docs/handoff/`.

## Comenzi (PowerShell, din D:\GridSim; le rulează doar planner-ul)
- `npm run dev`: server local
- `npm run typecheck`: TypeScript strict
- `npm test`: Vitest (modelul și jocul)
- `npm run build`: typecheck + build de producție în `dist/`
- `npm run e2e`: Playwright cu Chrome-ul instalat (fără descărcare de browsere)
- Gate-uri: `node C:/Users/Lucian-PC/.claude/skills/unlazy/scripts/gate-check.mjs GATES.md`

## Reguli
- `src/model/` e TypeScript pur: fără three.js, fără DOM (G5). Pas fix de 50 ms, determinist.
- Orice parametru fizic din `src/model/units.ts` are `source` cu un URL care apare în `docs/calcule.md` (G4).
- Nimic pe C:. Cache-ul npm e în `D:\npm-cache` (`.npmrc`); Playwright folosește `channel: "chrome"`.
- Fără secrete în repo (e public). Tokenurile stau doar în `.env`.
- Nu copia layout, asset-uri sau cod de la learn-arduino-red.vercel.app.
- Fluxul de 4 agenți pentru task-uri peste ~50 de linii sau cornerstone; brief-urile și rapoartele sunt în `docs/handoff/`.

## Greșeli de evitat
- npm 12 blochează scripturile de instalare (de ex. postinstall-ul esbuild). Vite merge fără el, prin pachetul binar opțional `@esbuild/win32-x64`.
- PowerShell 5.1 `Set-Content -Encoding utf8` adaugă BOM, iar LICENSE și alte fișiere verificate strict pică. Editează cu Write/Edit sau din bash.
