# Nivelul 1: „Keep the lights on” (design calibrat)
Planner, 21-10-2026. Calibrat prin simulări cu modelul real (`src/model`, `ISLAND_CONFIG`). Scriptul de calibrare a rulat local; cifrele de mai jos sunt rezultatele lui.

## Ideea
O insulă mică. Jucătorul află că:
1. producția trebuie să egaleze consumul în fiecare secundă, iar frecvența arată echilibrul;
2. un șoc (o fabrică pornește, o centrală pică) trage frecvența în jos în câteva secunde, mai repede decât pot reacționa centralele clasice;
3. inerția și rezervele rapide (bateriile) țin luminile aprinse, iar fără ele orașul se stinge pe cartiere (UFLS).

## Configurația de pornire
- Config: `ISLAND_CONFIG` (FCR complet în 10 s la ±500 mHz; SO GL, Anexa V, coloana GB).
- **Hidro** `hydro`: pMax 900 MW, setpoint 420 MW, FCR 100 MW, aFRR 100 MW.
- **Gaz CCGT** `gas`: pMax 200 MW, setpoint 150 MW, FCR 25 MW, aFRR 25 MW.
- **Oraș** `town` (homes): 570 MW.

## Fazele
1. **Pregătire** (timpul e oprit): jucătorul are un **buget de 100 de puncte** pentru construcții. Povestea: „Mâine seară se anunță furtună. Centrala pe gaz e veche și s-ar putea opri.”
2. **Ziua** (timp real, ~120 s), cu evenimente scriptate:
   - t = 10 s: pornește o **fabrică** (+40 MW);
   - t = 50 s: **centrala pe gaz se oprește** (`tripUnit gas`, −150 MW);
   - t = 80–100 s: apusul (opțional, dacă jucătorul a construit solar, disponibilitatea scade la 0).
3. **Final** la t = 120 s sau la blackout.

## Rezultate măsurate (simulare, 21-10-2026)
| Pregătire | Nadir la fabrică | Nadir la pierderea gazului | UFLS deconectat |
|---|---|---|---|
| Nimic | 49,61 Hz | 48,56 Hz | 21% (3 trepte) |
| Baterie 100 MW (FFR) | 49,61 Hz | 48,85 Hz | 5% (1 treaptă) |
| Baterie 200 MW (FFR) | 49,61 Hz | 49,41 Hz | 0% |

Bateria e adăugată înainte de fabrică (la t = 20 s în simulare, echivalent cu faza de pregătire). Cu nimic, orașul supraviețuiește, dar cartiere întregi se sting. Asta e lecția.

## Stele (după nadir și deconectări)
- ★★★: fără UFLS și nadir ≥ 49,2 Hz;
- ★★: UFLS ≤ 5%;
- ★: fără blackout;
- 0 stele: blackout.

## Construcții (valori de joc, marcate ca atare)
| Ce | Mărime | Cost | Note |
|---|---|---|---|
| Baterie | 100 MW / 200 MWh, FCR 100 MW | 40 | FFR în 1 s, fără inerție |
| Gaz OCGT (vârf) | 100 MW, pornit la 60%, FCR 20 MW | 30 | inerție H = 5 s; în nivel pornește înainte de zi |
| Hidro | 100 MW, pornit la 50%, FCR 20 MW | 35 | inerție H = 3 s |
| Solar | 80 MW | 15 | fără inerție; dispare la apus |
| Eolian | 60 MW | 15 | fără inerție |

Calibrarea combinațiilor de construcții cu bugetul de 100 de puncte o verifică testele P4 (de exemplu: nimic dă ★; două baterii dau ★★★). Dacă alte combinații dau rezultate surprinzătoare, se ajustează costurile, nu fizica.

## În afara nivelului (sandbox)
Fără script, fără buget, timp accelerabil; timpii de pornire din catalog contează.
