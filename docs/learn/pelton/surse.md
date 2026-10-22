# Surse — modulul Hydro · Pelton

Regula: fiecare afirmație dintr-o lecție are ≥ 2 surse independente, din care una primară. Copiile locale stau în `data/refs/` (PDF-urile descărcate în `data/refs/learn-dl/`, ignorate de git dacă sunt mari).

| Cod | Sursă | Tip | Copie locală | Unde |
|---|---|---|---|---|
| S1 | RETScreen International, *Small Hydro Project Analysis* (CANMET / NRCan), ghid + Anexa A | primară | `data/refs/retscreen-hydro.pdf`, `.txt`, `appA-p40.png` | HYDRO.6–7 (lucrări civile, priză, grătar), HYDRO.11 (derivație, prag), §2.1.2 (debit de servitute), HYDRO.40 (formule Pelton) |
| S2 | ESHA, *Guide on How to Develop a Small Hydropower Plant*, 2004, partea 1 | primară | `data/refs/learn-dl/esha-guide.pdf`, `.txt` | §1.3 (configurații, schema de cădere mare), §3.4.5 (cădere brută/netă), §3.5 (debit de servitute), §3.6 (energie), §5.3 (praguri), §5.5 (prize), §5.6 (deznisipatoare, ec. 5.7–5.11) |
| S8 | Natural Resources Canada, *An Introduction to Micro-Hydropower Systems* (2004) | primară (guvernamentală) | `data/refs/learn-dl/nrcanintro.pdf`, `.txt` | componente A–G, P = Q·H·g·e, e = 0,5–0,7, exemplul 14,7 kW |
| S9 | *Review on experimental investigation of sediment erosion in hydraulic turbines*, Frontiers in Mechanical Engineering, 2024 | articol review, open access | — | [PDF](https://www.frontiersin.org/journals/mechanical-engineering/articles/10.3389/fmech.2024.1526120/pdf): acul și cupele, cele mai vulnerabile la Pelton; deznisipatoarele țintesc particule > 200 µm |
| S10 | Miedema, *Slurry Transport*, cap. 4.4 (formula Ruby & Zanke 1977) | manual universitar, open | — | [LibreTexts](https://eng.libretexts.org/Bookshelves/Civil_Engineering/Slurry_Transport_(Miedema)/04%3A_The_Terminal_Settling_Velocity_of_Particles/4.04%3A_Terminal_Settling_Velocity_Equations) |
| S11 | *Sediment erosion on Pelton turbines: a review*, Chinese Journal of Mechanical Engineering, 2023 | articol review, open access | — | [Springer Open](https://cjme.springeropen.com/articles/10.1186/s10033-023-00880-y): uzura duzei, acului și rotorului |

Surse încercate și respinse:
- ATTRA (NCAT): descărcarea întoarce 401.
- Holland, ITDG: scan OCR ilizibil.
- Studiile de caz din Nepal și Etiopia: pică testul de plauzibilitate P ≤ 9,81·Q·H (vezi `programa.md`).
