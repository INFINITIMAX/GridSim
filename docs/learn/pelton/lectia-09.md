# Lecția 9 · Speed, size, choice

Obiectiv verificabil: „Alege tipul de turbină pentru o pereche (H, Q) dată.”
Răspuns, pentru centrala noastră (H netă 59 m, Q 41,9 L/s):
- la 750 rpm, viteza specifică e n_QE = 0,0217, în domeniul Pelton cu un jet (0,005–0,025), deci **Pelton cu un jet**, cu diametrul D1 = 0,42 m (I1, I2, I5);
- la 1500 rpm, n_QE = 0,0434 nu mai încape la un jet. Merge doar cu 4 jeturi (I3).

## Corecție față de programă

Programa trecea pentru L9 formulele RETScreen n = 31·(H·Qd/j)^0,5 și d = 49,4·H^0,5·j^0,02/n. Le-am verificat:
- scrise așa în S1 HYDRO.40 (imaginea paginii);
- implementate identic de INL în S20, linia 455.

La centrala noastră, însă, dau n = 48,7 rpm și un rotor de 7,8 m pentru 15 kW, ceea ce e nerealist. n_QE ar fi 0,0014, sub domeniul Pelton. Formula e o regresie făcută pe centrale mai mari și nu se extrapolează la 42 L/s.

Folosim în schimb metoda ESHA (S19 §6.2.2–6.2.4): alegi turația unui generator standard, calculezi n_QE, citești tipul din tabelul de domenii și diametrul din ec. 6.16. Metoda reproduce exact exemplele lucrate din ESHA (vezi controalele externe). Formulele RETScreen nu apar în UI.

## Obiectul central

O tablă de birou cu harta n_QE în funcție de H, pe scară logaritmică. Pe ea, benzile de domeniu din ESHA tab. 6.2:
- Pelton, care se lărgește cu numărul de jeturi;
- Francis;
- Kaplan.

Benzile sunt tăiate pe orizontală la domeniile de cădere din tab. 6.3. Punctul ales se mișcă pe hartă.

Lângă tablă stă rotorul Pelton din `makeRunner`, scalat după D1, lângă un generator din `makeGenerator` de mărime fixă, ca referință.

## Callout-uri (UI, engleză)

| Piesă | Text | Afirmații |
|---|---|---|
| Map | One number, the specific speed, sums up head, flow and speed. It tells which runner shape fits. | I1 |
| Pelton band | High heads, small flows. More jets widen the band. | I2, I3, I4 |
| Francis band | Medium heads and flows. | I2, I4 |
| Kaplan band | Low heads, big flows. | I2, I4 |
| Runner | Its size follows from the head and the speed. | I5 |
| Generator | Turns at a fixed standard speed. The turbine must match it, or a gearbox or belt is needed. | I6 |

## Tab-uri

- **Overview:** „Head, flow and the speed of the generator together decide the runner. Engineers squeeze them into one number, the specific speed: small for high heads and little water (Pelton), larger for medium heads (Francis), largest for low heads and lots of water (Kaplan).” Rânduri: *n_QE = n·√Q / (gH)^¾* (I1) · *Each turbine has its band* (I2, I4) · *More jets, faster runner* (I3).
- **Parts:** harta, benzile Pelton, Francis și Kaplan, rotorul, generatorul.
- **How it works:**
  - viteza specifică (I1);
  - domeniile pe tip de turbină și pe cădere (I2, I4);
  - mai multe jeturi lasă rotorul să fie mai mic și să meargă mai repede (I3);
  - diametrul Pelton din cădere și turație (I5);
  - turația standard a generatorului (I6, detaliat în L10).
- **Specs:**
  - domeniile n_QE: Pelton cu un jet 0,005–0,025, cu j jeturi ×√j, Francis 0,05–0,33, Kaplan 0,19–1,55 (I2);
  - domeniile de cădere: Pelton 50–1300 m, Francis 25–350 m, Kaplan 2–40 m (I4).

## Simulator: „Pick the turbine”

- Intrări:
  - H netă (`input type=number name=head`), 2–1000 m (implicit 59);
  - Q (`input type=number name=flow`), 10–50 000 L/s (implicit 41,9);
  - turația (`select name=speed`): 3000, 1500, 1000, 750, 600, 500 rpm (implicit 750);
  - numărul de jeturi (`select name=jets`): 1–4 (implicit 1).
  - Valorile în afara intervalului se limitează la capete.
- Formule:
  - n_QE = (rpm/60)·√(Q[m³/s]) / (9,81·H)^0,75;
  - D1 = 0,68·√H / (rpm/60) (m).
  - Un tip „se potrivește” dacă n_QE e în banda lui **și** H e în domeniul lui de cădere:

| Tip | Banda n_QE | Cădere (m) |
|---|---|---|
| Pelton cu j jeturi | 0,005·√j ≤ n_QE ≤ 0,025·√j | 50–1300 |
| Francis | 0,05–0,33 | 25–350 |
| Kaplan | 0,19–1,55 | 2–40 |

- Ieșiri:
  - n_QE, cu 4 zecimale;
  - D1 (m, 2 zecimale), afișat doar dacă se potrivește Pelton;
  - verdictul: lista tipurilor care se potrivesc, de ex. „Pelton (1 jet)” sau „Francis”. Dacă nu se potrivește niciunul: „No standard runner — try another speed or more jets”.
- Nota de limită: „first estimate only — makers give the real size”.

Valori de test (calculate de mână):

| H (m) | Q (L/s) | rpm | j | n_QE | Verdict | D1 |
|---|---|---|---|---|---|---|
| 59 | 41,9 | 750 | 1 | **0,0217** | Pelton (1 jet) | **0,42 m** |
| 59 | 41,9 | 1500 | 1 | 0,0434 | niciunul | — |
| 59 | 41,9 | 1500 | 4 | 0,0434 | Pelton (4 jets) | 0,21 m |
| 59 | 41,9 | 1000 | 1 | 0,0289 | niciunul | — |
| 10 | 5000 | 500 | 1 | 0,5978 | Kaplan | — |

- Cazurile-limită de evitat în teste: j = 3 la 1500 rpm dă 0,04337, față de limita 0,0433.
- **Control extern 1 (S19, p. 176):** 100 m, 0,9 m³/s, 1500 rpm → n_QE = **0,135**, „only possible selection is a Francis”. Calculat: 0,1353; verdictul: Francis. Test: ≤ 1 %.
- **Control extern 2 (S19, p. 177):** 400 m, 0,42 m³/s, 1000 rpm → n_QE = **0,022**, Pelton cu un jet, D1 = **0,815 m**. Calculat: 0,02179 și 0,816 m. Test: ≤ 1 % (0,022 e rotunjit în sursă, deci toleranța se raportează la 0,0218 ± 1 %).
- Notă: ESHA spune pentru 100 m / 0,9 m³/s că „poate merge și un Pelton cu 4 duze la 600 rpm”. Calculat: n_QE = 0,0541, puțin peste limita de 0,050 a benzii cu 4 jeturi. Sursa e generoasă la margine; nu facem test pe acest caz.

## Afirmații și surse

| ID | Afirmație | Surse |
|---|---|---|
| I1 | Viteza specifică leagă căderea, debitul și turația într-un singur număr care caracterizează forma rotorului; n_QE = n·√Q / E^¾, cu n în rot/s și E = gH | S19 ec. 6.5 („nQE is known as specific speed. These parameters characterise any turbine”); S17 §3.1 („Specific speed is a constant widely used in selecting the type of turbines”, ns = N·√P / H^5/4); conversia ns ≈ 995·n_QE (S19 ec. 6.8) |
| I2 | Domeniile de viteză specifică: Pelton cu o duză 0,005–0,025, Francis 0,05–0,33, Kaplan 0,19–1,55 | S19 tab. 6.2; S17 tab. 3.1 (în ns, m-kW: Pelton 12–25 ≈ n_QE 0,012–0,025; Francis 50–350 ≈ 0,05–0,35; bulb și tubulare 500–950 ≈ 0,5–0,95) |
| I3 | La Pelton, viteza specifică crește cu rădăcina pătrată a numărului de jeturi: cu mai multe jeturi, rotorul e mai mic și se învârte mai repede | S19 §6.2.2 („the specific speed increases with the square root of the number of jets”); S16 („two or more jets … allow a smaller runner … and hence an increased rotational speed”); S17 (ns cu P/2 pentru două duze) |
| I4 | Pelton se folosește la căderi mari, Francis la căderi medii, Kaplan la căderi mici (Pelton 50–1300 m, Francis 25–350 m, Kaplan 2–40 m) | S19 tab. 6.3; S17 tab. 3.1 (Pelton 75–500 m, Francis 20–300 m); S1 HYDRO.8 („impulse turbines” pentru căderi mari, reacțiune pentru căderi mici–medii) |
| I5 | Diametrul cercului cupelor Pelton se estimează din cădere și turație: D1 = 0,68·√H / n (n în rot/s) | S19 ec. 6.16; S7 și S18 (D = 60u/(πN) cu u = 0,43–0,48·√(2gH), adică un coeficient de 0,61–0,68) |
| I6 | Turbina trebuie să se potrivească cu o turație standard de generator (3000, 1500, 1000, 750… rpm la 50 Hz), altfel e nevoie de un multiplicator de turație | S19 §6.2.4 și tab. 6.5; S1 HYDRO.9 („Speed increaser to match the ideal rotational speed of the turbine to that of the generator”) |
| I7 | Exemplele lucrate: 100 m / 0,9 m³/s / 1500 rpm → n_QE 0,135, Francis; 400 m / 0,42 m³/s / 1000 rpm → n_QE 0,022, Pelton cu un jet, D1 0,815 m | S19 p. 176–177; *a doua sursă de găsit*, deci doar control în teste |
