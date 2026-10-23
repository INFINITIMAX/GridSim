# Lecția 8 · Efficiency

Obiectiv verificabil: „Citește randamentul la 50 % din debitul nominal.”
Răspuns: pentru o turbină Pelton cu un jet, curba RETScreen (H2) cu vârful ESHA de 0,89 (H3) dă **89,0 %** la 50 % din debit. Pentru turbina din lecțiile anterioare (59 m, 41,9 L/s), asta înseamnă 10,8 kW la ax.

## Obiectul central

Rotorul Pelton din L7, văzut din față, cu 1–6 duze așezate în jurul lui. Duzele active au jet, iar grosimea jetului urmează debitul pe jet.
Lângă scenă, în cardul simulatorului, stă curba de randament (η în funcție de Q/Qd), cu un punct care se mișcă pe ea.

## Callout-uri (UI, engleză)

| Piesă | Text | Afirmații |
|---|---|---|
| Runner | Turns most of the jet's power into shaft power, but never all of it. | H3 |
| Nozzles | One to six jets. With more jets the turbine keeps a good efficiency at lower flows. | H4 |
| Jet | Thinner jet, less water. The efficiency barely drops until the flow gets small. | H5 |
| Curve | Efficiency changes with the flow. One number is not enough. | H1 |

## Tab-uri

- **Overview:** „A turbine never turns all of the water's power into shaft power. How much it keeps is its efficiency, and that changes with the flow. A Pelton keeps a high efficiency over a wide range: from full flow down to about a third with one jet, and even lower with several jets.” Rânduri: *Efficiency depends on flow* (H1) · *Best Pelton: about 0.89–0.90* (H3) · *Flat down to a third of the flow* (H4, H5).
- **Parts:** rotorul, duzele, jetul, curba.
- **How it works:**
  - randamentul turbinei e puterea la ax împărțită la puterea hidraulică, și depinde de debit (H1);
  - curba RETScreen pentru Pelton: un vârf la ~2/3 din debitul de proiect, apoi o scădere lentă spre debitul plin și una rapidă spre debitele mici (H2, H7);
  - de la debitul plin până la ~60 %, randamentul se schimbă doar cu 2–3 % (H5);
  - mai multe jeturi țin randamentul sus la debite mici; o turbină cu mai multe jeturi poate închide o parte din ele (H4, H6).
- **Specs:**
  - randamentul maxim: 0,89 cu un jet, 0,90 cu mai multe (H3);
  - domeniul bun: 30–100 % din debit cu un jet, 10–100 % cu mai multe (H4).

## Simulator: „Turn down the flow”

- Intrări:
  - debitul, în % din debitul de proiect, 10–100, pas 1 (implicit 50);
  - numărul de jeturi j, `<select>` 1–6 (implicit 1).
  - Fixe: H netă = 59 m și Qd = 41,9 L/s (din L4 și L6); vârful ep = 0,89 pentru j = 1 și 0,90 pentru j ≥ 2 (H3).
- Formule:
  - Qp = (0,662 + 0,001·j)·Qd;
  - η = [1 − (1,31 + 0,025·j)·|(Qp − Q)/Qp|^(5,6 + 0,4·j)]·ep;
  - P = 9,81·Q·H·η (kW, cu Q în m³/s).
  - **Atenție la transcriere:** (1,31 + 0,025j) înmulțește puterea, nu e ridicat la putere. Așa scrie S1 HYDRO.40 și așa implementează S20, linia 461.
- Ieșiri:
  - η la debitul ales (%);
  - debitul de randament maxim Qp (% din Qd);
  - puterea la ax P (kW);
  - curba η(Q/Qd) de la 10 % la 100 %, cu un punct la debitul ales.
- Nota de limită: „RETScreen curve, peak from ESHA; real curves vary by maker”.
- **Simplificare declarată:** RETScreen și ESHA dau ep și din diametrul rotorului (ep = 0,864·d^0,04). Noi nu folosim formula aceea, pentru că formula de turație RETScreen dă la 42 L/s un rotor de 7,8 m, nerealist (vezi L9). Vârful vine din tabelul ESHA 6.7.

Valori de test (calculate de mână):

| j | Q/Qd | η | P (kW) |
|---|---|---|---|
| 1 | 0,5 | **0,8897** | **10,79** |
| 1 | 1,0 | 0,8695 | 21,09 |
| 1 | 0,2 | 0,7522 | 3,65 |
| 2 | 0,5 | 0,8998 | 10,91 |
| 2 | 0,2 | 0,7765 | 3,77 |

- Qp: 66,3 % pentru j = 1 și 66,4 % pentru j = 2.
- η relativ (η/ep) la j = 1: 0,7135 la 0,15; 0,8452 la 0,2; 0,9640 la 0,3; 0,9997 la 0,5; 0,9770 la 1,0.
- **Control extern 1 (S17 și S19):** de la debitul plin la 60 %, randamentul unui Pelton cu un jet se schimbă cu 2–3 %. Curba noastră: (η(0,6) − η(1,0))/η(0,6) = **2,30 %**. Test: între 2 % și 3 %.
- **Control extern 2 (S19 fig. 6.30, Pelton 1 nozzle, η/ηmax citit de pe grafic):**

| Q/Qd | ESHA | RETScreen | Δ (pp) |
|---|---|---|---|
| 0,15 | 0,65 | 0,714 | +6,4 |
| 0,2 | 0,79 | 0,845 | +5,5 |
| 0,3 | 0,89 | 0,964 | +7,4 |
| 0,4 | 0,935 | 0,995 | +6,0 |
| 0,5 | 0,963 | 1,000 | +3,7 |
| 0,6 | 0,977 | 1,000 | +2,3 |
| 0,7 | 0,988 | 1,000 | +1,2 |
| 0,8 | 0,996 | 1,000 | +0,4 |
| 0,9 | 1,000 | 0,997 | −0,3 |
| 1,0 | 1,000 | 0,977 | −2,3 |

  Cele două curbe „tipice” nu se suprapun. RETScreen e mai optimistă la debite mici și pune vârful mai devreme. Test: |Δ| ≤ 8 pp în toate punctele; maximul măsurat e 7,4 pp. Toleranța de ±2 pp promisă în promptul aprobat **nu** se poate atinge cu aceste surse. Dacă formula ar fi transcrisă greșit, cu coeficientul ridicat la putere, la 0,2 ar ieși 0,344 (Δ −45 pp), iar testul ar pica.

## Afirmații și surse

| ID | Afirmație | Surse |
|---|---|---|
| H1 | Randamentul turbinei se schimbă cu debitul; de aceea se lucrează cu o curbă de randament, nu cu o singură valoare | S19 §6.2.5 („When the flow deviates from that nominal discharge so does the turbine's hydraulic efficiency”); S1 §2.3.1 (curbe de randament standard pe tip de turbină); S2 §3.6 („its efficiency is a function of the operating discharge”) |
| H2 | Curba RETScreen pentru Pelton: Qp = (0,662 + 0,001j)·Qd și η = [1 − (1,31 + 0,025j)·\|(Qp − Q)/Qp\|^(5,6 + 0,4j)]·ep | S1 HYDRO.40; S20 liniile 458–461 |
| H3 | Randamentul maxim tipic al unei turbine Pelton mici: 0,89 cu o duză, 0,90 cu mai multe | S19 tab. 6.7; S7 („For a pelton wheel, overall efficiency is between 0.85–0.90”) |
| H4 | Un Pelton cu un jet are randament bun între ~30 % și 100 % din debit; unul cu mai multe jeturi, de la 10–20 % | S19 §6.2.1 („good from 30% to 100% … for a one-jet turbine and from 10% to 100% for a multi-jet one”); S17 („high efficiency operation up to around 20% of maximum discharge for two-nozzle turbines”); S19 §6.2.5 („Pelton turbines can operate satisfactorily … upwards from about one fifth of rated discharge”) |
| H5 | De la debitul plin până la ~60 % din el, randamentul unui Pelton cu un jet se schimbă doar cu 2–3 % | S17 („efficiency change is about 2–3% against discharge change of around 40% from needle full-open”); S19 fig. 6.30 (1,000 → 0,977) |
| H6 | O turbină cu mai multe jeturi, fiecare cu vana lui, poate lucra la debite diferite închizând o parte din jeturi | S16 („Varying the number of jets … it can be run at different flow rates by simply altering the number of jets”); S19 §6.2.5 (multi-jet bun de la 10 %) |
| H7 | În modelul RETScreen, randamentul maxim al unui Pelton e la ~66 % din debitul de proiect | S1 HYDRO.40 (Qp = (0,662 + 0,001j)·Qd); S20 linia 458. Atenție: ESHA fig. 6.30 pune vârful mai sus (~0,85–1,0), deci UI-ul spune „in the RETScreen model”, nu prezintă vârful ca fapt general |
