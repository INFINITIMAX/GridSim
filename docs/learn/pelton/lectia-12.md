# Lecția 12 · The whole chain

Obiectiv verificabil: „Urmărește unde se pierde energia între pârâu și priză.”
Răspuns, pentru centrala noastră la debitul plin (60 m brut, 41,9 L/s):
- puterea hidraulică brută ρgQH = **24,7 kW**;
- după conductă, 24,2 kW (L4);
- după turbină, 21,1 kW cu randamentul tipic de fabricant (L8), sau 18,2 kW cu randamentul de 75 % al unei turbine mici;
- după generator, **19,2 kW** (0,91) sau **14,5 kW** (0,80).

Randamentul global iese 78 % în primul caz și 59 % în al doilea. Al doilea cade în intervalul de 0,5–0,7 folosit pentru micro-hidro (L3, L4), iar 14,5 kW e exact puterea din L6.

## Obiectul central

Toată centrala din L1 (`plant.ts`), refolosită, cu o „bandă de energie” care curge de la priză la casă. Banda e o panglică lată, iar lățimea ei pe fiecare porțiune e proporțională cu puterea rămasă. La fiecare treaptă se desprinde o fâșie gri subțire care arată pierderea:
- conducta (frecare);
- turbina;
- generatorul.

Animație: banda se îngustează când se schimbă intrările.

## Callout-uri (UI, engleză)

| Piesă | Text | Afirmații |
|---|---|---|
| Stream | Starts with ρ·g·Q·H: all the power the falling water could give. | L1 |
| Penstock | Friction takes a slice (lesson 4). | L1 |
| Turbine | The biggest slice: no turbine is perfect (lesson 8). | L1, L4 |
| Generator | Another slice, larger for small machines. | L1, L4 |
| Village | What is left, times the hours it is used, is the energy per year. | L2 |

## Tab-uri

- **Overview:** „Follow the power from the stream to the plug. Every step keeps most of it but loses a slice: friction in the pipe, the turbine, the generator. Multiply the efficiencies and you get the overall efficiency; multiply the power by the hours it is really used and you get the energy per year.” Rânduri: *P = ρ·g·Q·H · ηturbine · ηgenerator* (L1) · *Small plants: 50–70 % overall* (L3) · *kWh per year = kW × 8760 × load factor* (L2, L5).
- **Parts:** pârâul, conducta, turbina, generatorul, satul.
- **How it works:**
  - puterea livrată e puterea hidraulică brută minus pierderile din conductă, înmulțită cu randamentul turbinei și cu cel al generatorului (L1);
  - mașinile mici au randamente mai mici decât cele tipice de fabricant (L4);
  - de aici randamentul global de 50–70 % pentru micro-hidro (L3);
  - energia anuală = puterea × 8760 h × factorul de încărcare (L2, L5).
- **Specs:**
  - turbina: 0,89 (fabricant, ESHA) față de ~0,75 (turbină mică); generatorul: 0,91 față de ~0,80 (L4);
  - randamentul global la micro-hidro: 0,5–0,7 (L3).

## Simulator: „Follow the energy”

- Intrări:
  - debitul, `flow` 10–100 % din Qd = 41,9 L/s, pas 1 (implicit 100);
  - setul de mașini, `select name=machines`: `maker` („Maker's best: turbine curve, generator 0.91”, implicit) și `small` („Small micro set: turbine 0.75, generator 0.80”);
  - factorul de încărcare, `load` 10–100 %, pas 5 (implicit 40).
  - Fixe: H brută = 60 m; conducta din L4 (PE, 200 mm, 150 m).
- Formule:
  - Q = q·Qd;
  - P_brut = 9,81·Q·60 (kW, Q în m³/s);
  - hf = `frictionLossM(swameeJainF(...), 150, 0.2, V)` la debitul Q, ca în L4;
  - P_net = P_brut·(60 − hf)/60;
  - P_ax = P_net·η_t, cu η_t = `turbineEfficiency(q, 1)` la `maker` și 0,75 la `small`;
  - P_el = P_ax·η_g, cu η_g = 0,91 la `maker` și 0,80 la `small`;
  - randamentul global = P_el/P_brut;
  - E = P_el·8760·factor (kWh/an).
- Ieșiri:
  - `gross`, `net`, `shaft`, `elec` (kW, 1 zecimală);
  - `overall` (%, 1 zecimală);
  - `energy` (kWh/an, rotunjit la 100 kWh, cu separator de mii „67,200”);
  - banda din scenă urmează cele patru puteri.
- Nota de limită: „no transformer, cable or controller losses; set efficiencies, not measured”.
- Simplificare declarată: setul `small` are un randament de turbină constant, 0,75 (S13 dă o singură valoare, nu o curbă).

Valori de test (calculate de mână, cu funcțiile L4 și L8):

| Debit | Set | hf (m) | Brut | Net | Ax | El. | Global | kWh/an la 40 % |
|---|---|---|---|---|---|---|---|---|
| 100 % | maker | 1,062 | **24,66** | 24,23 | 21,06 | **19,17** | **77,7 %** | 67 167 → „67,200” |
| 100 % | small | 1,062 | 24,66 | 24,23 | 18,17 | **14,53** | **58,9 %** | 50 932 → „50,900” |
| 50 % | maker | 0,304 | 12,33 | 12,27 | 10,92 | 9,93 | 80,6 % | 34 807 → „34,800” |
| 50 % | small | 0,304 | 12,33 | 12,27 | 9,20 | 7,36 | 59,7 % | 25 794 → „25,800” |

- **Control extern 1:** două surse calculează independent aceeași centrală, 10 m și 0,3 m³/s:
  - S8 (NRCan) cu e = 0,5 și g = 9,8: **14,7 kW**;
  - S13 (Holland) cu e = 0,6: „approximately 18 kW”.

  Formula noastră, P = 9,81·Q·H·e (`powerKW`), dă 14,72 kW cu e = 0,5 (14,70 kW cu g = 9,8, ca în sursă) și 17,66 kW cu e = 0,6.

  Test: ≤ 0,5 % față de 14,7 și ≤ 2 % față de 18. Valoarea de 18 e rotunjită în sursă: 17,66 e la 1,9 % de ea.
- **Control extern 2 (S13):** „overall conversion efficiency… 60 %… (turbine 75 % and generator 80 %)”. Setul `small` reproduce produsul: 0,75 × 0,80 = 0,60. Cu pierderea din conductă de 1,8 %, globalul ajunge la 58,9 %, în intervalul NRCan 0,5–0,7. Test: între 0,5 și 0,7.
- **Control extern 3 (S1 ec. 7 și 19):**
  - P = ρgQ(H_g − h_hydr)·e_t·e_g·(1 − l_trans)(1 − l_para), cu l_trans = l_para = 0 → aceeași structură ca formula noastră;
  - factorul de capacitate K = E/(8760·P_des);
  - test: E/(8760·P_el) redă factorul de încărcare ales.

## Afirmații și surse

| ID | Afirmație | Surse |
|---|---|---|
| L1 | Puterea electrică livrată e ρ·g·Q·(H brută − pierderi)·η_turbină·η_generator (plus alte pierderi mici: multiplicator, transformator) | S1 HYDRO.22 ec. 7; S2 §3.6 („E = W x Qmedian x H x ηturbine x ηgenerator x ηgearbox x ηtransformer x γ x h”) |
| L2 | Energia anuală e puterea înmulțită cu orele din an (8760) și cu partea din timp sau din capacitate folosită efectiv | S1 HYDRO.28 ec. 19 („K = Edlvd / (8760 Pdes)”); S2 §3.6 („h = number of hours”); S13 („load factor, which is a ratio of power consumption over a specified period of time to the available capacity”) |
| L3 | Randamentul global al unei micro-hidrocentrale e de ordinul 50–70 % | S8 („e = efficiency factor (0.5 to 0.7)”); S13 („overall conversion efficiency (generator and turbine losses combined) is taken to be 60%”) |
| L4 | Mașinile mici au randamente sub cele tipice de fabricant: o turbină mică ~75 % față de 0,89 la un Pelton bun; un generator mic ~80 % față de 0,91 la 10 kW | S13 („The efficiency of a small turbine is typically 75% and generator efficiency 80%”); S19 tab. 6.7 (Pelton 1 nozzle 0,89) și tab. 6.8 (10 kW: 0,910); S19 fig. 6.28 (o turbină reală fără dezvoltare de laborator, sub curba garantată) |
| L5 | Factorul de încărcare: raportul dintre energia consumată și cea pe care centrala ar putea-o produce | S13 (definiția de mai sus); S1 ec. 19 (factorul de capacitate). Valoarea implicită de 40 % e un parametru de model; „40 % e tipic” are o singură sursă (S13), deci nu apare pe ecran ca afirmație |
| L6 | Exemplele: 10 m, 0,3 m³/s → 14,7 kW cu e = 0,5 (S8), ~18 kW cu e = 0,6 (S13) | S8; S13. Fiecare sursă își dă propriul exemplu, deci intră doar în teste, ca valori de control |
