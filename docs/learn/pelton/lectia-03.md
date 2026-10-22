# Lecția 3 · Weir & intake

Obiectiv verificabil: „De ce trebuie scoase nisipul și pietrișul din apă înainte de conductă?”
Răspuns: ajung în turbină și uzează duza, acul și cupele Pelton (C6, C7).

## Obiectul central

Priza în secțiune, ca obiect de birou:
- pragul jos peste albia pârâului, cu apa care trece peste el;
- priza laterală cu grătar;
- deznisipatorul: un bazin lărgit, cu panta fundului spre o vană de spălare și cu un prag la ieșire;
- începutul canalului.

Particule de nisip (puncte) intră odată cu apa: cele mari se depun în bazin, cele fine merg mai departe.

## Callout-uri (UI, engleză)

| Piesă | Text | Afirmații |
|---|---|---|
| Weir | Not a dam: it only raises the water so part of it can enter. The rest flows on. | C1 |
| Residual flow | A share of the stream must always stay in the river, for the fish. | C2 |
| Trash rack | Bars that stop leaves, branches and stones. | C3 |
| Settling basin | The water slows down here, so sand has time to sink. | C4, C5 |
| Flushing gate | Opens to wash the collected sand back to the stream. | C4 |

## Tab-uri

- **Overview:** „The intake takes a calm, clean share of a stream that can be a trickle one month and a torrent the next. Its two jobs: let the right amount of water in, and keep stones, leaves and sand out.” Rânduri: *A weir raises, it does not store* (C1) · *Some water must stay in the river* (C2) · *Sand is the turbine's worst enemy* (C6).
- **Parts:** prag, grătar, deznisipator, vană de spălare, deversor.
- **How it works:** de ce încetinirea apei lasă nisipul să se depună; lungimea bazinului e cât îi trebuie unui grăunte să ajungă la fund înainte de ieșire (C5).
- **Specs:** ținta uzuală e reținerea particulelor > 0,2 mm (C4, C7); viteza critică de 0,2–0,3 m/s peste care nisipul depus e luat din nou de apă (C8).

## Simulator: „Size the settling basin”

- Intrări: debitul Q 10–100 L/s (implicit 40), diametrul grăuntelui d 0,1–0,5 mm (implicit 0,2), lățimea bazinului B 0,2–1,0 m (implicit 0,4).
- Ieșiri:
  - viteza de depunere vD (formula Zanke, în forma din S2 ec. 5.8): vD [mm/s] = 100 / (9·d) · (√(1 + 157·d³) − 1), cu d în mm;
  - lungimea minimă L = Q / (vD · B) (S2 ec. 5.7);
  - avertisment dacă B > L/8 (S2: „B smaller than 1/8 times the length L”).
- Animația: grăunții de diametrul ales se depun înainte de capătul bazinului dacă lungimea e suficientă; altfel trec mai departe și apare roșu pe duza din miniatură.

Valori de test (calculate de mână):
- d = 0,2 mm → vD = 100/1,8 · (√2,256 − 1) = 55,56 · 0,5020 = **27,9 mm/s**
- Q = 0,040 m³/s, B = 0,4 m, vD = 0,0279 m/s → L = **3,58 m** (cu vD exact 27,889 mm/s: 3,586 → UI afișează **3,59 m**); B/L = 0,112 < 0,125 ✓
- Q = 0,040, B = 0,5 → L = 2,87 m; B > L/8 = 0,36 → **avertisment**
- Controlul cu a doua sursă (S10, Ruby & Zanke, ν = 1·10⁻⁶ m²/s, Δ = 1,65): d = 0,2 mm → 25,7 mm/s. Diferența de 8% față de S2 vine din vâscozitatea implicită (≈ 1,11·10⁻⁶ în S2, apă mai rece). Testul cere acord ≤ 10%.

Limită declarată în UI: formula e pentru apă liniștită, o primă estimare (S2: „first-hand approach in still water”). În curgere turbulentă viteza de depunere scade (S2 ec. 5.9).

## Afirmații și surse

| ID | Afirmație | Surse |
|---|---|---|
| C1 | Pragul nu stochează apa: ridică nivelul ca debitul necesar să intre în priză, restul trece peste | S2 §5.3; S1 HYDRO.6, HYDRO.11 |
| C2 | Un debit de servitute (residual/reserved/compensation flow) trebuie lăsat în râu | S2 §3.5; S1 §2.1.2 |
| C3 | Priza are grătar contra resturilor | S2 §5.5.1; S1 HYDRO.7; S8 |
| C4 | Priza are un deznisipator în care viteza scade ca să rețină particulele > 0,2 mm, plus un sistem de spălare | S2 §5.5.1, §5.6; S9 (deznisipatoarele țintesc > 200 µm) |
| C5 | Lungimea minimă: grăuntele trebuie să ajungă la fund înainte să iasă din bazin, L ≥ Q/(vD·B) | S2 §5.6.3 ec. 5.7; derivat de mână din tD = h/vD, tt = L/vT, vT = Q/(B·h) |
| C6 | Sedimentele care trec uzează echipamentul hidromecanic | S2 §5.6.1; S9; S11 |
| C7 | La Pelton, cele mai expuse sunt acul, duza și cupele | S9; S11 |
| C8 | Viteza critică de antrenare tipică e 0,2–0,3 m/s | S2 ec. 5.11; *a doua sursă de găsit, altfel rândul trece doar în Specs cu mențiunea „după ESHA”* |
| C9 | Viteza de depunere (Zanke) | S2 ec. 5.8; S10 |

Notă: S2 dă intervalele de reparație (6–7 ani la 0,2 mm, 1–2 ani la 0,5 mm) **pentru turbine Francis**. Nu le folosim la Pelton, chiar dacă ar fi tentant.
