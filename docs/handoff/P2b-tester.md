# P2b: teste pentru comportamentul netestat (tester)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Completează `tests/model/grid.test.ts` (sau adaugă `tests/model/protection.test.ts`) cu testele pentru comportamentul pe care reviewer-ul l-a găsit netestat. Aplică și sugestiile lui neblocante 1–4.

## Context
Citește: `docs/handoff/P2-reviewer-raport.md` (lista exactă), `docs/handoff/P2b-coder-raport.md` (`fcr`/`afrr`/`fcrDeployed`/`afrrDeployed` înseamnă acum livrarea **efectivă**, după limitare), `docs/calcule.md`, `src/model/*.ts`, testele existente.

## Teste noi (ID-uri sugerate; numele începe cu ID-ul)
| ID | Ce verifică |
|---|---|
| P1 | Blackout `under-frequency`: o pierdere uriașă fără FCR și fără sarcină de deconectat suficientă duce `f` sub 47,5 Hz, apoi `blackout` cu motivul corect, unitățile sincrone offline și un eveniment în jurnal |
| P2 | Blackout `over-frequency`: pierdere bruscă de sarcină mare (de exemplu `removeLoad`) fără FCR; `f` peste 51,5 Hz, apoi blackout cu motivul corect |
| P3 | `no-synchronous-machines`: rețea doar cu solar/baterie sau cu ultima unitate sincronă deconectată, apoi blackout cu motivul corect |
| P4 | După blackout, `step` nu mai schimbă `f`, `t` (sau ce susține raportul coder-ului) și nici puterea |
| P5 | Anti-windup aFRR: rezervă aFRR mult sub deficit timp de câteva minute, apoi deficitul dispare (de exemplu `addUnit`). Integrala/livrarea aFRR rămâne mărginită de rezervă, iar frecvența **nu** depășește 50 Hz cu mai mult de o marjă mică (de exemplu > 50,1 Hz ar fi windup). Justifică marja cu un calcul. |
| P6 | Rampă pe `setSetpoint`: un CCGT de 1 000 MW (4 %/min, adică 40 MW/min) cere +400 MW și are nevoie de ~10 min. După 60 s a urcat cu ~40 MW (±10%). |
| P7 | `restoreShedLoad`: după UFLS, `shedFraction` revine la 0 și consumul revine la valoarea neshed-uită |
| P8 | Evenimente pe id inexistent sunt ignorate (starea nu se schimbă); id duplicat la `addUnit`/`createGrid` aruncă eroare (sau ce face efectiv codul, documentat) |
| P9 | Unitate deconectată (`tripUnit`) în timp ce livrează FCR: contribuția ei dispare imediat din `fcrDeployed` |
| P10 | Livrare efectivă la limită: o unitate aproape de `pMax` nu poate livra tot FCR-ul alocat; `fcrDeployed` raportează doar ce a livrat efectiv (≤ `pMax − p_inițial`) |
| P11 | Baterie creată cu SOC 0 și setpoint de descărcare: `p` e 0 încă de la creare |

## Sugestiile reviewer-ului de aplicat
1. Unifică sau elimină redundanța „T2 (negativ): aFRR = 0”. Păstrează doar aserțiunea `afrrDeployed === 0` în T2 principal.
2. Păstrează un singur test „fără incident nu există derivă”.
3. Înlocuiește `expect(withinPct(...)).toBe(true)` cu un helper care la eșec arată valoarea reală, cea așteptată și toleranța (de exemplu `expectWithinPct(actual, expected, pct, label)`).
4. Întărește T3: `shedFraction ≥ 0.25` (deficitul de 25% din `calcule.md` cere treapta ≥ 4, adică 29%).

## Lecție din P2 (de aplicat)
Orice scenariu negativ îl verifici întâi cu un calcul de mână al **dinamicii**: rampa FCR de 30 s, H și ROCOF. Nu te baza doar pe starea staționară.

## Rezultatul așteptat
- Testele în `tests/model/`. Valorile așteptate vin din calcule de mână, nu din rularea modelului.
- **Raport:** `docs/handoff/P2b-tester-raport.md`, cu calculele de mână pentru fiecare valoare așteptată nouă.
- Nu poți rula testele; nu scrie că trec.

## Constrângeri dure
- TypeScript strict, fără `any`. Fără teste care trec întotdeauna.
- Nu modifici `src/**`, `docs/**` (în afară de raportul tău), config, `GATES.md`, `TASKS.md`.
- Nu rulezi comenzi.
