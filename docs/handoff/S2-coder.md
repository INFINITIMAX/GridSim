# S2: coder brief. Hidrocentrala se poate inspecta și upgrada

## Context

Proiectul a repornit de la zero în 2D, element cu element. Lucian decide fiecare element. Pasul 1 există deja în `2d/`: `index.html`, `style.css` și `main.ts`, cu un teren de 32×20 tile-uri, un râu pe grilă și o micro-hidrocentrală (baraj, clădire, o turbină desenată ca rotor), plus vederile Top și Iso.

Citește integral `2d/main.ts` înainte să începi. Restul proiectului (`src/`, `tests/model`, `tests/game`) e versiunea veche, v1. **Nu îl atinge și nu îl importa.**

## Ce a cerut Lucian (cuvintele lui)

„vreau o privire de ansamblu, dar vreau să pot să dau click pe hidrocentrală, să trec în vedere izometrică, și să pot să o upgradez, și când o upgradez (cresc sau scad numărul de turbine sau pun o turbină mai puternică) să pot să văd ce efect are aceasta asupra energiei din ecosistem în diferite situații (debit mai mare al râului sau mai mic)”.

**Nu adăuga nimic în plus:** fără consumatori, bani, scor sau alte clădiri.

## Ce livrezi

### 1. `2d/hydro.ts` (nou): fizica, pură, fără DOM

```ts
export interface TurbineType {
  id: "small" | "medium" | "large";
  name: string;          // "Small turbine", "Medium turbine", "Large turbine"
  designFlow: number;    // m³/s at full load
  peakEfficiency: number;
  minLoad: number;       // fraction of designFlow below which it cannot run
  radius: number;        // rotor size on the map, in tiles (visual only)
}
export const TURBINES: readonly TurbineType[];   // small 1.0/0.80, medium 2.0/0.85, large 3.5/0.88; minLoad 0.3 for all; radius 0.16/0.20/0.24
export const HEAD_M = 5;                          // drop created by the dam, metres
export const MAX_TURBINES = 4;
export const RIVER_PRESETS = { dry: 0.8, normal: 3, flood: 9 } as const;  // m³/s
export const RIVER_MAX = 12;

export interface PlantSetup { turbine: TurbineType["id"]; count: number }
export interface Operation {
  running: number; flowPerTurbine: number; usedFlow: number; spilledFlow: number;
  load: number; efficiency: number; powerKW: number; maxPowerKW: number; energyPerDayMWh: number;
}
export function operate(setup: PlantSetup, riverFlow: number, headM = HEAD_M): Operation;
export function powerCurve(setup: PlantSetup, maxFlow = RIVER_MAX, steps = 120): { flow: number; powerKW: number }[];
```

**Regulile pentru `operate`, exact acestea:**
- qMin = minLoad · designFlow.
- `count` se limitează la intervalul 1..MAX_TURBINES. `riverFlow` < 0 se tratează ca 0.
- maxRunnable = min(count, floor(riverFlow / qMin + 1e-9)).
- **running = numărul k din 1..maxRunnable care dă cea mai mare putere**, calculată cu regulile de mai jos pentru fiecare k. La egalitate câștigă k-ul mai mic. Exact așa face un operator real: la debit mic oprește turbine, pentru că două turbine la jumătate de sarcină produc mai puțin decât una la sarcină plină. **Corectură de planner față de prima versiune a brief-ului.**
- **Dacă running = 0:** totul e deversat, puterea e 0, load = 0, efficiency = 0, flowPerTurbine = 0.
- **Altfel:**
  - flowPerTurbine = min(designFlow, riverFlow / running);
  - usedFlow = running · flowPerTurbine;
  - spilledFlow = riverFlow − usedFlow.
- load = flowPerTurbine / designFlow.
- efficiency = peakEfficiency · (1 − 0.25 · (1 − load)²).
- powerKW = 1000 · 9.81 · usedFlow · headM · efficiency / 1000.
- maxPowerKW = count · 9.81 · designFlow · headM · peakEfficiency.
- energyPerDayMWh = powerKW · 24 / 1000.

Comentează formula P = ρ·g·Q·H·η o singură dată, scurt.

### 2. `2d/panel.ts` (nou): panoul de upgrade (DOM)

Exportă `createPanel(root: HTMLElement, onChange: (state) => void)` sau o formă echivalentă, simplă. Panoul stă în dreapta, are 340px lățime și e ascuns până la click pe hidrocentrală. Conține, în ordine:

1. **Header:** „Micro hydro”, un subtitlu „Run-of-river · 5 m head” și butonul de închidere (×, cu `aria-label="Close"`).
2. **Turbine:** 3 opțiuni selectabile, fiecare cu numele, „X m³/s · Y kW each” (Y calculat cu `operate` la debit nominal) și randamentul de vârf.
3. **Number of turbines:** stepper − / număr / +, limitat la 1–4.
4. **River flow:**
   - butoanele Dry / Normal / Flood;
   - un slider 0–12 m³/s cu pas 0.1;
   - valoarea curentă, afișată „3.0 m³/s”.
5. **Output:**
   - puterea mare în kW, cu „of N kW max” sub ea;
   - „2 of 4 turbines running”;
   - „X MWh per day”;
   - o bară orizontală împărțită: prin turbine (culoarea apei) și peste baraj (alb sau gri), cu cele două valori în m³/s sub ea.
6. **O frază de explicație,** care se schimbă după stare:
   - running = 0: „Too little water. Turbines stop below 30% of their design flow.”
   - spilledFlow > 0.01: „Turbines are full. The extra water goes over the dam unused.”
   - 0 < running < count (și fără deversare): „Not enough water for every turbine. Running fewer at full load gives more power.” (adăugat de planner)
   - altfel: „All the water goes through the turbines.”
7. **Graficul „Power vs river flow”:** SVG desenat din `powerCurve`, cu axa X 0–12 m³/s și axa Y 0–maxPowerKW (rotunjit în sus). Marchează punctul curent: o linie verticală plus un punct. Culorile vin din tokens. Etichetele axelor sunt la scară.

**Starea inițială:** turbina medium, 1 bucată, râul Normal (3 m³/s).

Orice schimbare recalculează imediat și apelează `onChange`.

### 3. `2d/main.ts` (editat)

- **La start:** vedere **Top**, de ansamblu, zoom 1. Butoanele Top / Isometric rămân și funcționează oricând.
- **Hover pe hidrocentrală** (zona barajului plus clădirea): cursorul devine `pointer`, iar în jur apare un contur subțire, alb.
- **Click pe hidrocentrală:**
  - trece în vedere Iso;
  - animează zoom-ul de la 1 la 2.6 în ~600 ms, cu ease-out;
  - centrează pe hidrocentrală, în zona rămasă liberă la stânga panoului;
  - deschide panoul.
- **Închiderea** (×, Escape sau click pe teren gol când panoul e deschis):
  - închide panoul;
  - revine la vederea Top, zoom 1, cu aceeași animație inversă.
- **Camera:** adaugă `zoom` și `focus` (un punct în tile space) în `fit()`, astfel încât `focus` să cadă în centrul zonei libere. Fără `focus`, harta stă centrată ca acum.

**Ce trebuie să se vadă pe hartă:**
- **Rotoarele:** exact `count` rotoare pe baraj, distribuite uniform pe lățimea râului (de-a lungul normalei), cu `radius` după tip.
  - Viteza de rotație e proporțională cu `load`, cu maximum 1.6 ture/s la load 1.
  - Rotoarele care nu funcționează (index ≥ running) stau pe loc și sunt mai deschise la culoare (opacitate 0.4).
- **Liniuțele râului:** viteza e înmulțită cu riverFlow / 3, cu un minim de 0.25.
- **Deversarea:** dacă spilledFlow > 0, apare o fâșie de spumă albă imediat în aval de baraj, pe lățimea râului, cu opacitatea proporțională cu spilledFlow / riverFlow.
- **Readout-ul jos-stânga:** pe hidrocentrală afișează și puterea, de exemplu „tile 15, 10 · Micro hydro · 83 kW”.

### 4. `2d/index.html` și `2d/style.css`

Adaugă containerul panoului și stilurile lui. Tokens noi doar în `:root`, în același stil cu cele existente.

**Interzis:** gradiente, glassmorphism, emoji, em dash (—) în textele UI, fontul Inter și orice altă iconiță decât × (scris ca text).

## Constrângeri dure

- TypeScript strict, cu `noUncheckedIndexedAccess` activ (pasul 1 a avut erori de aici; folosește `!` doar acolo unde indexul e garantat).
- Fără librării noi. Fără `localStorage`.
- **Toți parametrii vizibili stau la începutul fișierelor, cu nume clare.** Lucian vrea să-i poată modifica singur.
- Păstrează stilul și densitatea comentariilor din `main.ts`.
- Nu atinge `src/`, `tests/`, `scripts/`, `package.json` sau `vitest.config.ts`.
- Nu rulezi comenzi. Planner-ul rulează typecheck-ul, testele și capturile.

## Raport

Scrie `docs/handoff/S2-coder-raport.md` cu:
- fișierele atinse;
- deciziile pe care brief-ul nu le acoperea;
- orice abatere de la brief, cu motivul ei.
