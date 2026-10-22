# S5: raportul reviewer-ului (transcris integral de planner)

VERDICT: ACCEPT

Am citit briefurile S5, `2d/explain.ts`, `tests/2d/explain.test.ts`, secțiunile relevante din `2d/panel.ts` și un grep pe `2d/style.css`. N-am citit rapoartele coder/tester și nici CSS-ul integral. N-am rulat nimic. Cele 248 de teste verzi și `tsc` curat le iau de la planner.

Cele 4 puncte din brief:

1. `breakdown` doar copiază. (`D:\GridSim\2d\explain.ts`, liniile 32-48)
   - Toate câmpurile vin din `op`.
   - Singurele valori din afara lui `op` sunt `sizeById(setup.size).designFlow`, `GENERATOR_EFFICIENCY` și `1 - TRANSFORMER_LOSS`, citite din `hydro.ts`.
   - `river = Math.max(riverFlow, 0)`, cum cere briefului.
   - Nu există fizică duplicată.

2. `SECTION_INFO` are exact textele din brief, cele 10 chei.
   - Numerele sunt interpolate din constante: `CANAL_EXTRA_HEAD`, `CANAL_HEAD_LOSS`, `FLOOD_SHUTDOWN_FLOW`, `ECO_FLOW.toFixed(1)`, `rackPercent` (rotunjit), `CLOG_TIME_S/60`.
   - Paragraful „Simplified:” e separat prin `\n\n`.
   - Tehnic, afirmațiile sunt corecte pentru un joc:
     - Puterea e proporțională cu căderea.
     - Pierderea în canal crește cu pătratul debitului, iar jocul o fixează. Așa spune textul.
     - Curbele de randament vin din RETScreen.
     - Legea 107/1996 e Legea apelor.
     - Debitul ecologic de 10% e declarat explicit ca ipoteză.
   - Nu am găsit nimic de corectat.

3. Textul se pune prin `textContent` peste tot.
   - În `panel.ts`: paragrafele „i” (linia 270), eticheta „i” (linia 276), rândurile de calcul (liniile 304 și 306).
   - `innerHTML` apare doar în template-ul static de la linia 136. `TEXT.calcNote` e constantă.
   - Nu există injecție din date dinamice.

4. Cod în plus, teste inutile sau redundante: nimic grav.
   - Starea „i” și a blocului de calcul se păstrează la re-render, pentru că elementele se construiesc o singură dată.
   - Modificările planner-ului (grid cu 2 coloane, `NBSP`, termenul „canal” doar cu canal) sunt mici și justificate.

Teste, câte unul pe grup: ce schimbare le-ar face să cadă?
- Cazul din brief și cazul cu canal, scară de pești și grătar 50%: valori calculate de mână, cu calculul în comentariu. Cad dacă `breakdown` mapează greșit un câmp, de exemplu `eco` cu `spilled` sau `canal` cu `rack`.
- Cazurile oprite (flood, head, low-flow): cad dacă `stopReason` nu e propagat.
- Grila de consistență:
  - Testele `used` și `net` verifică în fond coerența lui `operate`, nu doar a lui `breakdown`. Asta e util, fiindcă formula afișată trebuie să reproducă puterea.
  - Testul cu produsul de 9,81 are garda `checked > 1000`, deci nu poate trece gol.
- `SECTION_INFO`:
  - Valorile „7 m³/s” (de 2 ori), „0.3 m³/s”, „3 minutes” și „4 m of extra head” sunt scrise de mână, nu citite din constante, cum cerea briefului.
  - Dacă cineva schimbă o constantă, testul cade intenționat.
- Nicio redundanță reală.

Observații minore, care nu blochează:
- `D:\GridSim\2d\panel.ts` liniile 44-47: comentariul `/** Water flowing less than this over the dam counts as nothing spilled, m³/s. */` a rămas deasupra lui `NBSP`, iar `SPILL_EPSILON` e acum sub comentariul lui `NBSP`. Comentariile s-au încurcat la inserarea lui `NBSP`. Trebuie mutat `NBSP` (cu comentariul lui) fie deasupra comentariului `SPILL_EPSILON`, fie sub `SPILL_EPSILON`.
- `D:\GridSim\tests\2d\explain.test.ts` linia 213: regexul `/6\.0+\d/` din testul `rack` e slab. Prinde doar artefacte precum „6.000000001”, nu orice float rupt. Nu strică, dar valoarea lui e mică.
- Nu am verificat vizual CSS-ul. Grep-ul nu arată gradiente. Singurul `box-shadow` (linia 178) e un `inset` de 1 px care nu ține de S5.
- Panoul (DOM) nu are teste automate, conform briefului „doar funcții pure”. Capturile rulate de planner acoperă golul.

---

## Decizia planner-ului

- **Comentariile `NBSP` / `SPILL_EPSILON`:** reparate, fiecare comentariu e acum deasupra constantei lui.
- **Regex-ul slab:** rămâne. Testul are și verificarea pozitivă „6%”, care e cea importantă.
- **Stare finală:** `tsc` curat, 248 de teste din 248 trec.
