# P4: logica jocului, nivelul 1 + sandbox (coder)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Scrie stratul de joc în `src/game/`: TypeScript pur (fără three.js, fără DOM), peste modelul din `src/model/`. Scena (P5) și interfața (P6) îl vor folosi doar prin API-ul lui public.

## Context
Citește întâi: `AGENTS.md`, `docs/spec.md`, **`docs/level1.md`** (designul calibrat, cu cifrele exacte), `docs/handoff/P4a-coder-raport.md` și `src/model/*.ts` (API: `createGrid`, `step`, evenimente, `ISLAND_CONFIG`, `CATALOG`).

## Design cerut

### `src/game/builds.ts`
Catalogul de construcții din `docs/level1.md`: tip, mărime, cost, setpoint inițial, rezerve. Plus cum devine fiecare un `UnitInit`. Valorile sunt marcate în comentariu ca valori de joc. Consumatorii pe care îi poate adăuga jucătorul în sandbox: casă/cartier, fabrică, centru de date, încărcătoare EV (cu MW din catalogul `LoadKind` al modelului).

### `src/game/level1.ts`
Datele nivelului: configurația de pornire, bugetul, evenimentele scriptate (timp, eveniment de model și mesaj narativ scurt în engleză), durata, regulile pentru stele. Totul ca date, nu ca logică împrăștiată.

### `src/game/session.ts`
O sesiune de joc, `createSession(mode: "level1" | "sandbox")`, cu:
- **Stări:** `prepare` (timpul oprit, doar în nivel) → `running` → `won` | `lost`. Sandbox-ul pornește direct în `running` și nu se termină.
- **`advance(realDtSeconds)`:** acumulator cu pas fix (`config.dt`), cu un plafon de pași pe apel, ca un tab revenit din fundal să nu blocheze. Aplică evenimentele scriptate la timpul lor (exact o dată) și acțiunile jucătorului din coadă.
- **Acțiunile jucătorului** (validate, cu motiv de refuz), care întorc `{ ok: true } | { ok: false, reason }`:
  - `build(kind)`: în `prepare` scade din buget; refuză dacă bugetul nu ajunge.
  - `demolish(id)`.
  - `addConsumer(kind)` / `removeConsumer(id)`: doar în sandbox.
  - `restoreLoad()`: reconectează consumatorii deconectați de UFLS. E permis oricând în `running`. Dacă reconectarea e prea devreme, frecvența cade din nou; e o lecție, nu un bug.
  - `start()`: trece din `prepare` în `running`.
  - `setSpeed(1 | 2 | 4)`: doar în sandbox.
- **Măsurători:** nadir, `maxShedFraction`, timp scurs, numărul de trepte UFLS.
- **`result()`:** stele după regulile din `level1.md`, plus motivul, într-un text scurt și explicativ în engleză.
- **`snapshot()`:** o vedere imutabilă (copie superficială sau readonly) cu tot ce le trebuie scenei și interfeței: f, rocof, pGen, pLoad, pShed, shedFraction, treptele UFLS active, unitățile (id, kind, p, pMax, online, fcr, afrr, soc), consumatorii (id, kind, mw, câtă parte e deconectată), buget, stare, timp, mesajele narative noi și jurnalul modelului. Fără referințe mutabile spre starea internă a modelului.

### `src/game/index.ts`
Re-exportă API-ul public.

## Rezultatul așteptat
- Fișierele de mai sus. Comportamentul nivelului trebuie să reproducă tabelul „Rezultate măsurate” din `level1.md`; tester-ul va verifica.
- **Raport:** `docs/handoff/P4-coder-raport.md`, cu API-ul final, deciziile și ce ai lăsat pentru P5/P6.

## Constrângeri dure
- TypeScript strict, fără `any`, fără dependențe noi.
- `src/game/**`: fără three, DOM, `Math.random` sau ceas (`Date`/`performance`). Timpul vine doar prin `advance`.
- Nu modifica `src/model/**`. Dacă ai nevoie de ceva din model, scrie în raport și oprește-te acolo.
- Fără funcționalități în plus (fără salvare, conturi, sunet, alte niveluri).

## Ce NU ai voie să atingi
`src/model/**`, `src/scene/**`, `src/main.ts`, `src/ui/**`, `tests/**`, `docs/**` (în afară de raportul tău), config, `GATES.md`, `TASKS.md`. Nu rulezi comenzi.

## Retur 1 (planner, 21-10-2026): echilibrare la construcție
**Problemă găsită de planner în simulare:** construcțiile se adaugă peste consum. Cu solar + eolian (+140 MW), nivelul începe cu surplus, frecvența depășește 51,5 Hz și apare blackout la t = 2 s. Cu OCGT/hidro, f urcă la 50,5–50,65 Hz. Fizica e corectă, dar scenariul e nerealist: un operator ar reduce producția hidro.

**Cerință:** în nivel, când se apasă `start()`, și în sandbox, la intrarea online a unei construcții noi, setpoint-urile unităților dispecerizabile existente se reechilibrează astfel încât producția programată să fie egală cu consumul. Ordinea: întâi hidro (unitatea de echilibrare), apoi gazul, fiecare până la minimul tehnic. Solarul și eolianul produc cât au disponibil (nu se reduc). Dacă surplusul nu se poate absorbi nici cu toate unitățile la minim, `start()` refuză cu un motiv clar, de exemplu „too much uncontrollable generation for this island”. Bateriile nu schimbă bilanțul (setpoint 0). Documentează regula în raport (secțiunea „Retur 1”).

**Rezultate de păstrat** (măsurate de planner cu sesiunea ta): nimic → ★ (48,56 Hz, 21%); 1 baterie → ★★; 2 baterii → ★★★ (49,40 Hz). După corectură: solar+eolian nu mai produce blackout la start, iar f maxim la start rămâne < 50,2 Hz pentru orice combinație de construcții în buget.
