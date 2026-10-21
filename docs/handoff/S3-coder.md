# S3: brief pentru coder. Toate upgrade-urile hidrocentralei

## Context

Pasul 2 e livrat și acceptat. Citește integral `2d/hydro.ts`, `2d/panel.ts`, `2d/main.ts`, `2d/index.html` și `2d/style.css`, plus `docs/handoff/S2-reviewer-raport.md`.

Lucian a aprobat lista de upgrade-uri de mai jos („hai să facem tot ce putem face pentru această hidrocentrală”). **Nu adăuga nimic în afara listei:** fără bani sau costuri, fără consumatori, fără lac de acumulare și fără transformator.

## Upgrade-urile și fizica lor (exact așa)

### Constante noi în `hydro.ts`, la început, cu nume clare

```ts
export const DAM_HEIGHTS = [3, 5, 8] as const;      // m, gross head from the dam alone
export const CANAL_EXTRA_HEAD = 4;                  // m gained by a diversion canal
export const CANAL_HEAD_LOSS = 0.4;                 // m lost to friction in the canal
export const RACK_MAX_LOSS = 0.06;                  // fully clogged rack loses 6% of gross head
export const MEAN_FLOW = 3;                         // m³/s, the river's yearly average
export const ECO_FLOW = 0.1 * MEAN_FLOW;            // m³/s that must bypass the plant (fish ladder)
export const FLOOD_SHUTDOWN_FLOW = 7;               // m³/s; without gates the plant stops above this
export const CLOG_TIME_S = 180;                     // seconds for a clean rack to clog fully at MEAN_FLOW
export const AUTO_CLEAN_LEVEL = 0.05;               // the automatic cleaner keeps clog at or below this
export const AVERAGE_CLOG_NO_CLEANER = 0.5;         // assumed average clog over a year without the cleaner
export const MONTHLY_FLOW = [1.8, 2.2, 4.2, 6.5, 6.0, 4.0, 2.4, 1.4, 1.2, 1.6, 2.2, 2.0]; // m³/s, Jan..Dec, example mountain river: snowmelt in spring, low in autumn
export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
```

### Tehnologia turbinei (înlocuiește `peakEfficiency`/`minLoad` de pe mărime)

| id | nume | randament de vârf | η(L), cu L = sarcina | minLoad | cădere permisă (m) |
|---|---|---|---|---|---|
| `kaplan` | Kaplan | 0,90 | 0,90 · (1 − 0,15·(1 − L)²) | 0,20 | 2–20 |
| `francis` | Francis | 0,92 | 0,92 · (1 − (L − 0,85)²) | 0,40 | 10–300 |
| `crossflow` | Crossflow | 0,80 | 0,80 · (1 − 0,08·(1 − L)²) | 0,15 | 2–100 |

Fiecare tehnologie are și o descriere scurtă, în engleză, pentru panou:
- **Kaplan:** „Adjustable blades. Good across a wide range of flows, low head.”
- **Francis:** „Highest peak efficiency, but only near its design flow. Needs 10 m of head or more.”
- **Crossflow:** „Simple and robust. Lower efficiency, but it barely drops at low flow.”

### Mărimea turbinei

Rămâne `small` / `medium` / `large`, cu debitul nominal 1,0 / 2,0 / 3,5 m³/s și raza vizuală 0,16 / 0,20 / 0,24. Mărimea dă doar debitul.

### `PlantSetup`

```ts
{
  technology: "kaplan" | "francis" | "crossflow";
  size: "small" | "medium" | "large";
  count: number;          // 1..4, clamped
  damHeight: 3 | 5 | 8;
  canal: boolean;
  gates: boolean;         // spillway gates
  fishLadder: boolean;    // also the ecological flow
  autoCleaner: boolean;
}
```

### `operate(setup, riverFlow, clog)`

`clog` e între 0 și 1 și se limitează la acest interval.

1. **Căderea:**
   - grossHead = damHeight + (canal ? CANAL_EXTRA_HEAD : 0);
   - netHead = grossHead − (canal ? CANAL_HEAD_LOSS : 0) − clog · RACK_MAX_LOSS · grossHead.
2. **Apa disponibilă:**
   - flow = max(riverFlow, 0);
   - ecoFlow = fishLadder ? min(ECO_FLOW, flow) : 0;
   - available = flow − ecoFlow.
3. **Motivul opririi** (`stopReason`), verificat în ordinea:
   - `"flood"`: dacă `!gates && flow > FLOOD_SHUTDOWN_FLOW`;
   - `"head"`: dacă grossHead e în afara intervalului de cădere al tehnologiei;
   - `"low-flow"`: dacă maxRunnable = 0.

   Pentru oricare dintre ele: running = 0, putere 0, iar tot debitul `available` e deversat.
4. **Altfel:** aceeași regulă ca în S2, adică maxRunnable = min(count, floor(available / qMin + 1e-9)), unde qMin = minLoad · designFlow. Se alege k din 1..maxRunnable cu puterea maximă; la egalitate câștigă k-ul mai mic. Randamentul vine din curba tehnologiei.
5. **Puterea:** P_kW = 9.81 · usedFlow · netHead · η.
6. **Puterea instalată:** installedKW = count · 9.81 · designFlow · (grossHead − canalLoss) · η(L = 1), fără pierderea la grătar și fără verificarea căderii. E puterea „de pe plăcuță”.

**Ce întoarce:**
- `running`, `flowPerTurbine`, `usedFlow`, `spilledFlow`, `ecoFlow`, `load`, `efficiency`, `powerKW`, `installedKW`;
- `grossHead`, `netHead`, `rackLossM`, `canalLossM`;
- `stopReason: "flood" | "head" | "low-flow" | null`;
- `energyPerDayMWh`.

**Conservarea apei:** usedFlow + spilledFlow + ecoFlow = flow.

### Alte funcții pure în `hydro.ts`

- **`stepClog(clog, riverFlow, autoCleaner, dtS)`:** crește înfundarea cu dtS / CLOG_TIME_S · (riverFlow / MEAN_FLOW), cu plafon la 1. Dacă `autoCleaner` e activ, rezultatul nu trece de AUTO_CLEAN_LEVEL.
- **`annual(setup)`:** pentru fiecare lună calculează `operate` cu MONTHLY_FLOW[m], la clog = autoCleaner ? AUTO_CLEAN_LEVEL : AVERAGE_CLOG_NO_CLEANER. Întoarce:
  - `monthsMWh[12]` = P · zile · 24 / 1000;
  - `totalMWh`;
  - `capacityFactor` = totalMWh · 1000 / (installedKW · 8760), sau 0 dacă installedKW e 0.
- **`floodedTiles(damHeight)`:** câte pătrățele de teren inundă lacul. Formula o decizi tu în `main.ts`, din geometrie (vezi mai jos). Dacă e mai simplu, mut-o în `main.ts`.
- **`powerCurve(setup, clog, maxFlow, steps)`:** la fel ca în S2, cu noii parametri.

## Pe hartă (`main.ts`), totul cu parametri la începutul fișierului

1. **Barajul.** Înălțimea vizuală e 0,25 / 0,35 / 0,55 tile pentru 3 / 5 / 8 m.
   - Lacul din amonte se întinde pe 2 / 4 / 7 tile în lungul râului.
   - La 8 m, pătrățelele de iarbă de lângă râu, pe lungimea lacului, la cel mult 1 tile de mal, devin apă inundată, cu o nuanță proprie (token nou). Hărțile de tile-uri se recalculează când se schimbă înălțimea.
   - Panoul afișează numărul de pătrățele inundate („Flooded land: N tiles”).
2. **Canalul de derivație.**
   - Un canal îngust (0,6 tile), pe malul clădirii, pornește de la baraj și merge 3,5 tile în aval, de-a lungul râului.
   - Clădirea centralei se mută la capătul canalului.
   - Rotoarele se desenează la clădire, în canalul de fugă, nu pe baraj.
   - Câteva liniuțe de apă curg prin canal.
   - Fără canal, totul rămâne ca acum.
3. **Forma rotorului după tehnologie:**
   - **Kaplan:** elice cu 4 pale, ca acum;
   - **Francis:** un cerc cu 8 palete curbe scurte;
   - **Crossflow:** un tambur, adică un dreptunghi cu linii paralele care „curg” când se rotește.
4. **Stavilele.** 3 porți mici, întunecate, pe creasta barajului. Când există deversare, se desenează ridicate (lift mai mare).
5. **Scara de pești.** 4 bazine mici în trepte, pe malul opus clădirii, lângă baraj, cu liniuțe de apă care coboară. Apare doar când e activă.
6. **Grătarul.** O linie subțire, întunecată, imediat în amonte de baraj sau de priza canalului.
   - Punctele maro de resturi sunt proporționale cu `clog`, maximum ~14.
   - Dacă `autoCleaner` e activ, apare o mică cutie cu braț la capătul grătarului.
7. **Înfundarea în timp.** `main.ts` ține `clog` în stare și îl actualizează în fiecare cadru cu `stepClog`. Panoul primește valoarea curentă.
8. **Restul.** Rotoarele, spuma de la deversare și viteza liniuțelor rămân ca în S2, dar cu valorile noi.

## Panoul (`panel.ts`)

**Sus, fix (sticky), mereu vizibil:**
- puterea în kW;
- „Installed N kW”;
- „X of Y turbines running”;
- fraza de stare.

Ordinea frazelor de stare:
- `flood`: „Flood. Without spillway gates the plant shuts down above 7 m³/s to protect the turbines.”
- `head`: „Francis turbines need at least 10 m of head. Raise the dam or add a canal.” (generic, din intervalul tehnologiei)
- `low-flow`: „Too little water. These turbines stop below N% of their design flow.”
- deversare > 0,01: fraza din S2;
- running < count: fraza din S2;
- altfel: fraza din S2.

**Secțiunile de dedesubt, în ordine:**

1. **Dam:**
   - înălțimea, cu 3 butoane (3 m / 5 m / 8 m);
   - „Head: 11.6 m (12 gross, −0.4 canal, −0.1 rack)”;
   - „Flooded land: N tiles”.
2. **Diversion canal:** un comutator și o frază: „+4 m head, 0.4 m lost to friction”.
3. **Turbines:**
   - tehnologia, 3 opțiuni, fiecare cu descrierea;
   - o opțiune e dezactivată, cu motivul afișat, dacă grossHead e în afara intervalului ei;
   - mărimea, 3 opțiuni;
   - numărul, cu stepper 1–4.
4. **Intake rack:**
   - bara de înfundare, în %;
   - butonul „Clean now”, care pune clog = 0 (dezactivat cât timp `autoCleaner` e activ);
   - comutatorul „Automatic cleaner”.
5. **Spillway gates:** un comutator.
6. **Fish ladder:** un comutator.
   - Când e oprit, apare un avertisment vizibil: „No permit. The law requires an ecological flow to bypass the dam.”
   - Când e pornit: „0.3 m³/s always bypasses the plant.”
7. **River flow:** ca în S2.
8. **Water:** bara din S2, cu un al treilea segment pentru debitul ecologic (prin scara de pești).
9. **This year:**
   - energia totală în MWh;
   - factorul de capacitate în %, cu o frază: „Capacity factor: average output divided by installed power.”;
   - 12 bare lunare (SVG), cu inițiala lunii.
10. **Power vs river flow:** graficul din S2, cu noile valori.

**Starea inițială:** dam 5 m, fără canal, Kaplan medium ×1, fără stavile, scara de pești pornită, fără curățitor automat, râul Normal, clog 0.

## Constrângeri dure

- Aceleași ca în S2:
  - TypeScript strict cu `noUncheckedIndexedAccess`;
  - fără librării noi și fără `localStorage`;
  - parametrii la începutul fișierelor;
  - stilul comentariilor păstrat.
- Interdicții de design: fără gradient, glassmorphism, emoji, em dash în textele UI, Inter sau alte iconițe. Comutatoarele sunt checkbox-uri stilizate sau butoane cu `aria-pressed`.
- `plantAtScreen` (hit-test-ul cu înălțimi, din corectura planner-ului) trebuie să acopere și clădirea mutată la capătul canalului.
- Nu atinge `src/`, `tests/`, `scripts/`, `package.json` sau `vitest.config.ts`. Nu rulezi comenzi.
- `tests/2d/hydro.test.ts` va fi rescris de tester. Nu-l modifica.

## Raport

Scrie `docs/handoff/S3-coder-raport.md` cu:
- fișierele atinse;
- deciziile neacoperite de brief, inclusiv formula pentru pătrățelele inundate;
- abaterile de la brief, cu motivul fiecăreia.
