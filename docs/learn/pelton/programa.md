# Learn Energy · Modulul 1: Hydro · Pelton — programa

Stare: **aprobată de Lucian 22-10-2026** (doar surse gratuite; primele 3 lecții în lucru)
Stil: style frame aprobat, `D:\_studii\learn-energy\hydro-frame.html` (se mută în repo la pasul UI).
Prompt aprobat: felie verticală — programa (acest fișier) → o lecție completă cu surse → simulator Pelton testat → UI React Three Fiber.

## Reguli de conținut

- Fiecare afirmație din lecție are **≥ 2 surse independente**, din care una primară. Fără două surse, afirmația nu intră.
- Fiecare cifră din simulator are un **test Vitest** pe o valoare calculată de mână.
- Simulatorul se compară cu **RETScreen** (rulat pe aceleași date) și cu **≥ 2 fișe de producător** (curbe putere–cădere–debit), la abatere ≤ 10%.
- Validarea finală: **≥ 4 din 5** utilizatori noi răspund corect la întrebarea-obiectiv a lecției, fără ajutor.
- Lucian nu e verificator tehnic (7 ani fără practică); corectitudinea vine din surse, teste și verificare publică.

## Lecțiile

Titlurile UI sunt în engleză (public X); obiectivul e întrebarea la care utilizatorul trebuie să răspundă corect după lecție.

| # | Titlu UI | Ce explică | Obiectiv verificabil | Surse |
|---|---|---|---|---|
| 1 | Meet the plant | Drumul apei: prag → priză → conductă → duză → rotor → generator → canal de fugă | Pune cele 7 piese în ordinea prin care trece apa | S1, S2, S4 |
| 2 | Head and flow | Cele două „ingrediente”: căderea H și debitul Q; P = ρ·g·Q·H·η | Calculează P pentru H = 60 m, Q = 40 L/s, η = 0,8 (răspuns: 18,8 kW) | S1, S2, S4 |
| 3 | Weir & intake | Pragul deviază o parte din pârâu; grătar, deznisipator, camera de încărcare | De ce trebuie scoase nisipul și pietrișul înainte de conductă? (uzează duza și cupele) | S2, S4 |
| 4 | Penstock | Cădere brută vs. netă; pierderi prin frecare | De ce căderea netă e mai mică decât cea brută, și ce o reduce? | S1, S2, S4 |
| 5 | Valve & water hammer | Vana de admisie; lovitura de berbec la închidere bruscă | De ce vana se închide încet? | S2, S3 |
| 6 | Nozzle & spear | Presiunea devine viteză: v = Cv·√(2gH), Cv ≈ 0,97; acul reglează debitul; deflectorul | Calculează viteza jetului la H = 60 m | S2, S3, S7 |
| 7 | Pelton runner | Cupe cu muchie despărțitoare; jetul e întors ~165°; viteza optimă a cupei ≈ jumătate din viteza jetului | De ce cupa „vrea” să meargă cu jumătate din viteza jetului? | S2, S3, S7 |
| 8 | Efficiency | Curba de randament Pelton (RETScreen); comportamentul la debit parțial; numărul de jeturi | Citește randamentul la 50% din debitul nominal | S1 |
| 9 | Speed, size, choice | n = 31·(H·Qd/j)^0,5; d = 49,4·H^0,5·j^0,02 / n; de ce Pelton la cădere mare și Kaplan la cădere mică | Alege tipul de turbină pentru o pereche (H, Q) dată | S1, S2 |
| 10 | Generator | Sincron vs. asincron; f = p·n / 120; cuplare directă vs. curea | La câte rpm merge un generator cu 4 poli la 50 Hz? (1500) | S1, S2 |
| 11 | Load controller | Regulatorul electronic de sarcină (ELC) și rezistența de balast țin frecvența la 50 Hz într-o rețea izolată | Ce se întâmplă cu frecvența dacă consumatorii se opresc și nu există ELC? | S5, S6, S2 |
| 12 | The whole chain | Bilanțul pierderilor: cădere brută → netă → turbină → generator → kW și kWh/an | Urmărește unde se pierde energia între pârâu și priză | S1, S2 |

Lecția propusă pentru felia verticală: **6 · Nozzle & spear** sau **2 · Head and flow**. Ambele au o formulă simplă și un simulator natural. Decide Lucian.

## Simulatorul modulului

- Intrări: căderea H, debitul Q, deschiderea acului, numărul de jeturi j (1–6).
- Ieșiri: viteza jetului, randamentul (curba RETScreen Pelton, HYDRO.40), puterea în kW, turația rotorului.
- Cod: TypeScript în `2d/hydro.ts` (unde stau deja Kaplan, Francis și crossflow), cu teste în `tests/2d/`.

## Surse

| Cod | Sursă | Tip | Stare |
|---|---|---|---|
| S1 | RETScreen, *Small Hydro Project Analysis* (ghid + Anexa A, formulele Pelton la HYDRO.40) | primară | **în repo**: `data/refs/retscreen-hydro.pdf`, `appA-p40.png` |
| S2 | ESHA, *Guide on How to Develop a Small Hydropower Plant* (2004) | primară | de descărcat: [SKAT](https://skat.ch/publications/guide-on-how-to-develop-a-small-hydropower-plant), [copie PDF](https://canyonhydro.com/images/Part_1_ESHA_Guide_on_how_to_develop_a_small_hydropower_plant.pdf) |
| S3 | J. Thake, *The Micro-hydro Pelton Turbine Manual* (Practical Action, 2000) | primară | **exclusă**: Lucian a ales doar surse gratuite |
| S4 | NCAT/ATTRA, *Micro-Hydro Power: A Beginner's Guide to Design and Installation* | secundară | [PDF gratuit](https://attradev.ncat.org/wp-content/uploads/2022/06/microhydrodesign.pdf) |
| S5 | Has et al., *Integrated Frequency Control of Microhydro Power Plant…* (ICSPC 2018) | articol | [UMM eprints](https://eprints.umm.ac.id/id/eprint/5030/) |
| S6 | Lucrare UTS despre stabilitatea ELC + AVR | articol | [UTS](https://opus.cloud1.lib.uts.edu.au/bitstream/10453/7429/1/2004001941.pdf) |
| S7 | Note de curs mecanica fluidelor, roata Pelton (Cv, 165°, raportul de viteză 0,46) | secundară | [LMU](https://prog.lmu.edu.ng/colleges_CMS/document/books/GEC223_FLUID_MECHANICS_HYDROPOWER_IMPULSE%20TURBINE_PELTON_WHEEL.pdf) |
| P1 | Fișă PowerSpout PLT (3–130 m, 0,1–10 L/s, max 1,2 kW) | producător | [PDF](https://scoraigwind.co.uk/wp-content/uploads/2011/09/PS-Technical-Specifications-Jan-2014-1.pdf) |
| P2 | a doua fișă de producător (Gilkes, Canyon Hydro sau similar) | producător | **de găsit** |

## Ce am aflat căutând date reale

Studiile de caz publicate despre micro-hidro Pelton sunt deseori **inconsistente**. Testul simplu P ≤ 9,81·Q·H pică la mai multe dintre ele:
- un studiu din Nepal raportează 12 kW la 98 m și 0,242 m³/s, adică un randament implicit de ~5%;
- un studiu din Etiopia raportează mai multă putere decât permite debitul declarat.

Consecința: pentru comparația cu „centrale reale” folosim **fișe de producător** (P1, P2), nu articole. Orice dată nouă trece întâi testul de plauzibilitate.

## Ce urmează după aprobare

1. Descărcarea S2 și S4 în `data/refs/` și extragerea pasajelor care susțin fiecare lecție.
2. Găsirea P2.
3. Lecția aleasă, scrisă complet, cu sursa la fiecare afirmație.
