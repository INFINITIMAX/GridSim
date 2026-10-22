# L1 · tester — teste pentru `learn/sim/` și `learn/lessons.ts`

Planner: Claude. Data: 22-10-2026. Raportul îl scrii în `docs/handoff/L1-tester-raport.md`.

## Sarcina

Scrie testele Vitest din `tests/learn/` pentru codul livrat de coder în `learn/sim/*.ts` și `learn/lessons.ts`. Brief-ul coder-ului: `docs/handoff/L1-coder.md`; raportul lui: `docs/handoff/L1-coder-raport.md`.

## Ce trebuie să acopere testele

1. **Valori de mână** din `docs/learn/pelton/lectia-02.md` și `lectia-03.md` (toleranță ±0,5% pentru calcule exacte):
   - `powerKW(60, 40, 0.6)` ≈ 14,13; `powerKW(10, 300, 0.5)` ≈ 14,72; `powerKW(100, 20, 1)` = `powerKW(10, 200, 1)` ≈ 19,62;
   - `zankeVdMmS(0.2)` ≈ 27,9;
   - `trapLengthM(40, 27.9, 0.4)` ≈ 3,58; `trapLengthM(40, 27.9, 0.5)` ≈ 2,87;
   - `widthTooLarge(0.5, 2.87)` = true; `widthTooLarge(0.4, 3.58)` = false.
2. **Controlul cu a doua sursă:** formula Ruby & Zanke din S10 (ν = 1·10⁻⁶ m²/s, Δ = 1,65, g = 9,81), implementată **în test**, independent de cod, dă 25,7 mm/s la 0,2 mm. Testul cere ca `zankeVdMmS` să fie în ±10% de ea pe d ∈ {0,1; 0,2; 0,3; 0,5} mm. Calculează și notează în raport diferența pe fiecare punct; dacă vreunul iese din ±10%, testul trebuie să pice (nu lărgi toleranța).
3. **Proprietăți** care prind erori de formulă: puterea e liniară în fiecare argument (dublezi H sau Q și se dublează P); vD crește monoton cu d; L scade invers proporțional cu B.
4. **`order.ts`:** ordinea corectă trece; orice permutare cu două piese inversate pică; lungime greșită sau ID-uri necunoscute pică.
5. **Integritatea afirmațiilor:** pentru lecțiile 1–3 din `lessons.ts`, fiecare ID de afirmație folosit:
   - există ca rând `| ID |` în tabelul „Afirmații și surse” din `docs/learn/pelton/lectia-0N.md`;
   - rândul nu conține „de găsit”.

   Citește markdown-ul cu importul Vite `?raw` (de ex. `import md1 from "../../docs/learn/pelton/lectia-01.md?raw"`). Repo-ul nu are `@types/node`, deci **fără `node:fs`**.
6. **Lecțiile:** 12 lecții, primele 3 deblocate, fiecare dintre ele cu ≥ 4 callout-uri și cele 4 tab-uri nevide.

## Constrângeri

- Testele trebuie să poată pica: dacă înlocuiești o formulă cu una greșită (de ex. g = 10, sau L = Q·vD/B), cel puțin un test pică. În raport, scrie pentru fiecare fișier de test ce mutație ar prinde.
- Fără teste redundante (aceeași aserțiune de două ori) și fără teste care trec indiferent de cod.
- Nu modifica nimic în afara `tests/learn/` și a raportului tău.

Nu rulezi comenzi; planner-ul rulează testele și îți întoarce rezultatul.
