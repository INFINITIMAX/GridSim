# S4: brief pentru coder. Calcule corecte (randamente RETScreen, generator, transformator)

## Context

Citește integral `2d/hydro.ts`, plus `docs/audit-hidro.md`. Din `2d/panel.ts` citești doar locul unde apare `peakEfficiency` (în jurul liniei 162).

Auditul a arătat că:
- codul face exact ce spun regulile;
- curbele de randament sunt inventate și prea optimiste;
- lipsesc generatorul și transformatorul.

Lucian a aprobat corectura. **Schimbi doar fizica randamentului și lanțul de puteri.** Restul rămâne neatins: căderea, grătarul, debitul ecologic, viitura, ordinea opririlor, regula de dispatch, `minLoad`, `minHead`, `maxHead`, `annual`, `powerCurve`, `stepClog`.

Sursa: RETScreen Small Hydro Project Analysis (Natural Resources Canada), ecuația (7) la pagina HYDRO.22 și Anexa A la paginile HYDRO.37–40. Citeaz-o în comentariul de deasupra codului.

## 1. Constante noi (în blocul de sus din `hydro.ts`)

```ts
export const GENERATOR_EFFICIENCY = 0.95; // typical small hydro generator; RETScreen leaves it to the user (eq. 7)
export const TRANSFORMER_LOSS = 0.01;     // 1% lost in the step-up transformer, typical value (eq. 7)
export const RUNNER_COEFFICIENT = 4.5;    // RETScreen R_m, turbine manufacture/design coefficient, default 4.5 (2.8 to 6.1)
```

## 2. Randamentul turbinei, după RETScreen Anexa A

**Notații:**
- `h`: căderea nominală în metri, adică `grossHead − canalLossM`. E fixă pentru un setup și nu depinde de înfundarea grătarului;
- `Qd`: debitul nominal al unei turbine (`size.designFlow`);
- `Q`: debitul printr-o turbină;
- `Rm = RUNNER_COEFFICIENT`.

**Diametrul rotorului:** d = 0,46 · Qd^0,473, în metri.

**Kaplan** (Anexa A, pagina HYDRO.39):
- nq = 800 · h^−0,5
- enq = ((nq − 170) / 700)²
- ed = (0,095 + enq) · (1 − 0,789 · d^−0,2)
- ep = (0,905 − enq + ed) − 0,0305 + 0,005 · Rm
- Qp = 0,75 · Qd
- eq = [1 − 3,5 · ((Qp − Q) / Qp)^6] · ep, aceeași formulă sub și peste Qp

**Francis** (Anexa A, paginile HYDRO.37–38):
- nq = 600 · h^−0,5
- enq = ((nq − 56) / 256)²
- ed = (0,081 + enq) · (1 − 0,789 · d^−0,2)
- ep = (0,919 − enq + ed) − 0,0305 + 0,005 · Rm
- Qp = 0,65 · Qd · nq^0,05
- dacă Q ≤ Qp: eq = {1 − [1,25 · ((Qp − Q) / Qp)^(3,94 − 0,0195 · nq)]} · ep
- dacă Q > Qp:
  - er = (1 − 0,0072 · nq^0,4) · ep, adică randamentul la sarcină plină;
  - eq = ep − ((Q − Qp) / (Qd − Qp))² · (ep − er).

**Crossflow** (Anexa A, pagina HYDRO.40):
- Qp = Qd
- eq = 0,79 − 0,15 · ((Qd − Q) / Qp) − 1,37 · ((Qd − Q) / Qp)^14

**Toate tehnologiile:** rezultatul se limitează la minimum 0 (`Math.max(eq, 0)`).

## 3. Schimbări de API în `hydro.ts`

- Din `Technology` scoți `peakEfficiency` și `partLoad`. Restul câmpurilor rămâne.
- Exporți:
  - `turbineEfficiency(tech: Technology, ratedHead: number, designFlow: number, flow: number): number`, adică eq de mai sus;
  - `peakEfficiency(tech: Technology, ratedHead: number, designFlow: number): number`, adică randamentul la Qp (pentru Crossflow, la Qd).
- Descrierile tehnologiilor se înlocuiesc, exact cu textele:
  - **Kaplan:** „Adjustable blades. Efficient across a wide range of flows at low head, but weak below about a third of its design flow.”
  - **Francis:** „Built for high head. Efficient only near its design flow. At the 10 to 12 m this river allows it is a poor fit.”
  - **Crossflow:** „Simple and robust. Below the others at full flow, ahead of them in a dry month.”
- În `operate`:
  - `ratedHead = grossHead − canalLossM`;
  - în `withRunning`: `efficiency = turbineEfficiency(tech, ratedHead, size.designFlow, flowPerTurbine)`;
  - `turbineKW = kW(usedFlow, netHead, efficiency)`;
  - `powerKW = turbineKW · GENERATOR_EFFICIENCY · (1 − TRANSFORMER_LOSS)`;
  - `energyPerDayMWh` se calculează din `powerKW`, ca acum;
  - `installedKW = count · kW(designFlow, ratedHead, turbineEfficiency(tech, ratedHead, designFlow, designFlow)) · GENERATOR_EFFICIENCY · (1 − TRANSFORMER_LOSS)`.
- În `Operation`:
  - adaugi `turbineKW: number`, cu comentariul `/** Power at the turbine shaft, before generator and transformer losses. */`. Pe ramura de oprire e 0;
  - lângă `powerKW` pui comentariul `/** Power delivered to the grid, after generator and transformer. */`.
- Dispatch-ul rămâne neschimbat: k cu puterea maximă, iar la egalitate câștigă k-ul mai mic. Compară `powerKW`.

## 4. `panel.ts`, o singură schimbare

În butonul de tehnologie, `${fmt(t.peakEfficiency * 100)}% peak` devine randamentul de vârf la căderea și mărimea curente:
- text: `${fmt(peakEfficiency(t, ratedHead, designFlow) * 100)}% peak here`;
- se actualizează la fiecare schimbare de setup, prin același mecanism prin care panoul își actualizează restul. Citește cum se face și refolosește-l, fără mecanism nou;
- dacă căderea nu e permisă pentru tehnologia respectivă, afișezi „–”.

Nimic altceva în panou, `main.ts`, HTML sau CSS.

## Ce nu ai voie

- să atingi testele (`tests/`);
- să schimbi alte constante sau reguli decât cele de mai sus;
- să adaugi UI nou, explicații sau tooltipuri (vin în pasul următor);
- să rulezi comenzi.

## Raport

Scrie în `docs/handoff/S4-coder-raport.md`:
- fișierele modificate;
- semnăturile noi;
- orice ambiguitate întâlnită și cum ai rezolvat-o.
