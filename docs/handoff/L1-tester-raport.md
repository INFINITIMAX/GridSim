# L1 · tester — raport

Nu am rulat nimic. Comanda pentru planner: `npx vitest run tests/learn` (apoi `npm run typecheck`, pentru importurile `?raw` .md).

## Fișiere (în `tests/learn/`) și mutațiile prinse

- `power.test.ts`: valorile de mână (14,13; 14,72; 19,62 = 19,62 în ±0,5%), liniaritate în H, Q, e, zero. Pică la: g = 10 (+2%... 14,13 -> 14,40, peste 0,5%), g = 9,8 doar în limită (nu garantat), P = Q·H/e, Q în m³/s neîmpărțit la 1000, H la pătrat.
- `settling.test.ts`: vD(0,2) ≈ 27,9; control Ruby & Zanke (implementat în test) la 0,1/0,2/0,3/0,5 mm; monotonie; L 3,58 / 2,87; L ∝ 1/B, ∝ Q, ∝ 1/vD; pragul B > L/8 (strict). Pică la: constantă greșită în Zanke (157, 100/9, −1), L = Q·vD/B, L fără conversie de unități, `>=` în loc de `>`, B > L/4.
- `order.test.ts`: lista de 7 scrisă de mână; corect trece; toate cele 21 de swap-uri pică; invers, lungime greșită (6, 8, 0), ID necunoscut, duplicat. Pică la: PLANT_ORDER cu două piese schimbate, verificare doar pe prefix/lungime, comparație care ignoră poziția.
- `lessons.test.ts`: 12 titluri distincte; 3 lecții deblocate, `title` = `LESSON_TITLES[n-1]`; per lecție ≥ 4 callout-uri și 4 tab-uri nevide (rows, parts, how, specs); orice text nevid are claims; fiecare ID folosit există ca rând `| ID |` în secțiunea „Afirmații și surse” a md-ului lecției și nu conține „de găsit”; A11, A12, B5, C8 absente. Pică la: ID inventat/greșit de lecție, folosirea lui A11/C8 (prin „de găsit”) sau B5 (prin lista explicită), callout scos sub 4, tab golit, text fără claim. Include un control: rândul A11 chiar conține „de găsit” (dovedește că detecția funcționează).

## Control Ruby & Zanke, calculat de mână (ν = 1e-6, Δ = 1,65, g = 9,81, constante 10,36 și 1,049)

| d (mm) | Ruby&Zanke | Zanke din cod | diferență |
|---|---|---|---|
| 0,1 | 7,89 | 8,40 | +6,5% |
| 0,2 | 26,2 | 27,89 | +6,5% |
| 0,3 | 44,8 | 47,74 | +6,7% |
| 0,5 | 73,7 | 78,70 | +6,8% |

Toate în ±10%, deci testul ar trebui să treacă. Atenție: brief-ul dă 25,7 mm/s la 0,2 mm; eu obțin 26,2 cu forma standard (10,36; 1,049). Diferența de 2% vine probabil din alte constante/temperatură; nu schimbă verdictul (+8,5% față de 25,7, tot sub 10%). Calcule manuale, aproximative: planner-ul vede valorile reale la rulare.

## Nu am acoperit

- `ui.ts`, `main.ts`, scene 3D: DOM/WebGL, nu rulează în `environment: node`; le acoperă verificarea cu browser headless a planner-ului.
- Intrări invalide pentru fizică (d ≤ 0, B = 0): codul nu le tratează (d = 0 dă NaN, B = 0 dă Infinity); brief-ul nu cere comportament, deci nu am fixat unul.
- Textele nu sunt comparate verbatim cu md-ul (md-ul are în parte descrieri în română); verific doar ID-urile.

## Suspiciuni de bug

- Nicio eroare de formulă găsită. Observație: L3 Parts are intrarea „Spillway” cu `text: ""` și `claims: []`; testul „orice text nevid are claims” o exceptează explicit, deci nu pică. Dacă planner-ul o scoate, testele rămân valide.
- `intro.claims` pentru L1 (A6, A8, A10) și L3 (C1, C3, C4) sunt alese de coder; testele verifică doar că există și nu sunt „de găsit”, nu că sprijină textul (decizie de conținut pentru reviewer).
