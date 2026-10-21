# S3: brief pentru tester. Rescrierea testelor de fizică pentru upgrade-uri

## Context

Coder-ul a livrat noul `2d/hydro.ts`, conform `docs/handoff/S3-coder.md`. Citește secțiunea „Upgrade-urile și fizica lor”, raportul coder-ului (`docs/handoff/S3-coder-raport.md`) și codul.

## Ce livrezi

Rescrii integral `tests/2d/hydro.test.ts`, pentru că API-ul s-a schimbat. **Testele verifică regulile din brief, nu implementarea.** Valorile vin din calcul de mână.

Recalculează independent fiecare rând de mai jos. Dacă obții altceva, folosește valoarea ta și notează divergența în raport.

### Cazuri de mână

Unde nu se spune altfel: medium ×1, dam 5, fără canal, clog 0, fără scara de pești, cu stavile, Kaplan. Toleranța e 0,5%.

| # | Diferența față de bază | Debit | stopReason | running | used | spilled | eco | netHead | P (kW) |
|---|---|---|---|---|---|---|---|---|---|
| A | (baza) | 3 | null | 1 | 2 | 1 | 0 | 5 | 88,29 |
| B | scara de pești | 3 | null | 1 | 2 | 0,7 | 0,3 | 5 | 88,29 |
| C | Francis, dam 8, canal, scara de pești | 3 | null | 1 | 2 | 0,7 | 0,3 | 11,6 | 204,67 |
| D | Francis | 3 | "head" | 0 | 0 | 3 | 0 | 5 | 0 |
| E | fără stavile, scara de pești | 9 | "flood" | 0 | 0 | 8,7 | 0,3 | 5 | 0 |
| F | clog 1 | 3 | null | 1 | 2 | 1 | 0 | 4,7 | 82,99 |
| G | (baza) | 0,35 | "low-flow" | 0 | 0 | 0,35 | 0 | 5 | 0 |
| H | Crossflow | 0,35 | null | 1 | 0,35 | 0 | 0 | 5 | 12,99 |
| I | Francis ×2, dam 8, canal | 3 | null | 2 | 3 | 0 | 0 | 11,6 | 310,94 |

Pentru C, verifică și `installedKW` = 204,67 (fără pierderea la grătar). La I, alternativa k = 1 dă 204,67, deci trebuie ales k = 2.

### `stepClog`

- (0, 3, false, 90) → 0,5;
- (0, 6, false, 90) → 1 (plafon);
- (0,9, 3, true, 10) → ≤ 0,05;
- (0, 0, false, 100) → 0.

### `annual`

- Ianuarie, pentru baza cu `autoCleaner` (clog 0,05, debit 1,8): netHead = 5 − 0,015 = 4,985, L = 0,9, η = 0,9 · (1 − 0,15 · 0,01) = 0,89865, P ≈ 79,10 kW, energia ≈ 79,10 · 31 · 24 / 1000 ≈ **58,85 MWh**. Recalculează.
- `totalMWh` = suma lunilor.
- `capacityFactor` = totalMWh · 1000 / (installedKW · 8760).
- `capacityFactor` e între 0 și 1 pe o grilă de setup-uri.

### Proprietăți (pe o grilă de setup-uri și debite)

1. **Conservarea apei:** used + spilled + eco = debitul (limitat la ≥ 0).
2. **Puterea nu scade cu o turbină în plus**, la același setup.
3. **Ordinea motivelor de oprire:** flood are prioritate față de head, iar head față de low-flow. Construiește un caz în care se îndeplinesc toate trei.
4. **Barajul mai înalt nu scade niciodată puterea** dacă stopReason rămâne null la ambele înălțimi.
5. **Grătarul înfundat nu crește niciodată puterea.**
6. **Pragul de pornire pe tehnologie:** la (minLoad − 0,01) · designFlow, o singură turbină nu pornește; la (minLoad + 0,01) · designFlow pornește. Baza fără scara de pești și o cădere permisă (pentru Francis: dam 8 + canal).
7. **Intervalul de cădere:** Francis cu dam 5 + canal (gross 9) → "head"; cu dam 8 fără canal (gross 8) → "head"; cu dam 8 + canal (gross 12) → rulează.

## Constrângeri

- **Fiecare test trebuie să poată pica.** Fără redundanțe: un caz de mână nu se repetă ca proprietate.
- **Atenție la lecția din S2:** nu construi debitul de test cu exact aceeași expresie ca pragul din cod. Testul ar trece și fără toleranță.
- Nu modifici `2d/`. Nu rulezi comenzi.
- Raportul îl scrii în `docs/handoff/S3-tester-raport.md`.
