# S2: raportul reviewer-ului (transcris integral de planner)

VERDICT S2: ACCEPT, cu 1 test de reparat sau eliminat (nu blochează) și 3 observații minore la cod.

Am verificat și rezultatele de mână. Rândurile 2, 3, 5 și 6 din tabelul de teste le-am recalculat și coincid. Rândurile 1 și 4 sunt banale. Am verificat și alternativele respinse: small x4 la 0,8 cu k=2 dă 28,6 kW, mai puțin decât k=1; medium x4 la 1,5 alege k=1. Un grep pe `2d/` după em dash, Inter, gradient și backdrop nu găsește nimic.

## (1) Coder

Nu am găsit abateri de la brief și nu am găsit cod în plus important. Verificat:
- `operate`: regulile din brief, tie-break spre k mai mic, clamp pe count și pe debit, `maxPowerKW` conform formulei.
- `panel.ts`: toate cele 7 secțiuni, în ordinea din brief. Starea inițială e medium x1 la 3 m³/s. Ordinea frazelor de explicație e corectă.
- `main.ts`: hit-test consistent cu footprint-urile, animație ease-out cubic de 600 ms, aceeași animație la închidere, centrul zonei libere luat din `offsetWidth` (fără 340 duplicat), rotoare după `load`, spumă, viteza liniuțelor, readout cu kW, închidere prin ×, Escape și click pe teren gol.
- Ordinea de inițializare din modul (TDZ) e corectă.
- Nu există gradiente, emoji, em dash sau Inter. Parametrii stau la începutul fișierelor.

Observații, toate cu severitate mică spre medie:

1. **Medie-mică** — `2d/main.ts:150-158` (`onPlant`) și `main.ts:216-221` (`toTile`). În vederea iso, hit-test-ul folosește doar proiecția la nivelul solului. Acoperișul clădirii (înălțime 1.0) se desenează cu aproximativ 1 tile pe diagonală față de footprint. Un click sau hover pe acoperiș nu atinge `onPlant`.
   - Consecință: cu panoul deschis în iso, click pe acoperiș tratează clicul ca „teren gol” și închide panoul. Contururile de hover apar pe sol, nu pe clădirea vizibilă.
   - Prima deschidere nu e afectată, fiindcă se face din Top.
   - Coder-ul a menționat limitarea în raport. Remediu ieftin: în iso, testează și punctul `toTile` cu `lift` egal cu înălțimea clădirii, sau mărește `hitMargin` pe iso.
2. **Mică** — `2d/main.ts:495`. `animateZoomTo` ia `performance.now()`, iar `frame` primește timestamp-ul rAF, care poate fi puțin mai vechi. Primul cadru poate avea `progress` ușor negativ, adică `zoomAmount` ușor negativ și un tremur de un cadru. Remediu: `Math.max(…, 0)` pe `progress`.
3. **Mică** — `2d/main.ts:513`. `closePlant` face `setView("top")` imediat, cu zoom încă 2.6 (iso→Top la zoom 2.6), apoi animă. Rezultă un salt vizual la începutul închiderii. Brief-ul nu cere explicit tranziție între vederi. Acceptabil.
4. **Cosmetic** — `2d/main.ts:377`: `new Array(8)` e un număr magic. Ar fi mai curat `MAX_TURBINES`. `turbineById` exportat cu fallback `?? TURBINES[0]!` nu e cerut, dar e folosit și inofensiv.

## (2) Tester

Cele 19 teste sunt în general solide. Valorile de mână vin din brief, nu din cod, și le-am confirmat independent. Control negativ confirmat de planner: 3 teste cad.

1. **Medie, test vacuu** — `tests/2d/hydro.test.ts:94-98` („exact la minLoad·designFlow…”).
   - Testul calculează `t.minLoad * t.designFlow`, exact aceeași expresie ca `qMin` din `hydro.ts:59`. Câtul `flow / qMin` e deci exact 1.0, iar `floor(1 + 1e-9)` dă 1 și fără `+ 1e-9`.
   - Testul trece chiar dacă toleranța dispare, contrar afirmației din raportul tester-ului.
   - Remediu: fie îl elimini (nu era în brief), fie folosești un debit puțin sub prag, de exemplu `qMin * (1 - 1e-12)`, care trebuie să dea `running === 1` datorită toleranței.
2. **Mică, redundanță** — `hydro.test.ts:124-125`. `spilledFlow >= 0` și `powerKW === 0` sunt deja acoperite de `toEqual` cu `operate(..., 0)` de pe linia 123 și de testul de conservare. Pot fi șterse fără pierdere.
3. **Mică, redundanță** — `hydro.test.ts:132-143` (testele 1 și 2 din `powerCurve`). Verifică aceeași logică (lungime `steps + 1` și ultimul flow). Al doilea adaugă doar valorile implicite 121 și RIVER_MAX, care sunt legate de configurație.
4. **Mică, redundanță** — `hydro.test.ts:70-80` („o turbină în plus”). E adevărată prin construcție (set de candidați mai mare), dar cade și la regula veche („toate pornibile”), deci are valoare. Se suprapune parțial cu rândurile 3 și 6 din cazurile de mână, dar brief-ul o cerea explicit.
5. **Mică, acoperire** — parametrul `headM` nu e testat (toate cazurile folosesc H=5 implicit). Un bug care îl ignoră nu cade. Nici tie-break-ul spre k mai mic nu e testat (tester-ul a declarat-o deliberat, iar brief-ul nu cerea un caz numit).
6. **Mică, aserțiuni** — câmpul `load` nu e verificat în cazurile de mână, în afară de testul „plin la debit mare” (`load ≈ 1`) și de efect indirect prin `eta`. E acceptabil.

## Concluzie
Livrarea e în regulă. Planner-ul poate accepta ca atare, cu o corectură opțională la `hydro.test.ts:94-98` și, dacă vrea, observația 1 de la cod (hit-test pe acoperiș în iso), care ar merita un ticket separat.

Fișiere verificate:
- D:\GridSim\2d\hydro.ts
- D:\GridSim\2d\panel.ts
- D:\GridSim\2d\main.ts
- D:\GridSim\2d\index.html
- D:\GridSim\2d\style.css
- D:\GridSim\tests\2d\hydro.test.ts

---

## Decizia planner-ului

**Accept.** Corecturi aplicate direct, fiecare sub 30 de linii:
- **Cod, observația 1:** funcția `plantAtScreen` testează în iso și înălțimile 0–1 ale clădirii. Hover-ul, click-ul și conturul o folosesc.
- **Cod, observația 2:** `progress` e limitat la intervalul [0, 1].
- **Tester, punctul 1:** testul folosește acum `qMin · (1 − 1e-12)`. Control negativ: fără `+ 1e-9` în `hydro.ts`, testul pică (1 failed, 18 passed). Cu toleranța la loc, trec 19/19.

**Lăsate cum sunt:**
- Codul, observațiile 3 și 4: cosmetice, acceptabile.
- Tester-ul, punctele 2–6: redundanțe mici și acoperire opțională. Le reiau dacă `headM` devine variabil în UI.

**Starea finală:**
- `tsc` curat;
- vitest 183/183;
- capturile fără erori în consolă.
