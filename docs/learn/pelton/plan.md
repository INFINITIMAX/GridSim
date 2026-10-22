# Plan: Learn Energy · Hydro · Pelton — lecțiile 1–3

Stare: de aprobat de Lucian (22-10-2026). Conținut: `lectia-01.md`, `lectia-02.md`, `lectia-03.md`. Surse: `surse.md`. Criterii: `GATES.md` (acest folder).

## Ce livrăm

Pagina `/learn/` din GridSim cu lecțiile 1–3 jucabile; lecțiile 4–12 apar în listă, blocate.
- **Layout:** varianta A, aprobată 22-10-2026, cu referința vizuală `frame/hydro-frame.png`:
  - stânga: coloana de lecții;
  - sus: bara de progres cu 12 segmente;
  - centru: scena 3D cu callout-uri;
  - dreapta: panoul cu tab-uri și simulatorul;
  - jos-stânga: creditul pentru Learn Arduino.
- **Fără elementele specifice lui Dilum:** ceas, bară de iconuri, pastila de comenzi.
- **Tehnologie:** three.js simplu + TypeScript strict, ca restul repo-ului. Fără React: repo-ul nu îl are, iar style frame-ul aprobat e deja scris în three.js simplu. Abatere de la promptul inițial („React Three Fiber”), semnalată.

## Structura de fișiere (o deține coder-ul, cu excepțiile de mai jos)

```
learn/index.html, learn/style.css, learn/main.ts
learn/toon.ts           helperi de desen (contur ink, muchii, piese), portați din frame
learn/scenes/plant.ts   diorama centralei (L1, L2)
learn/scenes/intake.ts  priza + deznisipatorul (L3)
learn/scenes/pelton.ts  agregatul Pelton (miniaturi L5–L12, lecțiile viitoare)
learn/lessons.ts        datele lecțiilor (texte, callout-uri, ID-uri de afirmații)
learn/sim/power.ts      L2: P = Q·H·g·e
learn/sim/settling.ts   L3: viteza Zanke (ESHA 5.8), lungimea L = Q/(vD·B), avertismentul B > L/8
learn/sim/order.ts      L1: verificarea ordinii pieselor
learn/ui.ts             panou, tab-uri, callout-uri, simulatoare
```

- `learn/sim/` e TypeScript pur: fără three.js, fără DOM, ca `src/model/`.
- Tester-ul deține `tests/learn/`.
- Planner-ul deține `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `scripts/verify-learn-*.mjs` și documentele.

## Contractul DOM (pe el se bazează scripturile de verificare)

- `window.__learnReady === true` după prima randare a lecției curente.
- `?lesson=N` deschide lecția N.
- `#lesson-list .lesson[data-n]`, cu `.on` pe cea curentă și `.lock` pe cele blocate.
- `#callouts .callout` (≥ 4 pe lecție) și `#tabs [data-tab=overview|parts|how|specs]`.
- `#sim input[name=…]`:
  - L2: `head`, `flow`, `eff`;
  - L3: `flow`, `grain`, `width`.
- `#sim [data-out=…]`:
  - L2: `power`;
  - L3: `vd`, `length`, `warn`.
- L1: `#sim [data-order]` cu cardurile pieselor și butonul `[data-check]`.
- `.credit` conține textul „Learn Arduino” și „Dilum Sanjaya”; `canvas#gl` e scena.

## Ordinea (fluxul de 4 agenți)

1. **L-a (planner):** configurări (`tsconfig` include `learn`, `vitest` include `tests/learn`, `vite` are input `learn/index.html`). Gata înainte de coder.
2. **L-b (coder):** tot `learn/`, după brief-ul `docs/handoff/L1-coder.md`.
3. **L-c (tester):** `tests/learn/` (valori de mână din lecții + integritatea datelor: fiecare ID de afirmație folosit în `lessons.ts` există în tabelul lecției și nu e marcat „de găsit”), după `docs/handoff/L1-tester.md`.
4. **L-d (reviewer):** cod + teste; verdict transcris în `docs/handoff/L1-reviewer-raport.md`.
5. **L-e (planner):** `scripts/verify-learn-build.mjs` și `scripts/verify-learn-page.mjs`, rularea gate-urilor, capturi de ecran pentru Lucian.

## Riscuri

- **Diorama L1–L2 e cel mai mare model nou.** Riscul e să alunece spre „hartă”. Regula: un bloc de teren mic, citit ca obiect, la scara agregatului din frame.
- **Afirmațiile marcate „de găsit”** (A1-pagină, A11, A12, B5, C8) nu au voie în UI până nu au a doua sursă. Gate-ul o verifică.
- **Performanța:** conturul cu „inverted hull” dublează geometria. Țintă: < 40 ms pe cadru în Chrome headless; altfel se reduce numărul de segmente.

---

# Plan: lecțiile 4–6 (din 23-10-2026)

Conținut: `lectia-04.md`, `lectia-05.md`, `lectia-06.md`. Surse noi: S7, S12–S18 în `surse.md`. Criterii: `GATES-L4-6.md`. Predări: `docs/handoff/L2-*`.

## Fișiere noi sau schimbate (coder)

```
learn/sim/friction.ts   L4: V, Re, f (Swamee–Jain), hf (Darcy–Weisbach)
learn/sim/hammer.ts     L5: c (ESHA 5.22), Tc = 2L/c, Joukowsky, Allievi plafonat la Joukowsky
learn/sim/jet.ts        L6: v = Cv·√(2gH), Q = v·A·deschidere
learn/scenes/penstock.ts  versantul cu conducta (L4, L5): cameră de încărcare, conductă, blocuri de ancoraj, vană, agregat, linia de energie, unda de presiune, manometrul
learn/scenes/nozzle.ts    duza în secțiune (L6): corpul duzei, acul, jetul, deflectorul, cupele rotorului
learn/lessons.ts        L4–L6; UNLOCKED = 6
learn/ui.ts, learn/main.ts  trei simulatoare noi + legarea scenelor
```

Tester-ul: `tests/learn/friction.test.ts`, `hammer.test.ts`, `jet.test.ts`, plus `lessons.test.ts` extins la 6 lecții. Planner-ul: `scripts/verify-learn-page.mjs`.

## Contractul DOM, extins

- L4: `#sim input[name=flow|diameter|length]`, `#sim select[name=material]` cu valorile `pe|steel`; `#sim [data-out=velocity|f|loss|net|pct|warn]`.
- L5: `#sim input[name=time|length]`, `#sim select[name=material]` cu valorile `steel|pvc`; `#sim [data-out=c|tc|surge|max|mode|warn]`; butonul `#sim [data-run]` pornește animația.
- L6: `#sim input[name=head|opening]`, `#sim input[name=deflector]` (checkbox); `#sim [data-out=speed|flow|power|note]`, cu `note` vizibil doar cu deflectorul pus.
- Restul contractului (lecțiile 1–3) rămâne neschimbat.

## Riscuri

- **Linia de energie la scara reală e invizibilă.** O pierdere de 1,6 % din 60 m nu se vede pe ecran. Scena o exagerează vizual (de ex. ×5), iar Specs o declară „not to scale”.
- **Unda de presiune animată cu viteza reală durează 0,3 s,** prea repede ca să se vadă. Animația e încetinită și o etichetă spune „slowed down”.
- **Reutilizarea.** Agregatul vine din `scenes/pelton.ts` (`makeUnit`, `makeNozzle`), nu se redesenează.
