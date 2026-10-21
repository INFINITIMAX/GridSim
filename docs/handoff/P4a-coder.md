# P4a: extensii de model pentru nivelul de insulă (coder)
Planner: Claude (sesiunea principală), 21-10-2026.

## Sarcina
Patru schimbări mici în `src/model/`, decise după review-ul P2b și după calibrarea nivelului 1.

1. **FFR pentru baterii.** Adaugă în `SourceSpec` un câmp opțional `fcrFullTimeS?: number`. În catalog, bateria primește `fcrFullTimeS: 1`. Sursa e [J] din `docs/calcule.md` (NESO Dynamic Containment): URL-ul [J] intră în `source` sau într-un câmp nou `sources` (care trebuie să apară literal în `calcule.md`). Dacă alegi `sources`, păstrează `source` pentru G4. Rampa FCR a unei unități folosește `spec.fcrFullTimeS ?? config.fcrFullTimeS`.
2. **Preset „insulă”.** În `config.ts`, exportă `ISLAND_CONFIG = { ...DEFAULT_CONFIG, fcrFullTimeS: 10, fcrFullDeviationHz: 0.5 }`, cu comentariu-sursă (SO GL, Anexa V, coloana GB; vezi `calcule.md`). Restul rămâne identic.
3. **Prioritate FCR la limită.** În `updateUnit`, când puterea finală e limitată (`pMax`, `minLoad` sau SOC), se taie **întâi aFRR**, apoi FCR, astfel încât livrarea netă să fie maximul posibil. Atenție la semne opuse (fcr+, afrr−): nu tăia ce se poate livra net.
4. **`setSetpoint` limitat.** Pentru unitățile online, `setpoint` (și ținta de rampă) se limitează la `[minLoad·pMax, pMax]`. Solarul, eolianul și bateria au minimul lor propriu: 0 pentru solar și eolian, iar bateria poate avea setpoint negativ, adică încărcare, până la −pMax. Documentează exact.

## Context
Citește: `AGENTS.md`, `docs/calcule.md` (secțiunea 2, inclusiv FFR și insulă), `docs/handoff/P2b-reviewer-raport.md` (neblocantele coder 1–2 și decizia planner-ului), `src/model/*.ts`.

## Rezultatul așteptat
- Modificări în `src/model/units.ts`, `config.ts`, `grid.ts`, iar `index.ts` doar dacă exporți ceva nou.
- Testele existente (41) nu trebuie să se schimbe ca semnificație. Dacă vreunul depinde de comportamentul vechi la punctele 3–4, explică în raport care și de ce.
- **Raport:** `docs/handoff/P4a-coder-raport.md`.

## Constrângeri dure
- TypeScript strict, fără `any`, fără dependențe noi, fără funcționalități în plus.
- Puritate (G5) și surse (G4) păstrate.

## Ce NU ai voie să atingi
`tests/**`, `src/scene/**`, `src/main.ts`, `src/ui/**`, `src/game/**`, `docs/**` (în afară de raportul tău), config, `GATES.md`, `TASKS.md`. Nu rulezi comenzi.
