# Lecția 10 · Generator

Obiectiv verificabil: „La câte rpm merge un generator cu 4 poli la 50 Hz?”
Răspuns: n = 120·f/p = 120 × 50 / 4 = **1500 rpm** (J2). Turbina noastră din L9 merge la 750 rpm, deci are nevoie de o curea cu raportul 2:1 (J4). Fără curea, ar trebui un generator cu 8 poli.

## Obiectul central

Agregatul din `makeUnit`, cu rotorul Pelton și generatorul din `makeGenerator`, pe o placă de bază.

Între ele, după alegerea din simulator, apare:
- un cuplaj direct, adică un ax continuu;
- sau o transmisie cu curea: două roți de curea de diametre diferite și cureaua.

Pe capacul generatorului se văd polii, ca niște pete colorate (2–12) pe rotorul generatorului, vizibil printr-o fereastră decupată.

Animații:
- rotorul turbinei și cel al generatorului se învârt, cu turații proporționale cu cele calculate, încetinite vizual;
- la 50 Hz, un indicator de frecvență de pe panou se aprinde verde.

## Callout-uri (UI, engleză)

| Piesă | Text | Afirmații |
|---|---|---|
| Generator | Turns the shaft's rotation into alternating current. | J1 |
| Poles | More poles, slower speed for the same 50 Hz. | J2, J3 |
| Coupling | Same speed on both sides: a direct shaft, with almost no loss. | J4 |
| Belt | Different speeds: pulleys of two sizes step the speed up. | J4 |
| Frequency | 50 Hz only at the right speed: n = 120·f / p. | J2 |

## Tab-uri

- **Overview:** „The generator's speed decides the frequency. With 4 poles it must turn at exactly 1500 rpm to make 50 Hz. If the turbine runs slower, either the generator gets more poles or a belt steps the speed up.” Rânduri: *n = 120·f / p* (J2) · *Micro-hydro: usually 4 poles, 1500 rpm* (J3) · *Direct shaft or belt* (J4).
- **Parts:** generatorul, polii, cuplajul, cureaua, frecvența.
- **How it works:**
  - un generator de curent alternativ produce o frecvență proporțională cu turația și cu numărul de poli (J1, J2);
  - la micro-hidro se folosesc de obicei generatoare sincrone cu 4 poli, la 1500 rpm. Generatoarele cu mai mulți poli sunt mai mari și mai scumpe (J3);
  - dacă turbina și generatorul au aceeași turație, se cuplează direct; altfel, la mașini mici, se folosește o curea (J4);
  - generatorul sincron poate merge singur, într-o rețea izolată; cel asincron are nevoie de rețea pentru excitație (J5).
- **Specs:** turațiile sincrone la 50 Hz: 2 poli 3000, 4 poli 1500, 6 poli 1000, 8 poli 750, 10 poli 600, 12 poli 500 rpm (J2).

## Simulator: „Match the speeds”

- Intrări:
  - turația turbinei, `select name=turbine` cu 3000, 1500, 1000, 750, 600, 500 rpm (implicit 750, din L9);
  - numărul de poli, `select name=poles` cu 2, 4, 6, 8, 10, 12 (implicit 4);
  - transmisia, `select name=drive` cu `direct` și `belt` (implicit `belt`);
  - raportul curelei, `ratio` 1,0–4,0, pas 0,1 (implicit 2,0), activ doar cu `belt`.
- Formule:
  - n_gen = n_turbină × raport, cu raportul 1 la `direct`;
  - f = p · n_gen / 120.
- Ieșiri:
  - turația generatorului (rpm, fără zecimale);
  - frecvența (Hz, 1 zecimală);
  - raportul necesar pentru 50 Hz = (120·50/p) / n_turbină (2 zecimale);
  - starea „50 Hz ✓”, vizibilă doar când |f − 50| < 0,5 Hz.
- Nota de limită: „belt slip and losses ignored”.

Valori de test (calculate de mână):

| Turbină (rpm) | Poli | Transmisie | Raport | n_gen | f (Hz) | Raport pentru 50 Hz | 50 Hz ✓ |
|---|---|---|---|---|---|---|---|
| 750 | 4 | belt | 2,0 | 1500 | **50,0** | 2,00 | da |
| 750 | 8 | direct | — | 750 | 50,0 | 1,00 | da |
| 750 | 4 | direct | — | 750 | **25,0** | 2,00 | nu |
| 750 | 6 | belt | 2,0 | 1500 | 75,0 | 1,33 | nu |
| 1500 | 4 | direct | — | 1500 | 50,0 | 1,00 | da |

- **Control extern 1 (S19 tab. 6.5):** turațiile sincrone la 50 Hz pentru 2–28 de poli. Formula reproduce toate rândurile, cu ESHA trunchiind la întreg (14 poli: 428,6 → „428”; 22 poli: 272,7 → „272”; 26 poli: 230,8 → „231”). Test: |n − n_ESHA| < 1 rpm.
  - **Erată în coloana de 60 Hz a sursei:** 14 poli dau 7200/14 = 514,3, nu „540”; 26 de poli dau 276,9, nu „377”. Testul folosește doar coloana de 50 Hz și rândurile de 60 Hz fără erată.
- **Control extern 2 (S19 §6.4.1, fig. 6.34):** „a vertical axis Kaplan turbine turning at 214 rpm directly coupled to a custom made 28 poles alternator”. Calculat: 120 × 50 / 28 = 214,3 rpm. Test: ≤ 0,5 %.

## Afirmații și surse

| ID | Afirmație | Surse |
|---|---|---|
| J1 | Generatorul transformă energia mecanică în energie electrică; în practică, curent alternativ | S19 §6.4 („Generators transform mechanical energy into electrical energy… only three-phase alternating current generators are used”); S13 p. 17–18 („For larger power outputs a.c. generators (alternators) are used”); S17 §3.2 |
| J2 | Turația generatorului depinde de frecvență și de numărul de poli: n = 120·f / p; la 50 Hz, 4 poli înseamnă 1500 rpm | S17 §3.2 („N = 120 f / P”); S19 tab. 6.5 (4 poli, 50 Hz: 1500); S13 p. 18 („four pole machines to run at 1,500 rpm (50Hz)”) |
| J3 | La micro-hidro se folosesc de obicei generatoare sincrone cu 4 poli; cele cu mai mulți poli sunt mai mari și mai scumpe | S13 p. 18 („normally four pole machines… Lower speed machines, with more poles… will be more expensive”); S17 §3.2 („For more than 12 poles, the generator size is generally larger and more expensive”) |
| J4 | Dacă turbina și generatorul au aceeași turație, se cuplează direct, practic fără pierderi; altfel se folosește un multiplicator de turație, la mașinile foarte mici o curea cu roți de curea | S19 §6.3 („direct coupling is the right solution; virtually no power losses”; fig. 6.33, „Belt speed increaser”); S17 §3.2 („desirable to directly couple turbine and generator… a speed-up gear system is employed”); S13 p. 17 („driving the alternator by belt and pulleys to give the required speed”) |
| J5 | Generatorul sincron poate funcționa izolat, având excitația proprie; cel asincron (de inducție) își ia excitația din rețea și în mod normal nu poate funcționa singur | S19 §6.4 („Synchronous generators can run isolated… Asynchronous… cannot generate when disconnected from the grid”); S17 §3.2 („Because induction generators operate by excitation current from a connected power grid, isolated operation… not possible”); S13 p. 19 („they cannot normally be used independently of a main grid supply”) |
| J6 | Exemplul: turbina Kaplan la 214 rpm cuplată direct la un alternator cu 28 de poli | S19 §6.4.1; *a doua sursă de găsit*, deci doar control în teste |
