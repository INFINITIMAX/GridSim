# Lecția 7 · Pelton runner

Obiectiv verificabil: „De ce cupa «vrea» să meargă cu jumătate din viteza jetului?”
Răspuns: puterea pe cupă e forța jetului înmulțită cu viteza cupei. Forța e proporțională cu (v₁ − u), viteza cupei e u, iar produsul (v₁ − u)·u e maxim la u = v₁/2 (G3, G4). La u = v₁/2, apa iese din cupă aproape fără viteză, deci aproape toată energia a rămas în rotor (G6).

## Obiectul central

Rotorul Pelton mare, din `makeRunner`, cu jetul din L6 care lovește o cupă. O cupă e decupată în secțiune, ca să se vadă muchia despărțitoare și cele două jumătăți ale jetului întoarse înapoi.
Animații:
- rotorul se învârte cu viteza aleasă în simulator (u/v₁), încetinit vizual;
- apa care iese din cupă e o săgeată a cărei lungime arată viteza rămasă v₂:
  - la u/v₁ mic, apa iese înapoi, repede (săgeată lungă);
  - la 0,5, cade aproape moartă (săgeată foarte scurtă);
  - la u/v₁ = 1, jetul abia ajunge cupa, deci nu mai împinge nimic (G8).

## Callout-uri (UI, engleză)

| Piesă | Text | Afirmații |
|---|---|---|
| Bucket | A double cup. Its middle ridge splits the jet in two. | G1 |
| Splitter | Each half of the jet is turned almost all the way back. | G1, G2 |
| Jet | Pushes the bucket. The faster the bucket runs away from it, the weaker the push. | G3 |
| Exit water | What the water keeps of its speed is lost. At half the jet speed, it simply falls away. | G6 |
| Runner | Best when the buckets move at half the jet speed. | G4 |

## Tab-uri

- **Overview:** „The jet from lesson 6 hits a ring of double cups. Each cup splits the jet and throws the water back the way it came. The push is strongest when the cup stands still, but then it does no work; when the cup runs as fast as the jet there is no push at all. The best is in the middle: half the jet speed.” Rânduri: *Split and turned back* (G1, G2) · *Best at half the jet speed* (G4) · *Leftover speed is lost* (G6).
- **Parts:** cupa, muchia despărțitoare, jetul, apa la ieșire, rotorul.
- **How it works:**
  - forța pe cupă depinde de viteza cu care jetul o ajunge din urmă, v₁ − u (G3);
  - puterea = forța × u, deci are un maxim la mijloc, la u = v₁/2 (G3, G4);
  - jetul întors aproape 180° (în practică ~165°) dă randamentul hidraulic maxim (1 + cos 15°)/2 ≈ 98 % pentru o cupă ideală (G2, G5). De ce nu exact 180° nu explicăm: n-am găsit două surse pentru motiv;
  - dacă rotorul ajunge la viteza jetului, puterea devine zero (G8).
- **Specs:**
  - unghiul de deviație 165° (G2);
  - raportul de viteză în proiectare u/√(2gH) = 0,43–0,48 (G7);
  - randamentul hidraulic maxim, cupă ideală: 98,3 % (G5).

## Simulator: „Spin the runner”

- Intrări:
  - raportul u/v₁, 0–1, pas 0,01 (implicit 0,25, ca utilizatorul să caute singur maximul);
  - unghiul de deviație θ, 90–180°, pas 1 (implicit 165).
  - Fixe: v₁ = 33,34 m/s și Q = 41,9 L/s din L6 (H netă 59 m, Cv = 0,98, acul deschis 100 %); cupă ideală, k = Vr₂/Vr₁ = 1.
- Ieșiri:
  - viteza cupei u = r·v₁ (m/s);
  - randamentul hidraulic ηh = 2(1 − r)·r·(1 + k·cos φ), cu φ = 180° − θ (G3);
  - puterea pe cupe P = ηh · ½ρQv₁² (kW);
  - viteza rămasă a apei la ieșire v₂ (m/s), din triunghiul de viteze: componenta tangențială u − k(v₁ − u)·cos φ și componenta axială k(v₁ − u)·sin φ.
- Nota de limită: „ideal bucket, no friction (k = 1)”.

Valori de test (calculate de mână, g = 9,81, ρ = 1000):
- v₁ = 0,98·√(2·9,81·59) = **33,343 m/s**; Q = v₁·π·0,04²/4 = **41,90 L/s**.
- Puterea jetului ½ρQv₁² = **23,29 kW**. Control: ρgQH·Cv² dă aceeași valoare, 23,29 kW.
- θ = 165°:
  - r = 0,25 → ηh = **0,7372**, P = 17,17 kW, v₂ = 17,09 m/s;
  - r = 0,5 → ηh = **0,9830** (maximul), P = **22,89 kW**, v₂ = 4,35 m/s;
  - r = 0,75 → ηh = 0,7372, simetric cu 0,25;
  - r = 1 → ηh = 0, P = 0.
- La r = 0,5: θ = 90° → ηh = 0,5 (placă plată); θ = 180° → ηh = 1.
- Control energetic (k = 1): ηh = 1 − v₂²/v₁² pentru orice r. La r = 0,5: 1 − 4,353²/33,343² = 0,9830.
- **Control extern (S7, ex. 1):**
  - date: H = 420 m, Cv = 0,97, raportul u/√(2gH) = 0,46, θ = 165°, k = 0,86, N = 480 rpm;
  - rezultate publicate: v₁ = 88,05 m/s, u = 41,76 m/s, ηh = 0,913 (91,3 %), D = 60u/(πN) = 1,66 m;
  - test: toate ≤ 1 %. Exemplul are o singură sursă (G9), deci intră doar în teste, nu în UI.

## Afirmații și surse

| ID | Afirmație | Surse |
|---|---|---|
| G1 | Rotorul Pelton are pe margine cupe duble. Muchia din mijloc împarte jetul în două, iar fiecare jumătate e întoarsă înapoi | S16 („split in half, so that each half is turned and deflected back almost through 180°”); S17 („double-cupped buckets… turned jets exert a balanced force”); S7 p. 1 („double hemispherical/ellipsoidal buckets”) |
| G2 | Jetul e deviat cu ~165° (165–175°) | S7 („Angle of deflection of jet through the buckets: ranges between 165°–175°”); S18 („Angle of deflection is 165° unless mentioned”); S16 („almost through 180°”) |
| G3 | Randamentul hidraulic al cupei este ηh = 2(v₁ − u)(1 + k·cos φ)·u / v₁², cu k = Vr₂/Vr₁ | S7 ec. 2; S18 („ηh = 2(V1 − u)[1 + K cos φ]u / V1²”) |
| G4 | Randamentul e maxim când viteza cupei e jumătate din viteza jetului, u = v₁/2 | S7 ec. 3 („maximum when the velocity of the wheel is half the velocity of jet”); S18 („maximum when u = V1/2”); S16 („jet velocity needs to be about twice the speed of the bucket”) |
| G5 | Randamentul hidraulic maxim este (1 + k·cos φ)/2 | S7 ec. 4; S18 („ηh max = (1 + K cos φ)/2”) |
| G6 | Energia cinetică cu care apa părăsește rotorul e pierdută, iar cupele sunt făcute ca viteza de ieșire să fie minimă. Apa deviată cade în canal | S19 §6.2.1 („As any kinetic energy leaving the runner is lost, the buckets are designed to keep exit velocities to a minimum”); S16 („Nearly all the energy of the water goes into propelling the bucket and the deflected water falls into a discharge channel below”) |
| G7 | În proiectare, viteza cupei este u = φ·√(2gH), cu raportul de viteză φ = 0,43–0,48 | S7 („Speed ratio between 0.43–0.48”); S18 („speed ratio = 0.43–0.48”) |
| G8 | Când cupa merge cu viteza jetului (u = v₁), puterea devine zero: rotorul nu poate depăși viteza jetului, adică de 2 ori viteza optimă | consecință directă a G3 (S7 ec. 2, S18), cu factorul (v₁ − u) = 0. Valoarea reală de ambalare, 1,8–1,9 × turația nominală, are o singură sursă (S19 tab. 6.6), deci e *de găsit* și nu apare pe ecran |
| G9 | Exemplul lucrat: H 420 m, Cv 0,97, φ 0,46, k 0,86, θ 165° → v₁ = 88,05 m/s, ηh = 91,3 %, D = 1,66 m la 480 rpm | S7 ex. 1; *a doua sursă de găsit*, deci doar control în teste |
