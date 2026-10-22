# Auditul calculelor hidro (22-10-2026)

## Stare (22-10-2026)

Punctele 1–5 sunt corectate în pasul S4: randamentele vin din RETScreen Anexa A, iar generatorul (95%) și transformatorul (1%) sunt incluse. Presupunerile de joc rămân și urmează să fie marcate în UI. Tabelele de mai jos descriu starea dinainte de corectură.

## Pe scurt

- **Codul face exact ce spun regulile.** 19.440 de combinații (tehnologie × mărime × număr × baraj × canal × scara de pești × stavile × grătar × debit) plus 6 calcule anuale au fost recalculate de la zero, în Python, fără cod comun cu jocul. Diferența maximă e 9·10⁻¹⁶, adică zero practic.
- **Problema nu e în cod, ci în cifrele de intrare.** Comparate cu formulele publicate RETScreen, unele sunt prea optimiste. La Francis, jocul predă chiar lecția greșită.

**Cum se reface verificarea:**

```
node scripts/dump-hydro.mjs data/refs/hydro-dump.json
python -I scripts/audit_hydro.py data/refs/hydro-dump.json
```

## Sursa de referință

RETScreen Small Hydro Project Analysis, Natural Resources Canada. Copie locală (nu e în repo): `data/refs/retscreen-hydro.pdf`. Sursa publică: https://unfccc.int/resource/cd_roms/na1/mitigation/Module_5/Module_5_1/b_tools/RETScreen/Manuals/Hydro.pdf

- **Ecuația (7), pagina HYDRO.22:** P = ρ·g·Q·(H_brut − h_hidr − h_aval) · η_turbină · η_generator · (1 − pierderi_transformator) · (1 − consum_propriu).
- **Anexa A, paginile HYDRO.37–40:** formulele de randament pentru Kaplan, Francis și Crossflow, în funcție de debit, cădere și mărimea rotorului.

## Ce e fizică exactă (corect)

| Element | Stare |
|---|---|
| P = ρ·g·Q·H·η, cu ρ = 1000, g = 9,81 | corect |
| Conservarea apei: turbine + deversat + scara de pești = râul | corect, verificat pe toate cazurile |
| Puterea crește proporțional cu căderea și cu debitul turbinat | corect |
| La debit mic, mai puține turbine pline dau mai mult decât multe pe jumătate | corect. RETScreen spune același lucru: „multiple turbines that operate within limited flow ranges can be used” |
| Debitul ecologic se scade înainte de calcul | corect. RETScreen face la fel, ecuația (3) |

## Ce e greșit sau prea optimist (de corectat)

| # | Problema | Jocul acum | Realitatea, după RETScreen | Efect |
|---|---|---|---|---|
| 1 | **Francis la cădere mică** | la 12 m e cea mai bună: 92% randament de vârf | la 12 m, Francis are un vârf de doar ~73% și o bandă îngustă (la 75% sarcină ~43%). E făcută pentru căderi mari | **lecție greșită.** Upgrade-ul „cel mai bun” e de fapt nepotrivit |
| 2 | **Lipsesc generatorul și transformatorul** | puterea afișată ține cont doar de turbină | se mai pierd ~5% în generator și ~1% în transformator (valori tipice, de confirmat) | toate cifrele în kW sunt cu ~6% prea mari |
| 3 | **Kaplan sub 30% din debitul nominal** | merge de la 20%, cu 81% randament | la 20%, randamentul scade la ~40%. Practic, pragul util e ~30% | prea optimist în secetă |
| 4 | **Kaplan la 5 m** | 90% vârf | ~85% vârf (căderea mică penalizează) | +6% prea mult |
| 5 | **Crossflow sub sarcină** | 75–80% aproape constant | 79% la plin, 70% la 40%, 52% la 15% | prea optimist la debit mic |

Tabelul complet (randament la 15–100% sarcină, pentru fiecare tehnologie și cădere) iese din comanda de mai sus.

## Ce sunt presupuneri de joc (corecte ca idee, cifre alese de noi)

| Element | Valoare | Ce e real în spatele ei |
|---|---|---|
| Oprirea la viitură fără stavile | 7 m³/s | **Simplificare.** Fenomenul real: la viitură, apa din aval crește și căderea scade (RETScreen, ecuația 9). Plus pericolul resturilor. Un prag fix e inventat |
| Debitul ecologic | 10% din debitul mediu | **Lege reală, procent neconfirmat.** Legea apelor 107/1996, modificată prin OUG 78/2017, trimite la ghidul european nr. 31. Nu am găsit un procent fix aplicabil |
| Pierderea maximă la grătar | 6% din cădere | ordin de mărime plauzibil, fără sursă precisă |
| Timpul de înfundare | 180 s | timp de joc, comprimat intenționat |
| Pierderea în canal | 0,4 m fix | RETScreen o face să crească cu debitul la pătrat (ecuația 8). La noi e fixă |
| Debitele lunare | exemplu de râu de munte | **inventate**, dar cu forma realistă (vârf primăvara, minim toamna). Pot fi înlocuite cu date reale ale unei stații hidrometrice |
| Energia anuală | 12 debite lunare medii | RETScreen folosește curba de durată a debitelor (variația zilnică). Media lunară e o simplificare |

## Ce propun

1. **Randamentele:** le înlocuiesc cu formulele RETScreen (1, 3, 4, 5), cu sursa citată în cod și în panou. Francis rămâne în joc, dar arată cât de slabă e la cădere mică. Asta e lecția corectă.
2. **Generator și transformator** (2): un pas vizibil în lanțul de calcul.
3. **Presupunerile de joc:** rămân, dar le marchez în panou ca simplificări, cu explicația fenomenului real.
4. **Testele:** după corecturi, se recalculează cazurile de mână cu noile formule. Scriptul `audit_hydro.py` rămâne ca verificare permanentă.
