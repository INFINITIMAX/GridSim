# P2: raport tester
21-10-2026. Nimic rulat. Nu afirm că testele trec.

## Fișier creat
`tests/model/grid.test.ts` (T1, T2, T3, T4, T6, T7; T5 rămâne pentru P3).

**Nu am putut șterge `tests/model/smoke.test.ts`** (nu am unealtă de ștergere). Planner-ul trebuie să îl șteargă.

## Teste și ce le-ar face să cadă
| Test | Verifică | Cade dacă |
|---|---|---|
| T1 ROCOF −0,5 ±10% | S=10 000 (OCGT, H=5), pierdere 1 000 MW solar; ROCOF și f după primul pas | formula swing greșită (factor 2, semn, f0), ΔP greșit |
| T1 echilibru → ROCOF 0 | precondiția scenariului | model cu deriva inițială/sarcină neechilibrată |
| T1 neg.: S dublu → −0,25 | ROCOF ∝ 1/S | model care ignoră S |
| T1 neg.: hidro (H=3) → −0,833 | ROCOF ∝ 1/H | model care ignoră H |
| T2 nadir ≥ 49,2 și Δf=191 mHz ±10% la 120 s | calcule.md T2, aFRR 0 | FCR/bandă moartă/D greșite, FCR prea lent |
| T2 ROCOF inițial 0,094 | H_sys=4, S=200 000 | medie H greșită |
| T2 neg.: Δf > 0,15 și aFRR livrat 0 | aFRR nu „scapă" în model | aFRR activ fără rezervă |
| T3 UFLS treapta 1 la ≤ 49,0 (precedent > 49,0, t∈(0,5; 0,8) s), nadir > 47,5, fără blackout, f > 49,0 la 60 s | calcule.md T3 | UFLS lipsă/prea devreme/târziu, blackout, nerecuperare |
| T3 neg.: pierdere 10 MW → fără UFLS | model care declanșează mereu | UFLS necondiționat |
| T3 neg.: fără eveniment → f=50 | nicio deriva spontană | |
| T3: FCR 500 → nadir mai mare decât FCR 50 | FCR contează în insulă | FCR ignorat |
| T4 revenire la 50±0,01 în ≤ 900 s și rămâne (rulat 1 200 s) | aFRR 2×2 000 MW | calibrare aFRR slabă, oscilații, windup |
| T4 neg.: fără aFRR, după 900 s abatere > 0,1 | testul nu trece „gratis" | |
| T6 descărcare 20 MW/1 h | E_out = ΔSOC·cap·η_d ±0,1%; plus valori de mână (20 MWh, SOC 0,2778) | η ignorat, SOC greșit |
| T6 încărcare | ΔSOC = E_in·η_c/cap; SOC final 0,684 | η_c ignorat |
| T6 tăiere la SOC 0 / 1 | doar 0,9 MWh livrați (0,1·10·0,9); 1/0,92 MWh absorbiți; p≈0 la final; SOC în [0,1] | lipsa tăierii |
| T7 insulă și CE+aFRR rulate de 2 ori | `toEqual` pe serii f (și log, integrală aFRR) | orice nedeterminism (Math.random, Date) |
| T7: intrări diferite → serii diferite | egalitatea nu e trivială | |

## Alegerea scenariilor
- Pierderea e un generator **solar** (nesincron), ca S și H_sys să rămână exact cele din calcule.md după incident.
- H_sys=4 se obține din hidro (H=3) + OCGT (H=5) cu pMax egale (nu există tehnologie cu H=4 exact).
- Fiecare scenariu e echilibrat (generare = sarcină) în starea inițială.
- T2(b) și T4 se măsoară la 120 s / 1 200 s, nu la 60 s: din estimarea mea de mână, la 57–60 s frecvența încă iese din FCR saturat și poate fi la marginea intervalului ±10%.

## Probleme față de brief
1. **Testul negativ T3 „FCR 500 MW nu declanșează UFLS" nu e fizic cu rampa FCR de 30 s** (SO GL): la 1,56 Hz/s se ajunge la 49,0 Hz în 0,64 s, când FCR a livrat ~10 MW. Calcul de mână: UFLS tot declanșează. L-am înlocuit cu (a) pierdere de 10 MW → fără UFLS și (b) FCR 500 dă nadir mai bun decât FCR 50. Planner-ul să confirme înlocuirea.
2. **T1 negativ „H dublu"**: catalogul nu are H dublu; am folosit S dublu (ROCOF pe jumătate) și hidro H=3 vs OCGT H=5 (raport 5/3).

## Suspiciuni (de verificat la rulare)
- **T2 nadir**: calcul de mână (ODE cu FCR limitat la rampă 100 MW/s) dă nadir ≈ 49,25 Hz (abatere ~0,75 Hz), adică doar ~6% marjă față de 49,2. Dacă pică, nu e neapărat bug de model: rampa FCR de 30 s cu 3 000 MW poate fi prea lentă pentru H=4; ar fi o problemă de specificație (calcule.md).
- **T4**: depinde de calibrarea aFRR nerulată (kp=0,01, ki=0,001); posibil depășire/oscilație.
- Nu am scris test pentru anti-windup, rampe de unități sau protecția 51,5 Hz (nu cerute în brief).

## Comandă
`npx vitest run tests/model/grid.test.ts` (apoi `npm run typecheck`; testele folosesc TypeScript strict, fără `any`).
