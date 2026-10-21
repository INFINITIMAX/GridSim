# P4: teste pentru logica jocului (tester)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Scrie testele Vitest pentru `src/game/` în `tests/game/` (config-ul Vitest include deja `tests/game/**/*.test.ts`).

## Context
Citește: `docs/level1.md` (design și calibrare), `docs/handoff/P4-coder.md` (inclusiv „Retur 1”), `docs/handoff/P4-coder-raport.md`, `src/game/*.ts` și API-ul modelului din `src/model/index.ts`.

## Ce a măsurat planner-ul (rulare reală, 21-10-2026, 107 combinații de construcții din buget)
- nimic → ★ (UFLS 21%, nadir 48,56 Hz);
- 1 baterie → ★★ (5%);
- 2 baterii → ★★★ (0%, nadir 49,40 Hz).
- 4× solar (sau combinații cu surplus neabsorbabil) → `start()` refuzat cu „Too much uncontrollable generation…”.
- În toate combinațiile pornite: f maxim în primele 9 s = 50,00 Hz; nicio combinație nu dă blackout.
- Lecția despre solar: 2× solar → ★ cu 37% UFLS (solarul dispare la apus după pierderea gazului).

Notă: în paralel se repară un bug de limitare FCR/aFRR în model (P4a, Retur 1), deci cifrele pot varia puțin. Testează stelele și pragurile, nu procentele exacte de UFLS, acolo unde nu decurg dintr-un calcul de mână.

## Teste cerute (prefix `L#`)
| ID | Ce verifică |
|---|---|
| L1 | Stări: `level1` pornește în `prepare`, `start()` duce în `running`, iar după 120 s jucați ajunge în `won` (sau `lost` la blackout). Sandbox-ul pornește în `running` și nu se termină. |
| L2 | Stelele: nimic → 1, 1 baterie → 2, 2 baterii → 3 (cu motivul în engleză nevid) |
| L3 | Buget: construcțiile scad bugetul cu costul din `level1.md`; peste buget e refuzat cu motiv; demolarea în `prepare` returnează costul; unitățile de start nu se pot demola; în `running` nu se poate construi în nivel |
| L4 | Reechilibrare: după `start()` cu solar și eolian construite, producția programată e egală cu consumul (calcul de mână: hidro scade cu 140 MW, cât timp rămâne peste minimul tehnic); surplus neabsorbabil → `start()` refuzat, iar starea rămâne `prepare` |
| L5 | Evenimentele scriptate se aplică exact o dată, la timpul lor (fabrica +40 MW la 10 s; gazul offline după 50 s), indiferent de felierea lui `advance` (de exemplu pași de 0,016 față de 0,1 față de 1,0) |
| L6 | Plafonul lui `advance`: un `advance(3600)` nu blochează, avansează cel mult plafonul de pași și aruncă restul (comportament documentat în raportul coder-ului) |
| L7 | `snapshot()` e imutabil față de exterior: modificarea obiectului întors nu schimbă sesiunea; mesajele noi se consumă (al doilea snapshot are lista goală) |
| L8 | Sandbox: o construcție cu `startMinutes > 0` apare în `pendingBuilds` și intră online după timpul din catalog (cu `setSpeed` pentru viteză); `addConsumer`/`removeConsumer` merg; în nivel, `addConsumer` e refuzat |
| L9 | `restoreLoad()` după UFLS readuce consumul. Un caz demonstrează că reconectarea prea devreme poate face frecvența să cadă din nou; dacă nu poți garanta asta printr-un calcul, testează doar reconectarea |
| L10 | Determinism: aceeași secvență de acțiuni și aceeași feliere dau același `snapshot` final |

## Lecție (din P2)
Pentru orice prag nou, verifică dinamica cu un calcul de mână. Nu te baza pe rezultatele planner-ului ca valori așteptate, ci folosește-le doar ca reper.

## Rezultatul așteptat
- `tests/game/*.test.ts`.
- **Raport:** `docs/handoff/P4-tester-raport.md`.
- Nu rulezi; nu scrii că trec.

## Ce NU ai voie să atingi
`src/**`, `docs/**` (în afară de raportul tău), config, `GATES.md`, `TASKS.md`, `tests/model/**` (un alt tester lucrează acolo). Nu rulezi comenzi.
