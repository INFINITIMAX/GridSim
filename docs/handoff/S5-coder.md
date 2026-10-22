# S5: brief pentru coder. Explicațiile B: calculul „vizibil” și „i” pe fiecare secțiune

## Context

Citește integral:
- `2d/hydro.ts`
- `2d/panel.ts`
- `2d/style.css`
- `2d/index.html`
- `docs/handoff/S4-reviewer-raport.md`

Lucian a spus că nu mai înțelege ce se întâmplă în panou și vrea să poată verifica singur calculele. A aprobat varianta B:

1. sub putere, un bloc care arată calculul cu numerele curente;
2. un buton „i” pe fiecare secțiune, care deschide o explicație scurtă. Unde e cazul, explicația spune deschis ce e simplificare de joc.

**Fizica nu se schimbă.** `hydro.ts` rămâne neatins.

## 1. Modul nou `2d/explain.ts` (pur, fără DOM)

```ts
export interface Breakdown {
  water: { river: number; eco: number; spilled: number; used: number };   // m³/s; used = river − eco − spilled
  head: { gross: number; canal: number; rack: number; net: number };      // m; net = gross − canal − rack
  turbine: { running: number; flowEach: number; designFlow: number; load: number; efficiency: number };
  chain: { generator: number; transformerKeep: number };                  // 0.95 and 0.99 (1 − TRANSFORMER_LOSS), read from hydro.ts
  turbineKW: number;
  powerKW: number;
  stopReason: StopReason | null;
}
export function breakdown(setup: PlantSetup, riverFlow: number, op: Operation): Breakdown;
```

- Toate valorile se iau din `op` și din constantele din `hydro.ts` (`GENERATOR_EFFICIENCY`, `TRANSFORMER_LOSS`, `sizeById`). **Nu recalculezi fizica.**
- `river` = `max(riverFlow, 0)`.

Tot aici stă textul explicativ al fiecărei secțiuni:

```ts
export const SECTION_INFO: Record<SectionId, string>;
export type SectionId = "dam" | "canal" | "turbines" | "rack" | "gates" | "fish" | "river" | "water" | "year" | "curve";
```

Textele sunt exact cele de mai jos (engleză, ca restul panoului). Numerele se scriu din constante prin interpolare (`ECO_FLOW`, `FLOOD_SHUTDOWN_FLOW`, `RACK_MAX_LOSS·100`, `CANAL_HEAD_LOSS`, `CANAL_EXTRA_HEAD`, `CLOG_TIME_S/60`), nu bătute în cod. „Simplified:” rămâne un paragraf separat, adică textul folosește `\n\n` între paragrafe.

- **dam:** „The dam raises the water. Head is the height the water falls, and power grows in direct proportion to it: twice the head, twice the power. A higher dam floods more land upstream.”
- **canal:** „A canal carries water along the valley at a gentle slope while the river drops faster, so at the powerhouse the water stands higher: {CANAL_EXTRA_HEAD} m of extra head without flooding land. Friction in the canal costs part of it.\n\nSimplified: the friction loss is fixed at {CANAL_HEAD_LOSS} m. In reality it grows with the square of the flow.”
- **turbines:** „The turbine turns falling water into rotation, and the generator turns rotation into electricity. Turbine efficiency depends on the type, the head, the size and how full it runs. The curves follow the RETScreen formulas (Natural Resources Canada). Kaplan suits low head, Francis high head, Crossflow keeps going best when water is short. With little water the operator runs fewer turbines, each one fuller, because a half-empty turbine wastes more.”
- **rack:** „Bars in front of the intake stop leaves and branches. As debris builds up, the water loses head squeezing through, up to {RACK_MAX_LOSS·100}% when fully clogged.\n\nSimplified: the {RACK_MAX_LOSS·100}% and the clogging speed ({CLOG_TIME_S/60} minutes at average flow) are chosen for the game, not measured.”
- **gates:** „Gates let a flood pass over the dam under control. Without them the plant shuts down above {FLOOD_SHUTDOWN_FLOW} m³/s to protect the turbines.\n\nSimplified: in a real flood the water below the plant rises and the head shrinks. The fixed {FLOOD_SHUTDOWN_FLOW} m³/s limit is a game rule.”
- **fish:** „The law requires some water to always stay in the river below the dam, for fish and for the river itself (Romanian Water Law 107/1996). Here it is {ECO_FLOW} m³/s, 10% of the average flow.\n\nSimplified: the real amount is set for each river by the water authority. 10% is our assumption.”
- **river:** „How much water the river brings, in cubic metres per second. It changes with the seasons: snowmelt in spring, low water in late summer and autumn.”
- **water:** „Where the river goes: through the turbines, over the dam when the turbines are full, or down the fish ladder. The three always add up to the river flow.”
- **year:** „Energy over a typical year, each month at its average flow. Installed power is what the plant could give flat out. The capacity factor shows how much of that it actually delivers over the year.\n\nSimplified: the monthly flows describe an example mountain river, not a measured one, and real studies use daily flows.”
- **curve:** „Power for every river flow with the current setup. The dot is where the river is now. The curve flattens when the turbines are full and drops to zero where the plant has to stop.”

`ECO_FLOW` se afișează cu o zecimală, iar restul ca numere întregi, așa cum ies.

## 2. Panoul (`panel.ts`)

### a) Blocul „How is this calculated?” (în zona sticky, sub `#up-explain`)

- Un buton-text, `How is this calculated?`, cu `aria-expanded`, deschide și închide un bloc. Implicit e închis.
- Când e deschis, starea lui se păstrează la re-render.
- Blocul are 4 rânduri, în Geist Mono, cu valorile din `breakdown()`. Exemplu pentru Kaplan medium ×1, baraj 5, debit 3, fără scara de pești, grătar curat:

```
Water   3.00 river − 0.00 fish − 1.00 over dam = 2.00 m³/s
Head    5.00 gross − 0.00 canal − 0.00 rack = 5.00 m
Turbine 1 × 2.00 of 2.00 m³/s (100%) → efficiency 84.4%
Power   9.81 × 2.00 × 5.00 × 0.844 × 0.95 × 0.99 = 77.9 kW
```

- **Formatul:**
  - debitele și căderile cu 2 zecimale;
  - sarcina ca procent întreg;
  - randamentul în procente cu 1 zecimală pe rândul Turbine și ca fracție cu 3 zecimale pe rândul Power;
  - rezultatul cu 1 zecimală. Rezultatul e `powerKW`, nu produsul numerelor rotunjite.
- Rândul Canal apare doar dacă există canalul.
- Dacă `stopReason` nu e null, rândurile Turbine și Power se înlocuiesc cu un singur rând: `Power   0 kW: the plant is stopped (see above)`.
- Sub bloc vine o linie mică, `.up-muted`: `9.81 = water density × gravity / 1000. Turbine, generator, transformer.`

### b) Butonul „i” pe fiecare secțiune

- În fiecare `<h3>` din cele 10 secțiuni se adaugă la dreapta un buton mic, `i`, cu `aria-label="What is this?"` și `aria-expanded`.
- Click pe el arată sau ascunde, imediat sub `<h3>`, un `<div class="up-info">` cu textul din `SECTION_INFO`. Fiecare paragraf e un `<p>`, iar paragraful care începe cu „Simplified:” primește clasa `up-info-simplified`.
- Mai multe pot fi deschise în același timp. Starea se păstrează la re-render.
- Textul se pune prin `textContent`, nu prin `innerHTML`.

## 3. Stil (`style.css`)

Folosești doar tokenurile existente.

- **Butonul „i”:**
  - cerc de 18 px, cu chenar `--line`;
  - text `--muted`, `font-style: italic`, Geist;
  - la hover sau când e deschis: chenar și text `--accent`.
- **`.up-info`:**
  - fundal ușor diferit de panou, derivat din tokenuri (de exemplu `color-mix` între `--panel` și `--line`);
  - colțuri cu aceeași rază ca restul panoului;
  - padding 10 px;
  - text de 13 px.
- **`.up-info-simplified`:** text `--muted`, cu o bară verticală de 2 px `--warn` în stânga.
- **Blocul de calcul:**
  - Geist Mono, 12 px;
  - `white-space: pre` cu scroll orizontal dacă nu încape. Nu se rupe un rând de calcul.
- **Respecți lista interzisă:** fără gradiente, umbre mari, emoji sau iconițe Lucide. „i” e o literă, nu un SVG.

## Ce nu ai voie

- să atingi `hydro.ts`, `main.ts` sau testele;
- să adaugi alte texte sau secțiuni;
- să schimbi textele de mai sus. Dacă ți se pare că unul e greșit tehnic, scrii asta în raport;
- să rulezi comenzi.

## Raport

Scrie în `docs/handoff/S5-coder-raport.md`:
- fișierele modificate;
- semnăturile;
- orice abatere, cu motivul ei.
