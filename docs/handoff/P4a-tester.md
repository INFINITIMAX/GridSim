# P4a: teste pentru extensiile de model (tester)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Scrie testele pentru cele 4 schimbări din P4a și aplică neblocantele tester 1–2 din `docs/handoff/P2b-reviewer-raport.md`.

## Context
Citește: `docs/handoff/P4a-coder.md`, `docs/handoff/P4a-coder-raport.md`, `docs/handoff/P2b-reviewer-raport.md`, `docs/calcule.md` (secțiunea 2: FFR [J] și insula), `src/model/*.ts`, `tests/model/*`.
Rezultat rulat de planner după P4a: typecheck OK, **41/41 teste existente trec**, G4 și G5 OK.

## Teste noi (prefix `X#`)
| ID | Ce verifică | Cum se poate strica |
|---|---|---|
| X1 | FFR baterie: o baterie cu FCR 100 MW, la o abatere ≥ pragul de activare completă, livrează ~100% în ~1 s (calcul de mână din rampa `fcr/1 s`), față de un OCGT cu aceeași rezervă care după 1 s a livrat ~1/30 (sau ~1/10 sub ISLAND_CONFIG) | dacă `fcrFullTimeS` din spec e ignorat |
| X2 | ISLAND_CONFIG: un OCGT cu FCR 100 MW livrează rezerva completă la Δf = 0,5 Hz (nu la 0,2) și o atinge în ~10 s | dacă presetul nu e folosit sau are valori greșite |
| X3 | Prioritate FCR, semne egale: unitate cu headroom 50, fcr cerut 40, afrr cerut 60. FCR livrează 40, aFRR 10 | dacă tăierea rămâne proporțională (ar da 20/30) |
| X4 | Prioritate FCR, semne opuse: fcr +, afrr −, netul e livrabil și nimic nu e tăiat inutil | dacă `k` zero-ează ambele |
| X5 | `setSetpoint` sub minim, la o unitate online: setpoint-ul raportat e `minLoad·pMax`; urcarea ulterioară pornește imediat (fără timp mort) | dacă se poate coborî sub minim |
| X6 | `setSetpoint` la baterie: se acceptă valori negative până la −pMax (încărcare) | dacă bateria e limitată la 0 |

Pentru X3/X4: dacă e greu să construiești exact cererile prin scenariu, explică în raport ce scenariu ai folosit și calculul de mână al cererilor.

## Neblocante de aplicat
1. Mută scenariile comune (`ceLike`/`ceSystem`, `island`) în `tests/model/helpers.ts`.
2. Înlocuiește `runUntilBlackout` cu `simulate`.

## Lecție (din P2)
Verifică dinamica fiecărui scenariu cu un calcul de mână: rampe, H, ROCOF. Starea staționară nu e suficientă.

## Rezultatul așteptat
- Teste în `tests/model/` (de exemplu `extensions.test.ts`).
- **Raport:** `docs/handoff/P4a-tester-raport.md`, cu calculele de mână.
- Nu rulezi; nu scrii că trec.

## Ce NU ai voie să atingi
`src/**`, `docs/**` (în afară de raportul tău), config, `GATES.md`, `TASKS.md`. Nu rulezi comenzi.

## Retur 1 (planner, 21-10-2026)
X4b a picat exact cum ai prezis (minP 992,67). Bug confirmat; coder-ul îl repară cu regula: „la limită se taie doar componentele care împing spre limita depășită (întâi aFRR, apoi FCR); cele care împing în sens opus nu se taie”. **Ajustează X4b** la regula asta. Păstrează p ≥ 1000 − 1e-6 la fiecare pas între 60 și 120 s și fcr + afrr = 20. La final, aserțiunea devine **afrr = −10 (neatins) și fcr = 30**, nu fcr = 20 / afrr = 0. Adaugă oglinda la limita de jos (minLoad: fcr negativ, aFRR pozitiv), cu calcul de mână. Nu modifici `src/**`.
