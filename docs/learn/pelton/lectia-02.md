# Lecția 2 · Head and flow

Obiectiv verificabil: utilizatorul calculează puterea pentru H = 60 m, Q = 40 L/s, e = 0,6.
Răspuns: P = 0,040 × 60 × 9,81 × 0,6 ≈ **14,1 kW** (cu g = 9,8 din S8: 14,1 kW).

## Obiectul central

Același diorama din lecția 1, cu două cote mari desenate peste el:
- **H**: verticala dintre nivelul apei din camera de încărcare și turbină;
- **Q**: o săgeată pe conductă, cu un „cub de apă” care curge.

Lângă diorama, două conducte-comparație: „cădere mare, debit mic” și „cădere mică, debit mare”, care dau aceeași putere.

## Callout-uri (UI, engleză)

| Element | Text | Afirmații |
|---|---|---|
| Head (H) | How far the water falls, in metres. Measured vertically, not along the pipe. | B2 |
| Flow (Q) | How much water passes each second, in cubic metres or litres per second. | B1 |
| Losses | Friction in the pipe, the rack and the valves eat part of the head. | B4 |
| Efficiency (e) | Turbine, generator and pipe all lose a bit. Small plants keep 50–70%. | B5 |

## Tab-uri

- **Overview:** „Two things decide how much power a stream can give: how far the water falls (head) and how much of it falls each second (flow). Double either one and the power doubles.” Rânduri: *P = Q · H · g · e* (B3) · *Head is free, flow varies over the year* (B6) · *Real plants keep 50–70%* (B5).
- **Parts:** H, Q, g și e explicate pe rând, cu unitățile lor.
- **How it works:** energia potențială a apei → putere (B1, B3); căderea brută minus pierderi dă căderea netă (B4); de ce o singură măsurătoare de debit nu spune mare lucru (B6).
- **Specs:** formula cu unități; exemplul NRCan: 10 m, 0,3 m³/s, e = 0,5 → 14,7 kW (B7).

## Simulator

- Intrări: H brută 5–150 m (implicit 60), Q 5–300 L/s (implicit 40), e 0,5–0,7 (implicit 0,6).
- Ieșiri: P în kW = Q[m³/s] · H · 9,81 · e; plus „putere brută” fără e.
- Butonul „Same power, two ways” setează (100 m, 20 L/s) și apoi (10 m, 200 L/s). Ambele dau 19,6 kW brut, iar diorama arată de ce o centrală Pelton are nevoie de cădere mare.

Valori de test (calculate de mână):
- (60 m, 40 L/s, 0,6) → 14,13 kW
- (10 m, 300 L/s, 0,5) → 14,72 kW, cu g = 9,81; cifra din S8 e 14,7 cu g = 9,8
- (100 m, 20 L/s, 1,0) = (10 m, 200 L/s, 1,0) = 19,62 kW

**Corecție față de style frame:** acolo am folosit η = 80% pe căderea brută, prea optimist pentru micro-hidro. NRCan dă e = 0,5–0,7 ca randament global, iar implicitul devine 0,6. Randamentele pe componente (turbina RETScreen) vin în lecția 8.

## Afirmații și surse

| ID | Afirmație | Surse |
|---|---|---|
| B1 | Puterea depinde de debit, de cădere și de gravitație | S8 („Site potential”); S2 §1.3 („proportional to the flow and to the head”) |
| B2 | Căderea brută e distanța verticală dintre nivelul apei sus și jos | S2 §3.4.5.1; S8 (figura „Head of micro-hydropower system”) |
| B3 | P = Q·H·g·e (kW, cu Q în m³/s); ESHA: P = Q·Hg·γ, γ = 9,81 kN/m³ | S8; S2 cap. 3 (fig. 3.1, ec. puterii pierdute), §3.6 |
| B4 | Căderea netă = brută minus pierderi (grătar, frecare în conductă, coturi, vane) | S2 §3.4.5.2; S8 („friction losses in the penstock”); S1 (pierderi hidraulice maxime, parametru de intrare) |
| B5 | Randamentul global al micro-hidro e 0,5–0,7 | S8; *a doua sursă: lanțul RETScreen (turbină × generator × pierderi) dă valori în același interval, de verificat numeric la implementare* |
| B6 | Căderea e aproape constantă, debitul variază pe parcursul anului; o măsurătoare instantanee de debit nu valorează mult | S2 §1.4 (introducere, curba de durată); S1 §2.1 (curba de durată a debitelor) |
| B7 | Exemplul: 10 m, 0,3 m³/s, e = 0,5 → 14,7 kW | S8 (exemplu explicit); recalculat de mână |
