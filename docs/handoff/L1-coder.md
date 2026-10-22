# L1 · coder — pagina /learn/, lecțiile 1–3 din „Hydro · Pelton”

Planner: Claude (sesiunea principală). Data: 22-10-2026. Raportul îl scrii în `docs/handoff/L1-coder-raport.md`.

## Sarcina

Construiește pagina `/learn/` (Vite multi-page, deja configurată în `vite.config.ts`) cu lecțiile 1–3 jucabile ale modulului „Hydro · Pelton” din produsul „Learn Energy”. Lecțiile 4–12 apar în listă, blocate.

## Citește înainte (în ordinea asta)

1. `docs/learn/pelton/plan.md`: structura de fișiere și **contractul DOM** (obligatoriu, pe el se bazează scripturile de verificare).
2. `docs/learn/pelton/frame/hydro-frame.html` + `hydro-frame.png`: **referința vizuală aprobată**. Portezi de aici CSS-ul, helperii de desen (hull, LineSegments2, `part`, `at`, `box`, `rbox`, `cyl`, `xcyl`, `zcyl`, `tube`, `textTex`, `decal`), lumina, camera ortografică, callout-urile cu linii punctate, miniaturile și agregatul Pelton (`makeRunner`, `makeNozzle`, `makeGenerator`, `makeCabinet`, `makeUnit`). Frame-ul are CSS de bază plus override-uri „variant A” într-un al doilea `<style>`; în `learn/style.css` le scrii **direct în forma finală**, fără `display:none` pe elemente moarte (rail, clock, hint, zoombar, progress nu există deloc).
3. `docs/learn/pelton/lectia-01.md`, `lectia-02.md`, `lectia-03.md`: **conținutul exact**: obiectul central, callout-urile (textele din coloana „Text”, verbatim), tab-urile, simulatorul, ID-urile afirmațiilor.
4. `AGENTS.md`: regulile repo-ului.

## Ce trebuie să facă pagina

- **Layout varianta A** (vezi png): brand sus-stânga („LEARN ENERGY / FALL · SPIN · POWER”, logo picătură), bara de progres cu 12 segmente + „Hydro · Pelton” + „N / 12”, coloana de lecții în stânga (12 rânduri: număr, miniatură, titlu, săgeată sau lacăt), scena în centru cu callout-uri, panoul din dreapta cu tab-urile Overview / Parts / How it works / Specs și cardul „Try it yourself”, butoanele scenei (pan, +, −, reset) în colțul stânga-jos al scenei, creditul jos-stânga: `Layout inspired by <a href="https://learn-arduino-red.vercel.app/">Learn Arduino</a> by Dilum Sanjaya`.
- **Clic pe o lecție deblocată** (1–3) schimbă scena, callout-urile, panoul și simulatorul; actualizează `?lesson=N` (history.replaceState) și bara de progres.
- **Tab-urile** își schimbă conținutul (Overview, Parts, How it works, Specs) din `lessons.ts`.
- **Camera:** ortografică izometrică ca în frame; drag rotește în jurul axei verticale, scroll face zoom, butoanele + / − / reset funcționează. Callout-urile se repoziționează la fiecare schimbare de cameră (proiectezi ancorele 3D, ca în frame).
- **Scene:**
  - `plant.ts` (L1, L2): diorama pe un bloc de teren în pantă, citit ca **obiect**, nu ca hartă: pârâu, prag + priză, canal pe curba de nivel, camera de încărcare cu grătar, conducta forțată, clădirea centralei, canalul de fugă, 2 stâlpi cu linia electrică. Aceleași materiale, contur și paletă ca frame-ul. Expune ancore pentru callout-uri și `highlight(partId)`.
  - În L2 adaugi cota **H** (linie verticală cu capete, de la nivelul apei din camera de încărcare la turbină, etichetă „H”) și săgeata **Q** pe conductă.
  - `intake.ts` (L3): prag peste albie, priza laterală cu grătar, deznisipatorul (bazin lărgit, prag la ieșire, vană de spălare), începutul canalului, particule de nisip.
  - `pelton.ts`: agregatul din frame (miniaturi și lecțiile viitoare).
- **Simulatoare** (în cardul „Try it yourself”, cu `<input type="range">` reale, valorile afișate în JetBrains Mono):
  - **L1:** butonul Run animă o picătură de-a lungul celor 7 piese (fiecare se evidențiază pe rând). Exercițiul: 7 carduri amestecate (`[data-order]`), mutate cu săgeți sus/jos, apoi butonul „Check” (`[data-check]`) arată corect/greșit folosind `sim/order.ts`.
  - **L2:** `head` 5–150 m (60), `flow` 5–300 L/s (40), `eff` 0,50–0,70 (0,60) → `[data-out=power]` cu o zecimală, „14.1 kW”. Butonul „Same power, two ways” comută (100 m, 20 L/s) și (10 m, 200 L/s).
  - **L3:** `flow` 10–100 L/s (40), `grain` 0,10–0,50 mm (0,20), `width` 0,20–1,00 m (0,40) → `[data-out=vd]` „27.9 mm/s”, `[data-out=length]` „3.58 m” (două zecimale), `[data-out=warn]` vizibil și cu text doar când B > L/8. Nota „still-water first estimate (ESHA)” sub rezultate.
- **`learn/sim/*.ts`** e cod pur (fără three, fără DOM), funcții exportate cu tipuri explicite:
  - `power.ts`: `powerKW(headM, flowLps, eff)` cu g = 9,81;
  - `settling.ts`: `zankeVdMmS(dMm)` după S2 ec. 5.8, `trapLengthM(flowLps, vdMmS, widthM)`, `widthTooLarge(widthM, lengthM)` (B > L/8);
  - `order.ts`: `PLANT_ORDER` (cele 7 ID-uri în ordine) și `isCorrectOrder(ids)`.
- **`lessons.ts`:** fiecare text afișat care conține o afirmație poartă ID-urile ei (`claims: ["A2","A3"]`). **Nu folosi** rândurile marcate „de găsit” în lecții (A11, A12, B5 ca afirmație, C8 ca afirmație). B5 („Real plants keep 50–70%”) se afișează doar ca „NRCan uses e = 0.5–0.7”, cu claims `["B3"]`. C8 se omite.
- `window.__learnReady = true` după prima randare a lecției curente (după `document.fonts.ready` și miniaturi).

## Constrângeri dure

- TypeScript strict (`tsconfig.json` include deja `learn/`). Importă three din pachetul npm `three` (0.180) și `three/examples/jsm/...`, **nu din CDN**. Fonturile: Barlow Semi Condensed, Barlow și JetBrains Mono de la Google Fonts sunt permise ca `<link>` în `learn/index.html`; iconurile Phosphor din pachetul `@phosphor-icons/core` existent (SVG-uri) sau `<link>` la `@phosphor-icons/web@2.1.1` de pe unpkg, ca în frame.
- Nu copia nimic de la learn-arduino-red.vercel.app (cod, asset-uri). Nu adăuga ceas, bară de iconuri sau pastilă de comenzi.
- Nu adăuga dependențe npm noi.
- Nu inventa conținut tehnic: orice text vine din `lectia-0N.md`. Dacă îți lipsește ceva, scrie în raport, nu completa din cap.

## Ce nu ai voie să atingi

`src/`, `2d/`, `map/`, `plant/`, `art/`, `tests/` (inclusiv `tests/learn/`, e al tester-ului), `scripts/`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `package.json`, `docs/` (în afară de raportul tău).

## Rezultatul așteptat

- Fișierele din `learn/` conform structurii din `plan.md`.
- `docs/handoff/L1-coder-raport.md` cu:
  - lista fișierelor;
  - ce ai portat din frame și ce ai scris nou;
  - orice abatere de la brief și motivul ei;
  - ce n-ai putut face.

Nu rulezi comenzi și nu poți spune că ceva „trece”; planner-ul rulează verificările.
