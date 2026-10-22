# S5: raport coder

## Fișiere

- **`2d/explain.ts` (nou):**
  - `breakdown(setup, riverFlow, op): Breakdown` copiază valorile din `op`. `designFlow` vine din `sizeById`, `chain` din `GENERATOR_EFFICIENCY` și `1 − TRANSFORMER_LOSS`. Nu recalculează fizica.
  - `type SectionId`.
  - `SECTION_INFO: Record<SectionId, string>`, cu textele din brief, numerele interpolate din constante.
  - `ECO_FLOW` se afișează cu `toFixed(1)`. `RACK_MAX_LOSS·100` trece prin `Math.round`, ca să nu iasă 6.000000000000001. `CLOG_TIME_S/60` e 3.
- **`2d/panel.ts`:**
  - import din `./explain`;
  - `TEXT.calcNote` și `TEXT.stopped`;
  - în `.up-sticky`: buton `#up-calc-toggle` și blocul `#up-calc` (`<pre id="up-calc-rows">` plus linia `.up-muted`), ascuns implicit;
  - atribut `data-info="<id>"` pe cele 10 `<h3>`;
  - după `innerHTML`, o buclă adaugă butonul `.up-i` în `<h3>` și un `<div class="up-info" hidden>` imediat după el;
  - `calcRows(op)` se apelează în `render()` și umple `#up-calc-rows` prin `textContent`.
  - Starea deschis/închis e păstrată pentru că DOM-ul butoanelor și al cutiilor nu se reconstruiește la `render()`. Nu există variabile de stare separate.
- **`2d/style.css`:**
  - `.upgrade h3` devine flex;
  - `.up-i`, `.up-info`, `.up-info-simplified`, `.up-calc-toggle`, `.up-calc-rows`, `.up-calc-note`;
  - doar tokenuri existente; fundalul `.up-info` e `color-mix(in srgb, var(--panel) 70%, var(--line))`.

`hydro.ts`, `main.ts`, testele și `index.html` nu au fost atinse.

## Abateri și decizii

1. **Rândul Canal.** Brief-ul se contrazice:
   - regula spune că „Rândul Canal apare doar dacă există canalul”;
   - exemplul arată `0.00 canal` pe rândul Head, deși canalul lipsește (head brut = 5).
   - Am urmat regula: termenul `− X canal` apare pe rândul Head doar dacă `setup.canal`. Dacă vrei exemplul, e o schimbare de o linie în `calcRows`.
2. **Stil în plus.** `.up-calc-toggle` (buton-text în `--accent`, subliniat) nu era în brief. Fără el ar fi ieșit un buton implicit al browserului.
3. **Rotunjirea factorilor din lanț.** Pe rândul Power, 0.95 și 0.99 se afișează cu `fmt(x, 2)`.
4. **Rândul Turbine în caz de oprire.** Rândurile Water și Head rămân; doar Turbine și Power sunt înlocuite cu rândul de oprire.

## De verificat

- `tsc` (importuri, `noUncheckedIndexedAccess` la `SECTION_INFO[...]`).
- Vizual în panou:
  - exemplul din brief (Kaplan medium ×1, baraj 5, debit 3, fără scara de pești) trebuie să dea `77.9 kW`;
  - un caz cu oprire;
  - lățimea blocului de calcul la 340 px (scroll orizontal);
  - rândul Water: `used` poate afișa „-0.00” dacă `spilled` depășește `river − eco` cu epsilon; nu am tratat cazul.
- Texte tehnic discutabile: nu am găsit niciunul care să trebuiască semnalat.
- Teste: `breakdown` și `SECTION_INFO` sunt pure și se pot testa (de exemplu `used = river − eco − spilled`, textele conțin numerele din constante). Formatarea din `calcRows` nu e exportată și nu are test.
