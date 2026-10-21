# P4b tester: raport

Nimic nu a fost rulat. Valorile așteptate vin din calcule de mână (în comentariile testelor).

## Fișiere
- `tests/game/trip.test.ts` (nou)
  - `tripUnit`, refuzuri:
    - id inexistent (nu lasă nimic în coadă);
    - în `prepare`, chiar pentru unitate existentă;
    - unitate deja offline;
    - după `won`.
  - `tripUnit`, efect:
    - online până la pasul următor, apoi offline cu p = 0;
    - exact o intrare `unit-tripped` în jurnal, și după 30 s;
    - două cereri în aceeași fereastră produc o singură declanșare;
    - dinamic: gazul pică, f atinge 49,0 Hz, UFLS declanșat, `maxUflsStages == treptele curente`;
    - permis în nivel (running);
    - merge pe unitate construită (baterie).
  - Plafon jurnal (`SNAPSHOT_LOG_ENTRIES`):
    - tabel n = 0, 3, 49, 50, 51, 60 declanșări (baterii, setpoint 0, nu schimbă bilanțul): lungime = min(n, 50) și ids = ultimele, în ordine;
    - intrarea veche (gaz) iese din fereastră după 50 de declanșări ulterioare;
    - cronologic (t nedescrescător) și copii (mutarea unei intrări nu afectează jurnalul real).
- `tests/game/sandbox.test.ts` (adăugate 2 teste în `L4 (sandbox)`)
  - OCGT: online la 480 s; hidro 420 înainte, în rampă la +5 s (350 < p < 410), apoi 360 ± 5; OCGT 60 ± 5; gaz 150 ± 5; fără blackout; |f−50| < 0,05.
  - `demolish("hydro")`: blackout nul înainte, `under-frequency` după, `state` rămâne `running`, `result()` null, log conține `blackout`, `t` înghețat.
- `tests/game/level1.test.ts`: șters „stelele cresc cu numărul de baterii” (redundant cu cele trei teste L2). `BuildKind` rămâne folosit în L3.
- Referințe `measurements.uflsStages`: nu există în teste (doar `snap.uflsStages` boolean[], neschimbat). `maxUflsStages` e acoperit în `trip.test.ts`.

## Ce ar face testele să cadă
- Refuzuri: `tripUnit` fără verificarea de stare / id / online.
- Offline la pasul următor: aplicarea imediată (assert `online` înainte de `advance`) sau neaplicarea deloc.
- Exact o dată: dublarea evenimentului în coadă sau re-declanșarea la fiecare pas.
- Tabelul de plafon:
  - `slice(-N)` cu altă N sau lipsa plafonului (n = 51, 60);
  - `slice(0, 50)` în loc de ultimele (ids);
  - ordine inversată;
  - plafon aplicat greșit sub 50 (n = 3, 49).
- Copii: `snapshot().log` care întoarce referințe la intrările reale.
- `maxUflsStages`: nu se actualizează, sau e redenumit/pierdut.
- OCGT: rebalance ignoră unitățile adăugate, sau taie din gaz/OCGT în loc de hidro. Hidro neschimbat sau scăzut instant (nu pe rampă).
- Blackout: sesiunea trece în `lost` în sandbox, sau modelul continuă după blackout.

## Neacoperit
- `result()` cu 0 stele (ramura `lost` din nivel): neaccesibilă prin API, e2e G8 din P6.
- Redundanțele mici din `level1.test.ts` (reviewer P4 neblocante 2-3): nu au fost cerute, le-am lăsat.
- `forceTrip` din `main.ts`, UI: în afara `tests/game`.

## Riscuri / suspiciuni
- Nicio suspiciune de bug în codul coder-ului.
- Testul OCGT depinde de calibrare:
  - toleranțe 5 MW, fereastra 350–410 MW la +5 s;
  - dacă pică, verifică întâi aceste valori.
- Testul „dinamic” cu UFLS presupune că pierderea gazului în sandbox duce f la ≤ 49,0 Hz. Nivelul 1 fără baterii arată >5% UFLS pentru aceeași pierdere, deci e susținut.
- Testul „iese din fereastră” construiește 50 de baterii imediat după trip-ul gazului, când f e puțin sub 50 Hz. Răspunsul FCR al bateriilor e limitat de rampa de 10 s și ele sunt declanșate într-un pas, deci efectul e neglijabil. Dacă apare blackout / intrări `ufls` în ultimele 50 de intrări, acesta e locul de verificat.

## Comandă
`npx vitest run tests/game` (apoi `npx tsc --noEmit`, fiindcă testele importă `SNAPSHOT_LOG_ENTRIES` din `src/game/session`).
