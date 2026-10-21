# P5 coder: raport

Nu am rulat nimic (typecheck, build, vizual: toate de verificat de planner).

## Schimbare de scope primită în timpul lucrului
Telefonul (390 px) e scos din P5: `setPaddingBottom` NU există în contract (nu e nici no-op; dacă P6 îl apelează, typecheck pică, deci trebuie scos și de acolo). Țintă doar desktop, 60 fps. Încadrarea e calculată pentru desktop (vezi `rig.ts`), fără optimizare pentru ecrane înguste.

## API final (`src/scene/index.ts`)
```ts
export interface SceneHandle {
  update(snapshot: Snapshot, dtSeconds: number): void; // aplică snapshot-ul ȘI randează un cadru
  resize(width: number, height: number): void;
  setPaddingRight(px: number): void;
  dispose(): void;
}
export function mountScene(canvas: HTMLCanvasElement): SceneHandle;
```
- `update` randează singur (P6 nu apelează renderer-ul). dt e plafonat la 1/30 s intern.
- `window.__gridsimReady = true` după primul cadru; `window.__gridsimScene = { litWindowCount() }` setat la `mountScene`. Ambele declarate prin `declare global` în `index.ts` (tipuri identice cu cele din vechiul main.ts, deci fără conflict dacă P6 le redeclară la fel).
- Scena nu pornește nicio buclă. Sub `prefers-reduced-motion` (citit la mount, ascultă schimbări): fără rotație turbină, fără abur în mișcare, fără pulsare linii, fără ondulare apă; rămân stările statice.

Exemplu minim (pentru verificare vizuală, nu e în repo):
```ts
import { createSession } from "./game";
import { mountScene } from "./scene";
const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const scene = mountScene(canvas);
const session = createSession("level1");
session.start();
scene.setPaddingRight(0);
scene.resize(innerWidth, innerHeight);
addEventListener("resize", () => scene.resize(innerWidth, innerHeight));
let last: number | null = null;
requestAnimationFrame(function loop(t) {
  const dt = last === null ? 0 : (t - last) / 1000;
  last = t;
  session.advance(dt);
  scene.update(session.snapshot(), dt);
  requestAnimationFrame(loop);
});
```
(Atenție: `session.snapshot()` consumă `newMessages`; scena nu apelează `snapshot()`, doar primește obiectul.)

## Fișiere (toate noi, în `src/scene/`)
- `index.ts`: `mountScene`, renderer, dezaturare la blackout (fade ~0,7 s), globals.
- `world.ts`: leagă snapshot-ul de obiecte: sincronizare sloturi, UFLS, fire, `litWindowCount`.
- `slots.ts`: tabelul de sloturi, `SlotAllocator` (TS pur, fără three; testabil), mapările kind -> slot.
- `island.ts`: insulă, apă, spumă, stânci și copaci (instanced), lumini.
- `rig.ts`: cameră ortografică (aceleași unghiuri ca spike-ul), OrbitControls cu limită de pan, încadrare cu `paddingRight`.
- `parts.ts`: materiale partajate, `solid/roundedBox/at/beamGeometry/placeMatrix/worldPoint/makeMast`, dezaturare, dispose.
- `windows.ts`: `createWindowBatch` (ferestre instanced, strat aprins/stins).
- `wires.ts`: fire cu lăsătură + pulsul accentului (`updateGlow`).
- `buildings/`: `common.ts` (tipuri `SceneActor`/`UnitActor`, cabină), `gas.ts`, `wind.ts`, `solar.ts`, `battery.ts`, `hydro.ts`, `city.ts` (cartiere), `consumers.ts` (fabrică, data center, EV), `substation.ts` (transformator + stâlp).
- `palette.ts`: neatins.

## Harta sloturilor (x, z; primul liber se ocupă)
- hydro (2): (3.6, 5.0), (-1.6, -6.0, rot π; lacul spre +z)
- ccgt (1): (3.2, -3.8)
- ocgt (2, scară 0.55): (5.9, -1.0), (6.0, 1.0)
- solar (3): (1.0, -6.4), (2.8, -6.4), (6.2, 3.4)
- wind (3): (4.5, -6.0), (6.7, -3.3), (-3.8, -6.6)
- battery (2): (0.7, 3.4), (-1.2, 3.1)
- factory (1): (-3.0, -1.9); datacenter (1): (2.8, 0.3); ev (1): (-1.0, -0.5)
- cartiere (6, câte 3 case), în ordinea stingerii: (-5.4, 3.0), (-2.6, 4.9), (-6.1, -0.9), (0.2, 5.6), (-5.0, -4.4), (-3.0, 1.0)
- fix: transformator (0.6, -2.2), stâlp (0.2, 1.0), copaci în locuri libere.
Unitățile peste numărul de sloturi ale tipului lor nu se desenează (apare doar în sandbox, unde se pot construi oricâte). `nuclear`/`coal` nu au model: ignorate.

## Decizii
- **UFLS:** blocurile de consum sunt cele 6 cartiere (fiecare cu `mw(homes)/6`), apoi consumatorii non-homes în ordinea din snapshot. `shedMW = shedFraction · total MW`; un bloc e stins cât timp MW deja acoperiți < shedMW. Deci orice fracție > 0 stinge cel puțin primul cartier; fabrica/data center-ul se sting ultimele. Cartierul stins își pierde și linia (fir gri). Un bloc cu 0 MW e stins.
- Casele din `homes` adăugate în sandbox nu creează obiecte (orașul e mereu acolo); fără niciun consumator `homes`, cartierele sunt stinse.
- **Blackout:** ferestre stinse, toate firele gri, toate culorile materialelor partajate (și apa/fundalul) pierd până la 80% din saturație.
- **Unitate offline:** ferestrele ei se sting, firul devine gri; gaz: abur dispare; hidro: dispare cascada de pe deversor; eolian: rotorul se oprește (viteza = 2,2 rad/s · p/pMax).
- **Abur:** 6 bule instanced, mărime ∝ 0,35 + 0,65·p/pMax.
- **Fire:** un singur material "live" cu accent; intensitatea și viteza pulsului ∝ `pGen / suma pMax online`. Un fir per clădire, de la catargul ei la cel mai apropiat izolator (consumatori/cartiere -> stâlp, unități -> izolatori transformator, transformator -> stâlp).
- **`litWindowCount`:** numără toate ferestrele aprinse din scenă (cartiere + centrale + consumatori), nu doar orașul. La un tripUnit scade și numărul de ferestre ale centralei oprite (puțin); dacă G7 vrea strict orașul, spune și restrâng.
- Pilonul are barele îmbinate într-un singur mesh (draw calls). Ferestrele sunt `InstancedMesh` per clădire/cartier; panourile, stâncile și copacii la fel.
- Casele nu mai au gard/coș (decor din spike, nefolosit de logică).

## Nu am făcut
- `src/scene/spike.ts` NU e șters (nu am unelte de ștergere, și `main.ts` actual îl importă). Planner: ștergeți-l după ce P6 înlocuiește `main.ts`. Nu mai e importat de modulele noi.
- Nicio optimizare pentru ecran îngust, niciun test. Clădirile în construcție (`pendingBuilds`) nu au reprezentare.

## De verificat (planner)
- `npm run typecheck`, `npm run build` (folosesc `mergeGeometries` din `three/examples/jsm/utils/BufferGeometryUtils.js`, `RoundedBoxGeometry`, `OrbitControls`: deja în three, fără dependențe noi).
- Vizual 1280x800, level1: ciocniri între sloturi (am estimat poziții din amprente aproximative, fără randare): cartiere vs stâlp/fabrică, hidro (3.6, 5.0) vs rim, OCGT vs cascadă, cartierul (-5.0, -4.4) aproape de marginea insulei, turbinele (înalte) vs ce e în spatele lor.
- Scenariu: `tripUnit gas` (abur dispare, fir gri), shed (cartiere întregi se sting în ordine), blackout (dezaturare), demolare/construire în sandbox (obiecte apar/dispar în primul slot liber).
- Încadrarea cu `setPaddingRight(panel)`: insula ar trebui centrată în zona liberă.
- Test unitar posibil (pentru tester): `SlotAllocator` (prim slot liber, reutilizare după eliminare, depășire capacitate) și regula UFLS (logica e în `world.ts`, închisă în `createWorld`; dacă se vrea testabilă pură, se extrage).
