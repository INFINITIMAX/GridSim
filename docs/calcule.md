# Calcule și surse: modelul GridSim
Status: P0, 21-10-2026. Fiecare parametru din `src/model/units.ts` trimite la o sursă de aici (gate G4).

## 1. Cifre verificate în sursele primare (regulamente UE)

| Parametru | Valoare (Europa continentală, CE) | Sursă |
|---|---|---|
| Frecvența nominală | 50 Hz | SO GL |
| Banda standard de frecvență | ±50 mHz | SO GL, Anexa III, Tabelul 1 |
| Abaterea instantanee maximă | 800 mHz | SO GL, Anexa III, Tabelul 1 |
| Abaterea staționară maximă | 200 mHz | SO GL, Anexa III, Tabelul 1 |
| Timpul de restabilire a frecvenței | 15 minute | SO GL, Anexa III, Tabelul 1 |
| Incidentul de referință (dimensionarea FCR) | 3 000 MW, în ambele sensuri | SO GL, art. 153(2)(b)(i) |
| Insensibilitate + bandă moartă FCR | 10 mHz | SO GL, Anexa V |
| Abaterea la care FCR e complet activat | ±200 mHz | SO GL, Anexa V |
| Timpul de activare completă FCR | 30 s; ≥ 50% după 15 s; creștere cel puțin liniară între 15 și 30 s | SO GL, Anexa V și art. 154(7) |
| Întârzierea maximă de activare aFRR | 30 s | SO GL, art. 158 |
| LFDD (UFLS): pornire | 49,0 Hz, 5% din sarcină | NC ER, Anexă |
| LFDD: nivel final | 48,0 Hz, 45% cumulat din sarcină | NC ER, Anexă |
| LFDD: număr minim de trepte / mărime maximă pe treaptă | 6 trepte / 10% pe treaptă | NC ER, Anexă |
| Funcționare nelimitată a generatoarelor | 49,0–51,0 Hz | RfG, art. 13, Tabelul 2 |
| Funcționare limitată | 47,5–48,5 Hz ≥ 30 min; 51,0–51,5 Hz 30 min. În afara 47,5–51,5 Hz generatoarele pot ieși din rețea. | RfG, art. 13, Tabelul 2 |

**În joc:** generatoarele se deconectează sub 47,5 Hz sau peste 51,5 Hz, urmează cascada și apoi blackout-ul. Treptele UFLS (6 trepte, ≤ 10% fiecare, 45% total):

| Treaptă | Frecvență | Sarcină deconectată (cumulat) |
|---|---|---|
| 1 | 49,0 Hz | 5% |
| 2 | 48,8 Hz | 13% |
| 3 | 48,6 Hz | 21% |
| 4 | 48,4 Hz | 29% |
| 5 | 48,2 Hz | 37% |
| 6 | 48,0 Hz | 45% |

Interpolare liniară între pornire și final, în limitele NC ER.

## 2. Parametri pe tehnologie

| Tehnologie | H (s) | Viteză de variație | Minim tehnic | Pornire (la cald) | CO₂ ciclu de viață (g/kWh) |
|---|---|---|---|---|---|
| Nuclear | 4,2 [A] | 5 %/min [D] | 50% [D] | ore (în joc: nu repornește în nivel) | 12 [F] |
| Cărbune (huilă) | 3,2 [A] | 2,5 %/min (1,5–4) [C] | 35% (25–40) [C] | 2,5–3 h [C] | 820 [F] |
| Gaz, ciclu combinat (CCGT) | 4,3 [A] | 4 %/min (2–4; 4–8 la cele moderne) [C] | 45% (40–50) [C] | 60–90 min [C] | 490 [F] |
| Gaz, turbină în ciclu deschis (vârf) | 5 [B] | 10 %/min (8–12) [C] | 45% (40–50) [C] | 5–11 min [C] | 490 (aproximare: aceeași clasă de combustibil) [F] |
| Hidro | 3 (2–4) [B] | 30 %/min [E] | presupunere de joc: 20% | minute [E] | 24 [F] |
| Solar | 0 [G] | urmează soarele; invertorul: 90% în 20 s [H] | 0 | — | 48 [F] |
| Eolian | 0 [G] | urmează vântul | 0 | — | 11 [F] |
| Baterie | 0 [G] (fără inerție proprie; răspuns rapid prin invertor) | presupunere de joc: 100% în 1 s (FFR) [G] | 0 | — | n/a (nu emite în funcționare) |

**Autoreglajul sarcinii D:** valorile de planificare sunt 1–2 %/Hz [I]. Folosim **1 %/Hz**, varianta conservatoare: amortizare mai mică înseamnă excursii de frecvență mai mari.

Cifrele marcate „presupunere de joc” nu au o sursă primară bună. Sunt alese ca să fie plauzibile și apar ca atare în ecranul „How real is this?”.

## 3. Calcule de mână pentru teste

### T1: ROCOF inițial
S = 10 000 MW (sincron online), H = 5 s, ΔP = −1 000 MW, f₀ = 50 Hz.

df/dt = f₀ · ΔP / (2·H·S) = 50 · (−1 000) / (2 · 5 · 10 000) = **−0,5 Hz/s**

Criteriu: modelul dă −0,5 Hz/s ±10% în primul pas după incident, cu FCR încă neactivat.

### T2: incidentul de referință CE
Sarcină 150 000 MW, FCR alocat 3 000 MW (complet la 200 mHz), D = 1 %/Hz, H_sys = 4 s, S = 200 000 MW. Pierdere bruscă de 3 000 MW.

- Rigiditatea FCR: K = 3 000 MW / 0,2 Hz = 15 000 MW/Hz.
- Autoreglajul sarcinii: D·P = 0,01 · 150 000 = 1 500 MW/Hz.
- Abaterea cvasi-staționară: Δf = ΔP / (K + D·P) = 3 000 / 16 500 = **0,182 Hz (182 mHz)**, sub limita de 200 mHz din SO GL.
- ROCOF inițial: 50 · 3 000 / (2 · 4 · 200 000) = 0,094 Hz/s.

Criterii: abaterea cvasi-staționară 182 mHz ±10%; nadirul ≤ 800 mHz (abaterea instantanee maximă din SO GL).

### T3: UFLS într-o rețea mică (insulă)
Sarcină 800 MW, generare sincronă 1 000 MW cu H = 4 s, FCR 50 MW. Pierdere bruscă de 250 MW.

- Deficit după FCR: 250 − 50 = 200 MW, adică 25% din sarcină. Trebuie deconectate ≥ 25%, deci se ajunge la treapta 4 (48,4 Hz, 29% cumulat).
- ROCOF inițial: 50 · 250 / (2 · 4 · 1 000) = 1,56 Hz/s. Din 50 Hz se ajunge la 49,0 Hz în ~0,6 s, deci UFLS intervine înainte de 47,5 Hz.

Criterii: UFLS declanșează la 49,0 Hz; nadirul rămâne > 47,5 Hz; fără blackout; frecvența revine peste 49,0 Hz.

### T4: restabilirea prin aFRR
După incidentul din T2, cu aFRR suficient: frecvența revine la 50,00 ± 0,01 Hz în ≤ 15 min de timp simulat (timpul de restabilire din SO GL).

### T5: curba de rață
Pentru o zi reală din CSV-ul ENTSO-E pentru România: sarcina netă calculată de model (consum − solar − vânt) e egală orar cu cea calculată direct din CSV, ±10%. Testul verifică pipeline-ul de date, nu fizica.

### T6: baterie
Energia descărcată = ΔSOC · capacitate · randament de descărcare, ±0,1%. SOC rămâne în [0, 1].

### T7: determinism
Același scenariu, rulat de două ori, dă serii de frecvență identice bit cu bit.

## 4. Surse

- **[SO GL]** Regulamentul (UE) 2017/1485 (System Operation Guideline): https://eur-lex.europa.eu/eli/reg/2017/1485/oj (verificat în textul integral, 21-10-2026)
- **[NC ER]** Regulamentul (UE) 2017/2196 (Emergency and Restoration): https://eur-lex.europa.eu/eli/reg/2017/2196/oj (verificat în textul integral)
- **[RfG]** Regulamentul (UE) 2016/631 (Requirements for Generators): https://eur-lex.europa.eu/eli/reg/2016/631/oj (verificat în textul integral)
- **[A]** Synthetic-grid inertia study, IREP 2022, Tabelul I (H pe tip de combustibil): https://arxiv.org/pdf/2207.03396
- **[B]** Review of inertia and frequency control, Tabelul 1 (H pe tip de unitate): https://arxiv.org/pdf/2004.02951
- **[C]** Agora Energiewende (2017), *Flexibility in thermal power plants*, Tabelul 1 (p. 48) și Tabelele 3–4 (p. 54): https://www.agora-energiewende.org/fileadmin/Projekte/2017/Flexibility_in_thermal_plants/115_flexibility-report-WEB.pdf
- **[D]** European Utility Requirements (EUR 2012), citate în prezentarea LPSC/IN2P3 despre load-following nuclear (3–5 %/min, 100-50-100% Pn): https://lpsc-indico.in2p3.fr/event/1357/contributions/750/attachments/646/847/9_LEMNA_Nuc_SCE.pdf. Raportul OECD NEA (2011) pe aceeași temă nu a putut fi descărcat (blocat de JavaScript); de reverificat.
- **[E]** ESIG, *The importance of flexibility* (unele hidrocentrale: până la 30 %/min; sursă secundară): https://www.esig.energy/?p=5269. Plus arXiv 2409.08084, Tabelul I (pompaj: 0–100% în 2 min): https://arxiv.org/pdf/2409.08084
- **[F]** IPCC AR5 WGIII, Anexa III, mediane de emisii pe ciclul de viață: https://www.ipcc.ch/site/assets/uploads/2018/02/ipcc_wg3_ar5_annex-iii.pdf. PDF-ul IPCC nu a fost accesibil direct; valorile sunt confirmate prin surse secundare care citează anexa (inclusiv https://arxiv.org/pdf/2608.29717). De reverificat.
- **[G]** NREL (2020), *Inertia and the Power Grid: A Guide Without the Spin*, NREL/TP-6A20-73856 (invertoarele nu oferă inerție proprie; răspuns rapid de frecvență): https://www.nrel.gov/docs/fy20osti/73856.pdf
- **[H]** arXiv 2409.08084, Tabelul I (PV: 90% în 20 s): https://arxiv.org/pdf/2409.08084
- **[I]** Obererlacher (2022), TU Wien, *Identification of the self-regulating effect of load* (valori de planificare 1–2 %/Hz): https://repositum.tuwien.at/handle/20.500.12708/19704

## 5. Puncte slabe cunoscute
- [D] (nuclear), [E] (hidro), [F] (CO₂) și D se sprijină pe surse secundare. Sunt suficiente pentru un joc educațional, dar trebuie reverificate înainte de lansarea publică.
- Modelul are un singur nod: nu modelează congestii, tensiune sau separarea rețelei. Așa cum spune specificația.
