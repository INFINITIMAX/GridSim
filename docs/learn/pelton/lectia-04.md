# Lecția 4 · Penstock

Obiectiv verificabil: „De ce căderea netă e mai mică decât cea brută, și ce o reduce?”
Răspuns: frecarea apei de peretele conductei (plus pierderi mici la grătar, intrare, coturi, vane) consumă o parte din cădere (D1, D2). Pierderea crește repede când conducta e mai îngustă (D4).

## Obiectul central

Un versant ca obiect de birou: camera de încărcare sus, conducta forțată pe pantă, cu blocuri de ancoraj, vana și agregatul Pelton jos.
Peste conductă: cota **H brută** (verticala de la nivelul apei din camera de încărcare la duză) și o linie roșie punctată care coboară ușor de la nivelul apei spre duză: **linia de energie**. Diferența de la capătul ei e pierderea de cădere hf; ce rămâne e **H netă**.

## Callout-uri (UI, engleză)

| Piesă | Text | Afirmații |
|---|---|---|
| Forebay | Where the pipe starts. Its water level is the top of the gross head. | D1 |
| Penstock | The pressure pipe. Water rubbing on its wall loses part of the head. | D1, D2 |
| Anchor block | Concrete blocks hold the pipe at every bend. | D7 |
| Energy line | Drops a little along the pipe: that drop is the friction loss. | D2, D3 |
| Net head | What is left at the nozzle: gross head minus all losses. | D1 |

## Tab-uri

- **Overview:** „The penstock brings the water down under pressure. Water rubbing on the pipe wall loses some of its head on the way, so the turbine gets a little less than the full drop.” Rânduri: *Net head = gross head − losses* (D1) · *Friction is the main loss* (D2) · *A narrower pipe loses much more* (D4).
- **Parts:** camera de încărcare, conducta, blocurile de ancoraj, vana (detaliată în L5), duza (detaliată în L6).
- **How it works:** formula Darcy–Weisbach, hf = f·(L/D)·V²/2g (D3); f depinde de rugozitatea peretelui și de numărul Reynolds (D3, D5); de ce dublarea diametrului reduce pierderile de zeci de ori (D4).
- **Specs:** rugozitatea e: polietilenă 0,003 mm, oțel sudat 0,6 mm (D5); proiectanții țin pierderea la câteva procente din cădere (D6).

## Simulator: „Size the penstock”

- Intrări: Q 10–100 L/s (implicit 40), diametrul interior D 100–300 mm (implicit 200), lungimea L 50–500 m (implicit 150), materialul: polietilenă / oțel sudat (implicit polietilenă). H brută fixă 60 m (din L2).
- Ieșiri:
  - viteza V = 4Q/(πD²);
  - Re = V·D/ν, cu ν = 1,31·10⁻⁶ m²/s (valoarea din S2, apă la ~10 °C);
  - f din Swamee–Jain: f = 0,25 / [log₁₀(e/(3,7D) + 5,74/Re^0,9)]² (S12), aproximare explicită a ecuației Colebrook–White (S2 ec. 2.9a);
  - hf = f·(L/D)·V²/(2g) (S2 ec. 2.4);
  - H netă = 60 − hf și pierderea în % din H brută;
  - avertisment dacă pierderea > 5 % (D6).
- Scena: linia de energie coboară proporțional cu hf.
- Limită declarată: socotim doar frecarea. Pierderile mici (grătar, intrare, coturi, vană) sunt ~0,4 m în exemplul S2 5.6, față de 2,3 m frecare.

Valori de test (calculate de mână, g = 9,81):
- Implicit (PE, 40 L/s, 200 mm, 150 m): V = 1,2732 m/s, Re = 1,944·10⁵, f = 0,01575, **hf = 0,98 m**, **1,63 %**, H netă = **59,0 m**.
- Oțel sudat, restul implicit: f = 0,0270, hf = 1,68 m, 2,79 %.
- PE, D = 100 mm, restul implicit: V = 5,09 m/s, hf = 28,0 m, 46,6 % → **avertisment**.
- **Control extern 1 (S2 ex. 2.5, Colebrook–White, oțel sudat e = 0,6 mm, L = 500 m, V = 4 m/s):** hf din tabel 17,23 / 9,53 / 5,73 / 4,35 m pentru D = 0,5 / 0,8 / 1,2 / 1,5 m. Swamee–Jain dă 16,95 / 9,45 / 5,74 / 4,37 m. Testul cere acord ≤ 2 %.
- **Control extern 2 (S2 ex. 2.2, diagrama Moody):** D = 0,9 m, oțel sudat, V = 1,886 m/s, Re = 1,3·10⁶; S2 citește f = 0,019, hf = 1,91 m. Swamee–Jain: f = 0,0182, hf = 1,84 m. Testul cere acord ≤ 5 % (citire de pe diagramă).
  - Erată S2: enunțul spune 2,3 m³/s, dar V = 1,886 m/s din soluție (și ex. 2.4, care reia aceleași date) corespunde lui Q = 1,2 m³/s. Testul folosește V și D, nu Q.

## Afirmații și surse

| ID | Afirmație | Surse |
|---|---|---|
| D1 | Căderea netă = căderea brută minus suma pierderilor (frecare și turbulență în conductă, grătar, coturi, vane) | S2 §5.9 „Penstock diameter” („The net head equals the gross head minus the sum of all losses”); S8 (pierderile prin frecare în conductă intră în factorul e) |
| D2 | Pierderea principală într-o conductă forțată e frecarea; restul sunt pierderi minore | S2 §5.9 („the main head loss in a pressure pipe are friction losses … minor losses”); S13 App. IV (coturile sunt de obicei neglijabile) |
| D3 | hf = f·(L/D)·V²/2g, cu f din Colebrook–White sau diagrama Moody | S2 §2.2.1 ec. 2.4, 2.9a; S12 §3.2 (Darcy–Weisbach, Colebrook–White, Swamee–Jain) |
| D4 | Diametrul contează cel mai mult: o conductă mai îngustă dă pierderi mult mai mari (S2: înjumătățirea diametrului înmulțește pierderile cu ~40) | S2 §5.9 (ec. 5.16 și comentariul ei); S13 App. IV („internal pipe diameter (a fourth law relationship)”, cel mai critic parametru) |
| D5 | Rugozitatea: polietilenă 0,003 mm, oțel sudat 0,6 mm | S2 tabelul 2.1; S12 §3.2 (rugozitatea relativă ε/D în Swamee–Jain) — *valorile numerice doar în S2; în UI apar ca „ESHA table 2.1”* |
| D6 | Pierderea se ține de obicei la câteva procente din cădere (S2: 4 % „usually acceptable”; S13: „around 5 %”) | S2 §5.9; S13 p. 8 |
| D7 | Conducta e ancorată cu blocuri de beton la coturi și susținută pe lungime | S2 §5.9 („concrete anchor blocks at each bend”); S13 p. 8 („well anchored at each end, supported firmly along its length”) |

