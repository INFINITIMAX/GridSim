# S2 tester: raport

Fișier: `tests/2d/hydro.test.ts`. Nimic rulat (nu am shell). Nu am modificat cod de producție.

## Verificare de mână
Am recalculat cele 6 rânduri independent (49,05 · Q · η la H = 5): toate coincid cu tabelul din brief (83,385 / 123,12 / 31,08 / 0 / 386,49 / 83,385). Nicio divergență. Am verificat și alternativele respinse (small x4: k=2 dă eta 0,728, mai puțin; large x4: k=4 și k=2 dau mai puțin decât k=3).

## Teste și ce bug prind
- Cazuri de mână (it.each, 6 rânduri): running, debit/turbină, folosit, deversat, eta, kW. Cad dacă regula `running` revine la "cât mai multe turbine" (rândurile 2, 3, 5, 6), dacă formula P sau penalizarea de sarcină parțială se schimbă, dacă deversarea e calculată greșit.
- Conservarea apei (grilă 3 tipuri x 4 counts x 14 debite): cade dacă usedFlow/spilledFlow nu însumează debitul sau deversarea devine negativă.
- Limita de putere + plin la debit mare: cade dacă powerKW > maxPowerKW sau dacă la debit peste capacitate nu rulează toate turbinele la load 1 / powerKW != maxPowerKW (ex. maxPowerKW calculat cu alt count).
- O turbină în plus nu scade puterea (grilă): cade dacă selecția lui k nu mai e maximul peste 1..maxRunnable (ex. regula "toate cele pornibile").
- Pragul de pornire 0,29 / 0,31 pe toate cele 3 tipuri: cade dacă minLoad e ignorat sau comparația e inversată/off-by-one.
- Exact la minLoad·designFlow pornește (în plus față de brief): cade dacă dispare toleranța 1e-9 din floor.
- energyPerDayMWh = kW·24/1000 (grilă + valoare de mână 2,00124): cade la factor 24 sau 1000 greșit.
- Limite: count 0 = 1, count 9 = 4, debit -1 = 0 (toEqual pe întreg obiectul): cad dacă clamp-ul lipsește sau debitul negativ dă deversare/putere negative.
- powerCurve: lungime steps+1 și puncte echidistante (0, maxFlow, punct intermediar), implicit 121 puncte până la RIVER_MAX, nedescrescătoare pe 3 tipuri cu count 1, ultimul punct large x1 la 12 = 151,08 kW = maxPowerKW. Cad la off-by-one în buclă, pas greșit, sau curbă care scade.

## Neacoperit
- `turbineById` (fallback la TURBINES[0] pentru id necunoscut): inaccesibil prin tipuri, în afara brief-ului.
- Egalități de putere între k (tie-break spre k mai mic): nu am găsit un caz de mână clar fără dependență de aritmetica flotantă; neacoperit deliberat.
- panel.ts / main.ts: UI, în afara brief-ului.

## Suspiciuni de bug
Niciuna. Proprietatea "o turbină în plus" ține prin construcție (mulțime de candidați mai mare), deci un contraexemplu ar indica o regresie.

## Comandă
`npx vitest run tests/2d/hydro.test.ts`
