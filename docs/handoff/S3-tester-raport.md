# S3: raport tester

Nu am rulat nimic; nu afirm că testele trec.

## Fișier
`tests/2d/hydro.test.ts`, rescris integral.

## Ce verifică și ce îl face să cadă
- **Cazuri A-I** (it.each): stopReason, running, used, spilled, eco, netHead, P. Cad dacă se schimbă formula de putere, pierderea canalului/grătarului, eco, logica k (I: k=1 ar da 204,67), ordinea stopReason. F rulează cu clog 1 (rândul e identificat după nume).
- **installedKW** (2 teste): 204,67 la C, și neschimbat la clog 1. Cade dacă nameplate include pierderea la grătar.
- **stepClog** (4): 0,5; plafon 1; curățitor ≤ 0,05; debit 0. Cad dacă se schimbă rata, plafonul sau cleaner-ul.
- **annual**: ianuarie cu curățitor 58,85; ianuarie fără curățitor 57,26 (clog 0,5, calculat de mine); total = sumă; CF = formula; CF în [0,1] pe grilă (864 setups x 2); setup cu head interzis dă 0. Cad dacă se schimbă AVERAGE_CLOG / AUTO_CLEAN_LEVEL, zilele din lună sau formula CF.
- **Proprietăți 1-7** pe grilă (tehnologie x mărime x count 1..4 x dam x canal x stavile x scară): conservare apei (cu debit negativ), monotonie în count, monotonie în înălțimea barajului (doar unde ambele rulează), monotonie în clog, prag de pornire pe tehnologie/mărime (±0,01 față de minLoad, valorile minLoad hardcodate de mine, nu aceeași expresie ca în cod), interval de cădere Francis (3 cazuri).
- **powerCurve** (3): numărul/echidistanța punctelor, coincidența cu `operate`, valoare finală de mână 154,51 kW.

## Divergențe față de brief
- Toate cele 9 rânduri A-I și Jan 58,85 le-am recalculat și coincid (H: eta 0,75644; I: k=2 eta 0,9108).
- **Proprietatea 3: triplul flood+head+low-flow e imposibil.** Flood cere debit > 7; low-flow cere debit disponibil < minLoad·designFlow (max 0,4·3,5 = 1,4). Am testat în schimb perechile: flood > head, head > low-flow (fiecare cu contra-test care schimbă un singur parametru).
- Adăugat față de brief: Jan fără curățitor (57,26), powerCurve (3 teste), `annual` pentru setup cu head interzis.

## Neacoperit
- `panel.ts`/`main.ts` (DOM/canvas, fără teste unitare existente).
- `count` în afara limitelor și `clog` în afara [0,1] (clamp) — nu erau cerute în brief; ușor de adăugat.
- Suspiciuni de bug: niciuna găsită la citirea codului. Notă: dacă CF > 1 pentru Francis (η la load 0,85 > η nameplate la load 1), testul CF ≤ 1 ar cădea; din calcul de mână nu ar trebui, fiindcă debitul anual nu e constant.

## Comandă
`npx vitest run tests/2d/hydro.test.ts` (din D:\GridSim); apoi `npx tsc --noEmit`.
