# Lecția 11 · Load controller

Obiectiv verificabil: „Ce se întâmplă cu frecvența dacă consumatorii se opresc și nu există ELC?”
Răspuns: turbina primește la fel de multă apă, dar nu mai are cui să dea puterea. Surplusul accelerează rotorul (K4), deci turația și frecvența cresc spre turația de ambalare. În modelul nostru, cu o cupă ideală, frecvența urcă de la 50 Hz la **81,6 Hz în 2 s** și tinde spre 100 Hz (K6). Cu regulatorul electronic de sarcină (ELC), surplusul trece în rezistența de balast, sarcina generatorului rămâne aceeași, iar frecvența rămâne **50,0 Hz** (K2).

## Obiectul central

Agregatul din L10, cu cablul spre un mic sat stilizat (3–4 case cu becuri) și cu o cutie ELC lângă generator. Pe cutie e montată rezistența de balast, sub forma unui radiator cu spirale.

Animații:
- becurile caselor se aprind după consumul ales;
- spiralele rezistenței de balast se înroșesc proporțional cu puterea de balast;
- fără ELC, rotorul se învârte vizibil mai repede după pornirea simulării, iar indicatorul de frecvență urcă și se înroșește.

## Callout-uri (UI, engleză)

| Piesă | Text | Afirmații |
|---|---|---|
| Village | Lights switch on and off all day. The generator must still see a steady load. | K1, K2 |
| ELC | Measures the frequency and sends any power the village does not use to the ballast. | K2 |
| Ballast | A resistor that burns the spare power. The water flow never changes. | K2 |
| Generator | Its speed sets the frequency. Spare power would speed it up. | K1, K4 |
| Flywheel | Inertia slows speed changes down, but cannot stop them. | K5 |

## Tab-uri

- **Overview:** „In a small isolated grid nobody else holds the frequency. If the village switches its lights off and the turbine keeps its water, the spare power speeds the machine up. A load controller keeps the generator's total load constant: whatever the village does not use goes into a ballast resistor.” Rânduri: *Spare power speeds the machine up* (K1, K4) · *ELC: constant load, constant frequency* (K2) · *Simpler than moving the spear* (K3).
- **Parts:** satul, ELC-ul, rezistența de balast, generatorul, volantul.
- **How it works:**
  - într-o rețea izolată, frecvența urmează turația turbinei. Când sarcina scade, turbina accelerează (K1);
  - ecuația mișcării de rotație: J·dω/dt = T_turbină − T_sarcină (K4);
  - inerția (volantul) încetinește schimbarea, dar nu o oprește (K5);
  - fără nicio reglare, turbina aleargă spre turația de ambalare (K6);
  - ELC-ul ține debitul constant și mută surplusul în balast, iar la micro-hidro e mai simplu și mai ieftin decât un regulator de debit (K2, K3).
- **Specs:**
  - ELC-urile sunt folosite la centrale mici, de obicei sub 100–200 kW (K3);
  - turbina noastră: P₀ = 14,6 kW (L6), timp de pornire t_m = 2 s (parametru de model, vezi mai jos).

## Simulator: „Switch off the village”

- Intrări:
  - consumul satului după pas, `load` 0–100 % din P₀, pas 5 (implicit 0, adică „toată lumea stinge lumina”);
  - `<input type=checkbox name=elc>`, implicit bifat;
  - butonul `[data-run]` „Run 10 s” pornește simularea: la t = 0 consumul sare de la 100 % la valoarea aleasă.
- Model (cod pur, integrat cu RK4, pas 1 ms):
  - viteza relativă w = ω/ω₀ și frecvența f = 50·w;
  - **puterea turbinei la viteza w** (Pelton, debit constant): P_t/P₀ = w·(2 − w). Rezultă direct din G3 cu r = 0,5·w: P ∝ (1 − r)·r, normalizat la 1 în r = 0,5;
  - ecuația K4, scrisă cu timpul de pornire t_m = J·ω₀²/P₀ (S19 ec. 6.33): t_m · w · dw/dt = (P_t − P_sarcină)/P₀;
  - fără ELC: P_sarcină = consumul satului, considerat putere constantă (simplificare declarată);
  - cu ELC, ideal și instantaneu (K2, S13 „adjustments are made instantaneously”): P_balast = max(0, P_t − P_sat), deci P_sarcină = P_t și w rămâne 1.
- Parametru de model t_m = 2 s:
  - S19 cere t_m / t_w > 4 pentru o reglare bună;
  - pentru conducta noastră, t_w = L·V/(gH) = 150 × 1,273 / (9,81 × 60) = 0,32 s, deci t_m ≥ 1,3 s;
  - 2 s respectă regula. Valoarea nu e o afirmație despre o mașină reală.
- Ieșiri:
  - frecvența la 1 s și la 10 s (Hz, 1 zecimală);
  - puterea de balast și puterea satului după pas (kW, 1 zecimală);
  - un grafic SVG f(t) pe 0–10 s, cu axa 40–100 Hz și o linie la 50 Hz;
  - un avertisment vizibil doar când f depășește 55 Hz: „Frequency far above 50 Hz: lamps and motors would be damaged.” (K8).
- Nota de limită: „ideal bucket and instant ELC; the real runaway speed is a bit lower”.

Valori de test (calculate de mână):
- P₀ = `powerKW(59, 41.9, 0.6)` = **14,55 kW**.
- Fără ELC, consum 0 %:
  - soluție analitică w(t) = 2 − e^(−t/t_m) (din t_m·dw/dt = 2 − w);
  - f(1 s) = **69,7 Hz**, f(2 s) = 81,6 Hz, f(10 s) = **99,7 Hz**;
  - valoarea finală: 100 Hz (w = 2).
- Fără ELC, consum 50 %:
  - f(1 s) = 60,9 Hz, f(10 s) = 84,7 Hz (RK4);
  - echilibrul: w = 1 + √(1 − 0,5) = 1,7071, adică 85,4 Hz.
- Cu ELC, orice consum: f = 50,0 Hz tot timpul. La consum 0 %: balast 14,6 kW, sat 0,0 kW. La 50 %: balast 7,3 kW, sat 7,3 kW.
- **Control extern 1 (S19 ec. 6.34 și regula t_m/t_w > 4):** t_w = 0,324 s, sub limita realistă de 2,5 s din S19. Raportul t_m/t_w = 6,2 > 4.
- **Control extern 2 (S19 tab. 6.6):** turația de ambalare a unei turbine Pelton reale este 1,8–1,9 × turația nominală. Modelul nostru dă 2,0×, pentru că cupa e ideală (k = 1, G8). Test: raportul model / ESHA ∈ [1,05; 1,12]. Diferența e declarată în nota de limită.
- **Control intern:** RK4 față de soluția analitică pentru consum 0 %: ≤ 0,01 Hz.

## Afirmații și surse

| ID | Afirmație | Surse |
|---|---|---|
| K1 | Într-o rețea izolată, frecvența e dată de turația turbinei; dacă sarcina scade și debitul rămâne același, turbina accelerează | S19 §6.5 („In schemes connected to an isolated network, the parameter that needs to be controlled is the turbine speed, which controls the frequency… If the load decreases the turbine will tend to increase its speed”); S13 p. 19 („this frequency is controlled by the speed of the alternator”) |
| K2 | Regulatorul electronic de sarcină ține debitul constant și trimite puterea neconsumată într-o rezistență de balast, astfel încât sarcina totală a generatorului și frecvența rămân constante | S19 §6.5 („the extra energy can be dumped into an electric ballast load… an electronic load governor switches on pre-set resistance and so maintains the system frequency”); S17 §3.3 („Dummy Load Governor… keeps the frequency constant by adjusting the dummy load automatically so that power generation and load become the same”); S13 App. I („the electronic controller varies the amount of power that is fed into a ‘ballast’ load”) |
| K3 | La micro-hidro, reglarea electronică a sarcinii e mai simplă și mai ieftină decât reglarea debitului; se folosește la centrale mici (sub ~100–200 kW) | S13 p. 19 („a more economic (and more precise) method for micro hydro plants is to use electronic load control”); S19 §6.5 („reliable and inexpensive electronic load governor… rarely exceed 100 kW capacity”); S17 §3.3 („For units less than 200 kW, a Dummy Load Governor may be applied”) |
| K4 | Ecuația mișcării de rotație: J·dω/dt = T_turbină − T_sarcină; puterea este cuplul înmulțit cu viteza unghiulară | S19 ec. 6.32; S21 §10.7 („the sum of the torques equals the moment of inertia times the angular acceleration”) și §10.8 (P = τω) |
| K5 | Inerția pieselor care se rotesc, mărită cu un volant, netezește variațiile de turație | S19 §6.4.1 („A flywheel is frequently used to smooth-out speed variations”) și §6.5 („the power excess accelerates the flywheel… helps to minimise speed variation”); S21 §10.7 (la același cuplu, accelerația unghiulară scade când momentul de inerție crește) |
| K6 | Fără reglare, la pierderea sarcinii turbina accelerează până la turația de ambalare | S19 §6.5 („when the generator is disconnected from the mains the turbine accelerates up to runaway speed”) și §6.2.4 (definiția turației de ambalare: „the speed which the unit can theoretically attain in case of load rejection”); G8 (S7, S18): fără sarcină, cupa ajunge la viteza jetului |
| K7 | Căldura din rezistența de balast poate fi folosită, de exemplu la încălzire | S13 App. I („The power consumed by the ballast circuit can be used for heating”); S19 §6.5 („electric ballast load”) — *a doua sursă pentru „încălzire” de găsit*, deci K7 nu apare pe ecran |
| K8 | Dacă turația nu e ținută constantă, aparatele alimentate se pot defecta | S13 p. 19 („Failure to keep the speed constant can result in damage to electrical machines being fed from the supply”); S19 §6.6 (obligația legală de a menține calitatea alimentării în limite definite) |
