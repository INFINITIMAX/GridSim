# Lecția 6 · Nozzle & spear

Obiectiv verificabil: „Calculează viteza jetului la H = 60 m.”
Răspuns: v = Cv·√(2gH) = 0,98 × √(2 × 9,81 × 60) = **33,6 m/s** (F1, F2). Cu căderea netă din L4 (59,0 m): 33,3 m/s.

## Obiectul central

Duza Pelton în secțiune, mare, ca obiect de birou: capătul conductei, corpul duzei, acul (spear) care alunecă în interior, jetul care iese și primele cupe ale rotorului. Deasupra jetului, deflectorul, o placă pe pivot.
Animații:
- acul înaintează sau se retrage odată cu slider-ul, iar jetul se subțiază sau se îngroașă;
- deflectorul se rotește în jet și îl abate de la cupe, în timp ce apa continuă să curgă.

## Callout-uri (UI, engleză)

| Piesă | Text | Afirmații |
|---|---|---|
| Nozzle | Turns the water's pressure into a fast jet. | F1 |
| Spear | Slides inside the nozzle to make the jet thinner or thicker. That is how the flow is set. | F3 |
| Jet | Its speed depends only on the head, not on how open the spear is. | F2 |
| Deflector | Swings into the jet and turns it away from the buckets in an instant. | F4 |
| Runner | Takes the jet's energy (lesson 7). | F1 |

## Tab-uri

- **Overview:** „At the bottom of the pipe all the head becomes speed. The nozzle shapes the water into one fast jet, the spear sets how much water flows, and the deflector can push the jet away from the runner in an instant.” Rânduri: *v = Cv · √(2gH)* (F2) · *The spear sets the flow* (F3) · *The deflector stops power, not water* (F4, F5).
- **Parts:** duza, acul, jetul, deflectorul, rotorul (detaliat în L7).
- **How it works:**
  - presiunea se transformă în viteză, toată energia potențială devine energie cinetică înainte ca jetul să lovească cupele (F1);
  - de ce viteza nu depinde de deschiderea acului (F2, F3);
  - deflectorul și acul lucrează împreună: deflectorul abate jetul imediat, iar acul închide apoi încet. Așa se evită lovitura de berbec din L5 (F5).
- **Specs:** Cv ≈ 0,98–0,99 (F2); viteza jetului la 60 m: 33,6 m/s (F2). Exemplul S7 (F6) rămâne doar control în teste: are o singură sursă.

## Simulator: „Open the spear”

- Intrări:
  - H netă 20–200 m (implicit 59, din L4);
  - deschiderea acului 10–100 % (implicit 100);
  - comutatorul „Deflector in”, implicit oprit.
  - Fixe: Cv = 0,98 și duza cu d₀ = 40 mm.
- Ieșiri:
  - viteza jetului v = Cv·√(2gH) (F2);
  - aria jetului A = deschiderea × π·d₀²/4. Simplificare declarată: aria e proporțională cu deschiderea acului, deși la o duză reală dependența nu e liniară;
  - debitul Q = v·A, în L/s;
  - puterea către rotor P = Q·H·g·e, cu e = 0,6 ca în L2, sau 0 kW cu deflectorul pus;
  - cu deflectorul pus, debitul afișat rămâne același, iar eticheta spune „Water still flows: no water hammer”.

Valori de test (calculate de mână, g = 9,81):
- H = 60 m → v = **33,62 m/s**; H = 59 m → v = 33,34 m/s.
- H = 59 m, 100 %: Q = **41,9 L/s**, P = **14,55 kW**.
- H = 59 m, 50 %: Q = 20,95 L/s; v rămâne 33,34 m/s.
- Deflector pus: P = 0, Q nemodificat.
- **Control extern (S7, ex. 2):** H netă 227,5 m, Cv = 0,975 → v = 65,14 m/s. Q pe jet = 1,0 m³/s → d = √(4q/(π·v)) = 0,140 m. Test: ≤ 0,5 %.

## Afirmații și surse

| ID | Afirmație | Surse |
|---|---|---|
| F1 | Duza transformă presiunea în energia cinetică a unui jet. La Pelton, toată energia potențială devine cinetică înainte ca jetul să lovească cupele | S7 p. 1; S16; S17 §3.1 |
| F2 | v = Cv·√(2gH), cu coeficientul de viteză Cv ≈ 0,98–0,99 | S7 („coefficient of velocity between 0.98-0.99”); S18 („Cv = coefficient of velocity = 0.98-0.99”) |
| F3 | Acul (spear, needle) alunecă în duză și schimbă secțiunea efectivă, deci debitul, practic fără pierderi de energie | S16 („variation in effective orifice cross section area without introducing energy loss”); S7 („controls the water flow … with negligible energy loss”); S17 („Discharge of the water jet can be adjusted by moving the needle valve”) |
| F4 | Deflectorul se rotește în jet și îl abate de la cupe foarte repede | S16 („This is very quick”); S17 („sudden intercept of water jet”) |
| F5 | Deflectorul nu oprește apa din conductă, deci nu produce lovitura de berbec. Cu el, creșterea de presiune și de turație la pierderea sarcinii rămâne mică | S16 („does not require the shutdown of the flow in the penstock, with consequent pressure surge danger”); S17 („pressure rise and speed rise at load rejection can be controlled with low value by the use of deflector”) |
| F6 | Exemplul lucrat: H netă 227,5 m, Cv = 0,975 → v = 65,14 m/s; jetul de 0,14 m la 1 m³/s | S7 ex. 2; *a doua sursă de găsit*, deci doar control în teste, nu în UI |
