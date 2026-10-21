# Spec: GridSim (felie verticală, nivelul 1)
Status: aprobat (21-10-2026), quiz scos din felia verticală. Sursa: `docs/intent.md`.

## Cerințe

### Funcționale
1. **O scenă 3D low-poly**: o mică rețea de insulă, cu un oraș, centrale și linii. Se poate roti, apropia și muta (drag/scroll pe desktop, gesturi pe telefon).
2. **Adaugi și scoți surse:** hidro, gaz, nuclear, solar, eolian, baterie. Fiecare are o fișă: putere, inerție, viteză de variație, minim tehnic, CO₂.
3. **Adaugi și scoți consumatori:** case, fabrică, centru de date, stații de încărcare EV.
4. **HUD în timp real:**
   - cadran de frecvență (49–51 Hz);
   - bară producție vs. consum;
   - grafic de frecvență pe ultimele 60 s;
   - starea rezervelor (primară, secundară).
5. **Consecințe vizibile:**
   - FCR răspunde automat;
   - la 49,0 Hz se deconectează automat consumatori (UFLS): cartiere întregi se sting în scenă;
   - sub 47,5 Hz sau peste 51,5 Hz centralele ies din rețea: blackout, cu ecran de „game over” explicativ.
6. **Nivelul 1, „Keep the lights on”:** o secvență scriptată de 3 evenimente (de exemplu, fabrica pornește, pică o centrală, seara vine vârful de consum). Jucătorul trebuie să țină frecvența în ±0,5 Hz. Stele în funcție de cel mai jos punct atins de frecvență (nadir).
7. **Mod liber (sandbox):** după nivel, jucătorul construiește ce vrea.

### Nefuncționale
- Desktop și telefon, cu WebGL. Țintă: 60 fps pe un laptop obișnuit, ≥30 fps pe telefon.
- Încărcare inițială < 3 s pe 4G (bundle < 1 MB gzip, fără modele grele).
- Tot textul în engleză.
- Accesibil: HUD citibil fără 3D, contrast WCAG AA, comenzi de tastatură pentru meniuri.
- Onestitate: un ecran „How real is this?” explică simplificările. Rețeaua e de insulă; România e sincronizată cu Europa continentală, unde abaterile reale sunt de câteva sutimi de Hz.

## Design

### Model fizic (`src/model/`, TypeScript pur, fără three.js)
Un singur nod (fără topologie de rețea în felia verticală), pas fix de 50 ms, determinist.

- **Ecuația de mișcare (swing equation), agregată:**
  `df/dt = f₀ · (P_gen − P_load − D·Δf) / (2 · H_sys · S_sys)`
  - `H_sys = Σ(Hᵢ·Sᵢ) / S_sys`, doar peste unitățile sincrone online. Solarul, eolianul și bateria au H = 0 (invertoare).
  - `D` e autoreglajul sarcinii, de ordinul 1%/Hz (de verificat în sursă).
- **Reglaj primar (FCR):** statism, bandă moartă ±10 mHz, activare completă la ±200 mHz, în ≤ 30 s, limitat la rezerva alocată.
- **Reglaj secundar (aFRR):** un regulator PI pe Δf care readuce frecvența la 50,00 Hz în câteva minute, limitat la rezerva alocată.
- **Reglaj terțiar (mFRR):** e jucătorul. Pornește, oprește și redispecerizează unități.
- **Unități:** P_max, P_min (minim tehnic), viteză de variație (%/min), H, timp de pornire, CO₂/MWh. Valori tipice dintr-un catalog cu sursă citată.
- **Protecții:**
  - UFLS în trepte de la 49,0 Hz;
  - deconectare la 47,5 Hz / 51,5 Hz, cu cascadă până la blackout.
- **Profiluri:** consum, solar și vânt pe o zi reală din România, dintr-un snapshot ENTSO-E (CSV în `data/`), redat la timp accelerat.

### Teste de model (Vitest), cu calcule de mână în `docs/calcule.md`
| # | Scenariu | Criteriu |
|---|---|---|
| T1 | S = 10 GW, H = 5 s, pierdere bruscă 1 GW | ROCOF inițial −0,5 Hz/s, ±10% |
| T2 | Sistem tip Europa continentală, pierdere 3 GW, FCR 3 GW | nadir ≤ 800 mHz; abatere cvasi-staționară ≈ ΔP/(K + D), ±10% |
| T3 | Rețea mică, pierdere mare | UFLS declanșează la 49,0 Hz, frecvența revine, fără blackout |
| T4 | După un incident | aFRR readuce 50,00 ± 0,01 Hz în timpul configurat |
| T5 | Ziua reală din CSV | sarcina netă (consum − solar − vânt) reproduce datele, ±10% |
| T6 | Baterie | energia se conservă (SOC) cu randamentul declarat |
| T7 | Determinism | același input dă aceeași serie, bit cu bit |

### Aplicație
- `src/model/`: grid, units, control, protection, profiles. Fără DOM.
- `src/game/`: scriptul nivelului, evenimente, scor.
- `src/scene/`: three.js; diorama, clădiri low-poly din primitive, lumini care se sting la UFLS, animații (turbine, panouri).
- `src/ui/`: HUD și meniuri în DOM. Graficul de frecvență pe canvas 2D.
- Stack: Vite + TypeScript strict + three.js. Vitest pentru model, Playwright pentru un test smoke în browser.
- Deploy: GitHub public (MIT) + Vercel.

### În afara feliei verticale
Quiz înainte/după (poate la final), mai multe niveluri, topologie și fluxuri de putere, tensiune și reactiv, conturi, API live, modele Blender, sunet, a doua limbă, oglinda Python a modelului.

## Conflicte semnalate cu politici/convenții existente
1. **Regula „nimic pe C:” vs. npm.** Cache-ul implicit al npm e pe C: (`%LOCALAPPDATA%\npm-cache`). Propun un `.npmrc` în proiect cu `cache=D:\npm-cache`. Cache-ul Playwright (browserele) e tot pe C: implicit, așa că setăm `PLAYWRIGHT_BROWSERS_PATH` pe D:.
2. **Repo public vs. secrete.** Tokenul ENTSO-E (dacă îl folosim pentru descărcarea snapshot-ului) stă doar în `.env`, care e în `.gitignore`. Snapshot-ul CSV se poate și descărca manual de pe site, fără token.
3. **Simplificarea „rețea de insulă” vs. realitatea României.** O rezolvăm prin ecranul „How real is this?”, nu o ascundem.
4. **Inspirația Learn Arduino.** Design, cod și asset-uri originale; nu copiem layout-ul.
5. **Fluxul de 4 agenți.** Modelul (`src/model/`) e cornerstone: coder → tester → reviewer, cu brief-uri în `docs/handoff/`. Doar planner-ul rulează comenzi.
6. **Cifrele SO GL, H, D și vitezele de variație** le-am scris din memorie. Înainte de cod le verific în sursele primare și le citez în `docs/calcule.md`.
