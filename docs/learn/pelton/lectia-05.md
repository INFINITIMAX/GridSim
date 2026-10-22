# Lecția 5 · Valve & water hammer

Obiectiv verificabil: „De ce vana se închide încet?”
Răspuns: apa din conductă are inerție. Oprită brusc, energia ei se transformă într-o undă de presiune care poate fi de câteva ori presiunea statică și poate sparge conducta (E1, E2). Dacă închiderea durează mai mult decât drumul dus-întors al undei (Tc = 2L/c), vârful scade mult (E4, E5).

## Obiectul central

Aceeași conductă pe versant din L4, cu vana de admisie mare în prim-plan, lângă agregat.
Animația „Close the valve”: vana se închide în timpul ales; un inel roșu (unda de presiune) urcă pe conductă spre camera de încărcare și coboară înapoi. Lângă vană, un manometru cu acul la presiunea statică și vârful atins.

## Callout-uri (UI, engleză)

| Piesă | Text | Afirmații |
|---|---|---|
| Inlet valve | Shuts the water off before the turbine. It must always close slowly. | E1, E6 |
| Pressure wave | Stopping the water too fast sends a pressure wave up the pipe and back. | E2, E3 |
| Forebay | The free water surface where the wave turns back. | E3 |
| Penstock wall | A stiff steel pipe gets a higher surge than a plastic one. | E7 |
| Pressure gauge | The surge adds to the static pressure. The pipe must hold both. | E2, E8 |

## Tab-uri

- **Overview:** „A long pipe holds tonnes of moving water. Stop it suddenly and its momentum turns into a pressure wave that can be several times the normal pressure. That is why valves close slowly.” Rânduri: *Surge can be several times the static pressure* (E2) · *Close slower than the wave's round trip* (E4) · *Plastic pipes surge less than steel* (E7).
- **Parts:** vana de admisie, unda de presiune, camera de încărcare (unde unda se întoarce), peretele conductei, manometrul.
- **How it works:** ciclul undei după Inversin, citat în S2 §2.2.2 (E3); viteza undei c depinde de apă și de elasticitatea țevii (E7); timpul critic Tc = 2L/c (E4); închiderea instantanee: Joukowsky ΔH = c·ΔV/g (E5); închiderea lentă: formula Allievi (E5).
- **Specs:** c ≈ 1420 m/s în apă liberă, mai puțin într-o țeavă (E7); suprapresiunea uzuală la oprirea normală a unui Pelton: până la ~25 % din căderea brută; țeava se alege cu rezervă de ~30 % peste presiunea statică (E8).

## Simulator: „Close the valve”

- Intrări: timpul de închidere t 0,1–20 s (implicit 5), materialul țevii: oțel / PVC (implicit oțel), lungimea L 50–500 m (implicit 150). Fixe din L4: Q = 40 L/s, D = 200 mm, deci V₀ = 1,273 m/s; H₀ = 60 m.
- Țevile au raportul D/t din exemplele S2 5.7 (oțel 400 mm / 4 mm, PVC 400 mm / 14 mm), ca viteza undei să fie exact cea din S2.
- Ieșiri:
  - c = √[(K/ρ) / (1 + K·D/(E·t))], K = 2,1·10⁹ Pa, ρ = 1000 kg/m³, E oțel = 2,1·10¹¹ Pa, E PVC = 2,75·10⁹ Pa (S2 ec. 5.22, ex. 5.7; S14);
  - Tc = 2L/c (S2 ec. 5.23; S14);
  - t ≤ Tc → „sudden”: ΔH = c·V₀/g (Joukowsky, S2 ec. 5.24; S14);
  - t > Tc → „gradual”: Allievi, N = (L·V₀/(g·H₀·t))², ΔH = H₀·(N/2 + √(N + N²/4)) (S2 ec. 5.25–5.26; S14), plafonat la valoarea Joukowsky;
  - presiunea maximă H₀ + ΔH și raportul față de H₀;
  - avertisment dacă ΔH > 0,3·H₀ (E8).
- Limită declarată: model fără frecare, cu ΔV = V₀ (oprire completă), cum face și S2. Calculul riguros cere program de calcul (S2 §2.2.2).

Valori de test (calculate de mână, g = 9,81):
- Oțel: c = **1024,7 m/s**; L = 150 m → Tc = **0,293 s**; Joukowsky ΔH = **133,0 m** (raport 3,22, „sudden” la t = 0,2 s).
- PVC: c = **303,4 m/s**; Tc = 0,989 s; Joukowsky ΔH = 39,4 m.
- t = 5 s, L = 150 m (oricare material, t > Tc): N = 0,00421, ΔH = **4,02 m** (raport 1,067), fără avertisment.
- t = 2 s: N = 0,0263, ΔH = 10,56 m (17,6 %), fără avertisment. t = 0,5 s, oțel (t > Tc): N = 0,421, Allievi 53,6 m < Joukowsky → 53,6 m, cu avertisment.
- **Control extern 1 (S2 ex. 5.7):** oțel 400/4 mm → c = 1024 m/s; PVC 400/14 mm → 305 m/s (calculul exact dă 303,4; S2 rotunjește). Test: ≤ 1 %.
- **Control extern 2 (S2 ex. 5.9):** D = 1,0 m, t = 5 mm oțel → c = 836,7 m/s; L = 173 m → Tc = 0,41 s; V₀ = 3,82 m/s, H₀ = 84,935 m, t = 3 s → N = 0,070, ΔH = **+25,65 m**. Test: ≤ 1 %.
- **Control extern 3 (S2 ex. 5.8):** ΔH = 1024 × 4 / 9,8 = 417 m.
  - Erată S2: enunțul spune V₀ = 1,6 m/s, dar calculul folosește 4 m/s. Testul folosește 4 m/s, ca în calculul publicat.

## Afirmații și surse

| ID | Afirmație | Surse |
|---|---|---|
| E1 | Vana trebuie închisă întotdeauna încet, mai ales în ultima fază | S16 („The valve must always be closed slowly, particularly during the last phase”); S2 §2.2.2 (manevrele prea rapide ale vanelor produc presiuni periculoase) |
| E2 | Oprirea bruscă a apei produce o undă de presiune (lovitura de berbec) de câteva ori mai mare decât presiunea statică; conducta poate exploda sau se poate turti | S2 §2.2.2 și §5.9; S16 (presiunea de la închiderea vanei poate sparge conducta) |
| E3 | Unda urcă până la suprafața liberă din amonte, se reflectă și revine la vană; ciclul se repetă, amortizat de frecare | S2 §2.2.2 (descrierea Inversin); S14 (drumul vană → rezervor → vană) |
| E4 | Timpul critic Tc = 2L/c; închiderea mai lentă decât Tc reduce vârful | S2 ec. 2.22 și 5.23; S14 (t < 2L/C „sudden”, t > 2L/C „gradual”) |
| E5 | Închidere instantanee: ΔH = c·ΔV/g (Joukowsky); închidere lentă: formula Allievi | S2 ec. 5.24–5.26; S14 |
| E6 | Vana de admisie închide apa înaintea turbinei | S2 §2.2.2 și §5.7 („Gates and valves”); S16 („a gate valve or a butterfly valve, in the turbine manifold”) |
| E7 | Viteza undei depinde de elasticitatea țevii: într-o țeavă de plastic e mult mai mică decât în oțel, deci și suprapresiunea (S2: de ~3 ori) | S2 ec. 5.22, ex. 5.7–5.8; S14 (formula vitezei undei cu E al țevii); S15 (PVC, E = 400 000 psi ≈ 2,76 GPa) |
| E8 | Suprapresiunea se adaugă presiunii statice; țeava se alege pentru amândouă (S2: la oprirea normală a unui Pelton, până la ~25 % din căderea brută; S13: rezervă de ~30 % peste presiunea statică) | S2 §5.9; S13 p. 8; S15 (presiunea nominală ≥ presiunea de lucru + suprapresiunea) |
