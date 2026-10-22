/* GridSim map in the Colorfigures style (classic script, loaded after vendor/colorfigures/core.js).
   The map is the 2D game's idea at a bigger size: grass tiles, a river with right-angle turns, the dam and the
   powerhouse. Tiles, trees and buildings keep the 2D scale; the map is about 1.6 times larger.
   Coordinates: x = depth (toward the viewer-right), y = width (toward the viewer-left), z = up. 1 tile = T units.
   A map cell (col, row) sits at x = row * T, y = (COLS - col) * T.
   window.GridMap = { mount(hooks), zoomTo(amount) } is what map/main.ts uses. */

/* ---------- Everything you might want to change lives here ---------- */
const GM = {
  cols: 50, rows: 32, tile: 10, ground: 8,
  riverWidth: 2,
  river: [[-1, 9], [14, 9], [14, 15], [31, 15], [31, 20], [51, 20]],
  dam: { col: 23, row: 15 },
  /** Click on the plant: the 2D game zoomed 2.6 x on its 32 x 20 map fitted to the window (5% margin each side). The view
      after the click shows that same stretch of land: (32 + 20) tiles across the iso diagonal, divided by 2.6. */
  zoom2d: { cols: 32, rows: 20, factor: 2.6, fit: 0.9 },
  zoomMs: 600,
  /** Ink weight relative to the Colorfigures default (1 = its own, heavier line). */
  inkThin: 0.6,
  trees: 70,
};

/* ---------- materials ---------- */
const GM_GRASS = { l: '#b3d189', m: '#97b96e', d: '#5f7d45' }, GM_GRASS2 = { l: '#a8c87f', m: '#8dae65', d: '#58753f' };
const GM_SOIL = { l: '#c49a6c', m: '#a67c52', d: '#6d4f33' };
const GM_WATER = { l: '#8fc0e8', m: '#6aa3d3', d: '#3f6f9c' };
const GM_CONCRETE = { l: '#ece6d6', m: '#d3cbb7', d: '#9e9682' };
const GM_WALLS = { l: '#f6efdf', m: '#e2d7bf', d: '#b3a588' };
const GM_ROOF = PALS.tomato;
const GM_LEAF = { l: '#8cc46a', m: '#6ea64f', d: '#3c6230' }, GM_LEAF2 = { l: '#a3cf6e', m: '#84b252', d: '#4a6b2c' };
const GM_BARK = { l: '#a77a52', m: '#8a603d', d: '#55391f' };

const T = GM.tile, GROUND = GM.ground;
const W3 = (col, row, z = 0) => [row * T, (GM.cols - col) * T, z];

/* ---------- river and water tiles ---------- */
const gmSegs = GM.river.slice(1).map((b, i) => [GM.river[i], b]);
const distToRiver = (x, y) => Math.min(...gmSegs.map(([a, b]) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  const k = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
  return Math.hypot(x - (a[0] + dx * k), y - (a[1] + dy * k));
}));
const isWater = (c, r) => c >= 0 && r >= 0 && c < GM.cols && r < GM.rows && distToRiver(c + 0.5, r + 0.5) <= GM.riverWidth / 2;

/* ---------- trees: a fixed scatter on grass, away from the river and the plant ---------- */
const GM_TREES = [];
{ let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 400 && GM_TREES.length < GM.trees; i++) {
    const c = 1 + rnd() * (GM.cols - 2), r = 1 + rnd() * (GM.rows - 2);
    if (distToRiver(c, r) < 2.4 || Math.hypot(c - (GM.dam.col + 1), r - (GM.dam.row - 3)) < 5) continue;
    GM_TREES.push({ c, r, h: 9 + rnd() * 7, kind: rnd() < 0.55 ? 'round' : 'pine' });
  } }

/* ---------- ground: soil block, checker grass, the river cut into it with bank walls ---------- */
function gmGround() {
  let s = '';
  const x1 = GM.rows * T, y1 = GM.cols * T, wz = GROUND - 2;
  s += box(0, 0, 0, x1, y1, GROUND, GM_SOIL, tone, 1.2);
  const quad = (c, r, z) => [W3(c, r, z), W3(c + 1, r, z), W3(c + 1, r + 1, z), W3(c, r + 1, z)];
  // All tiles of one colour go in one path: three paths instead of 1,600 elements keep turning the map smooth.
  const light = [], dark = [], water = [];
  for (let r = 0; r < GM.rows; r++) for (let c = 0; c < GM.cols; c++) {
    if (isWater(c, r)) water.push(pd(quad(c, r, wz)));
    else ((r + c) % 2 ? light : dark).push(pd(quad(c, r, GROUND)));
  }
  // The whole top in the darker green first, then only the lighter tiles and the water over it, with no seam strokes:
  // nothing can show between tiles, and there is half as much to paint.
  s += fill(pd([W3(0, 0, GROUND), W3(GM.cols, 0, GROUND), W3(GM.cols, GM.rows, GROUND), W3(0, GM.rows, GROUND)]), GM_GRASS2.l);
  s += fill(light.join(''), GM_GRASS.l) + fill(water.join(''), GM_WATER.l);
  void dark;
  // Bank walls: on every edge between a water tile and a grass tile, a wall from the water up to the grass,
  // drawn when its face (pointing into the channel) is toward the viewer.
  // Walls of one tone share one path, and all their outlines one more path.
  const walls = new Map(), wallInk = [];
  for (let r = 0; r < GM.rows; r++) for (let c = 0; c < GM.cols; c++) {
    if (!isWater(c, r)) continue;
    // each neighbour: the shared edge (two corners of this tile) and the wall's normal into the water tile
    const edges = [
      [c, r - 1, [c, r], [c + 1, r]],
      [c, r + 1, [c, r + 1], [c + 1, r + 1]],
      [c - 1, r, [c, r], [c, r + 1]],
      [c + 1, r, [c + 1, r], [c + 1, r + 1]],
    ];
    for (const [nc, nr, a, b] of edges) {
      if (nc < 0 || nr < 0 || nc >= GM.cols || nr >= GM.rows || isWater(nc, nr)) continue;
      const pa = W3(a[0], a[1]), pb = W3(b[0], b[1]), mid = W3(c + 0.5, r + 0.5), em = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
      const n = norm([mid[0] - em[0], mid[1] - em[1], 0]);
      if (!vis(n)) continue;
      const d = pd([[pa[0], pa[1], wz], [pb[0], pb[1], wz], [pb[0], pb[1], GROUND], [pa[0], pa[1], GROUND]]), colour = tone(n, GM_SOIL);
      walls.set(colour, (walls.get(colour) || '') + d);
      wallInk.push(d);
    }
  }
  for (const [colour, d] of walls) s += fill(d, colour);
  s += ink(wallInk.join(''), .6);
  // flow streaks, all in one path
  const streaks = [];
  for (let i = 0; i < 40; i++) {
    const [a, b] = gmSegs[i % gmSegs.length], k = (i * 0.37) % 1;
    const along = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(...along), off = ((i * 0.61) % 1 - 0.5) * 1.2;
    const x = a[0] + along[0] * k - along[1] / L * off, y = a[1] + along[1] * k + along[0] / L * off;
    if (x < 0 || y < 0 || x > GM.cols - 1 || y > GM.rows - 1) continue;
    streaks.push(pd([W3(x, y, wz + 0.1), W3(x + along[0] / L * 0.8, y + along[1] / L * 0.8, wz + 0.1)], false));
  }
  s += `<path d="${streaks.join('')}" stroke="#e8f4fc" stroke-width="1.4" stroke-linecap="round" fill="none"/>`;
  // every tree's cast shadow in one path, on the ground under all the trees
  const shadows = GM_TREES.map(t => { const [x, y] = W3(t.c, t.r); return (castShadow([[x - 3, y - 3, GROUND], [x + 3, y + 3, GROUND], [x, y, GROUND + t.h]], GROUND).match(/d="([^"]+)"/) || [])[1] || ''; });
  s += fill(shadows.join(''), SHADOW);
  s += hullInk([[0, 0, 0], [x1, 0, 0], [x1, y1, 0], [0, y1, 0], [0, 0, GROUND], [x1, 0, GROUND], [x1, y1, GROUND], [0, y1, GROUND]], 2.4);
  return s;
}

function gmTree(t) {
  const [x, y] = W3(t.c, t.r), z0 = GROUND, trunkTop = z0 + t.h * 0.35, leaf = t.c > GM.cols / 2 ? GM_LEAF : GM_LEAF2;
  // Light geometry (few facets): ninety of these are redrawn on every frame while the map turns.
  let s = cyl(x, y, z0, trunkTop + 1, 0.9, GM_BARK, tone, .9, 6);
  if (t.kind === 'pine') s += rod([x, y, trunkTop], [x, y, z0 + t.h], 4.2, leaf, tone, 1.4, 0.3, 9);
  else {
    const radii = [3.6, 5, 4.4, 1.6];
    const rings = [0, 0.35, 0.75, 1].map((f, i) => on(PZ(trunkTop + f * t.h * 0.65), ellUV(x, y, radii[i], radii[i], 10)));
    for (let i = 0; i < 3; i++) s += loft(rings[i], rings[i + 1], n => tone(n, leaf));
    s += fill(pd(rings[3]), leaf.l) + hullInk(rings.flat(), 1.4);
  }
  return { at: [x, y, z0 + t.h / 2], box: [[x - 5, y - 5, z0], [x + 5, y + 5, z0 + t.h]], svg: s };
}

/* ---------- the plant: dam, lake, foam, powerhouse, penstock, tailrace, transformer, pole ---------- */
const D = GM.dam;
const PLANT_FOCUS = W3(D.col + 0.8, D.row - 1.8, GROUND);

function gmWaterDetails() {
  let s = '';
  for (let c = D.col - 4; c < D.col; c++) for (let r = D.row - 1; r <= D.row; r++) {
    if (!isWater(c, r)) continue;
    s += face(pd([W3(c, r, GROUND - 0.9), W3(c + 1, r, GROUND - 0.9), W3(c + 1, r + 1, GROUND - 0.9), W3(c, r + 1, GROUND - 0.9)]), GM_WATER.m);
  }
  const [ax, ay] = W3(D.col + 1.4, D.row - 1.6), [bx, by] = W3(D.col + 2.0, D.row - 1);
  s += face(pd([[ax, ay, GROUND - 1.5], [bx, ay, GROUND - 1.5], [bx, by, GROUND - 1.5], [ax, by, GROUND - 1.5]]), GM_WATER.l);
  s += ink(pd([[ax, ay, GROUND], [bx, ay, GROUND], [bx, by, GROUND], [ax, by, GROUND]]), .8);
  for (let i = 0; i < 7; i++) {
    const [fx, fy] = W3(D.col + 0.5 + (i % 3) * 0.25, D.row - 0.8 + i * 0.25);
    s += `<path d="${pd(on(PZ(GROUND - 1.8), ellUV(fx, fy, 1.4, 0.9, 10)))}" fill="#ffffff" stroke="${INK}" stroke-width=".5"/>`;
  }
  return s;
}

function gmPlant() {
  const parts = [];
  const corners = (a, b) => { const p = W3(...a), q = W3(...b); return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])]; };
  const [X0, Y0, X1, Y1] = corners([D.col + 0.3, D.row - 1.4], [D.col - 0.3, D.row + 1.4]);
  parts.push({ box: [[X0, Y0, GROUND - 2], [X1, Y1, GROUND + 4]], svg: box(X0, Y0, GROUND - 2, X1, Y1, GROUND + 4, GM_CONCRETE, tone, 1.4) });

  const [PX0, PY0, PX1, PY1] = corners([D.col + 0.6, D.row - 3.4], [D.col + 2.6, D.row - 1.6]), PH = GROUND + 11;
  let h = castShadow([[PX0, PY0, GROUND], [PX1, PY0, GROUND], [PX1, PY1, GROUND], [PX0, PY1, GROUND], [PX0, PY0, PH + 6], [PX1, PY1, PH + 6]], GROUND);
  h += box(PX0, PY0, GROUND, PX1, PY1, PH, GM_WALLS, tone, 1.6);
  const RX = (PX0 + PX1) / 2, ov = 1.2;
  const roofA = [[PX0 - ov, PY0 - ov, PH], [PX0 - ov, PY1 + ov, PH], [RX, PY1 + ov, PH + 6], [RX, PY0 - ov, PH + 6]];
  const roofB = [[RX, PY0 - ov, PH + 6], [RX, PY1 + ov, PH + 6], [PX1 + ov, PY1 + ov, PH], [PX1 + ov, PY0 - ov, PH]];
  const up = n => (n[2] < 0 ? n.map(v => -v) : n);
  const nA = up(norm(cross(sub(roofA[1], roofA[0]), sub(roofA[3], roofA[0])))), nB = up(norm(cross(sub(roofB[1], roofB[0]), sub(roofB[3], roofB[0]))));
  for (const [y, n] of [[PY0, [0, -1, 0]], [PY1, [0, 1, 0]]]) if (vis(n)) h += shape([[PX0, y, PH], [PX1, y, PH], [RX, y, PH + 6]], tone(n, GM_WALLS), 1.2);
  // the far roof plane first, then the near one
  const roofs = [[roofA, nA], [roofB, nB]].sort((a, b) => depthOf(avg(a[0])) - depthOf(avg(b[0])));
  for (const [q, n] of roofs) if (vis(n)) h += shape(q, tone(n, GM_ROOF), 1.3);
  if (vis([1, 0, 0])) {
    h += shape([[PX1, PY0 + 4, GROUND], [PX1, PY0 + 9, GROUND], [PX1, PY0 + 9, GROUND + 7], [PX1, PY0 + 4, GROUND + 7]], DARK.m, 1);
    for (const y of [PY0 + 12, PY1 - 4]) h += shape([[PX1, y - 2.2, GROUND + 4], [PX1, y + 2.2, GROUND + 4], [PX1, y + 2.2, GROUND + 8], [PX1, y - 2.2, GROUND + 8]], '#cfe9f0', .9);
  }
  parts.push({ box: [[PX0, PY0, GROUND], [PX1, PY1, PH + 6]], svg: h });

  const PIPE_Z = GROUND + 2.4, PIPE_R = 1.6, PIPE_X = X0 - 3;
  const pA = [PIPE_X, Y1 + 4, PIPE_Z], pB = [PIPE_X, (PY0 + PY1) / 2, PIPE_Z], pC = [PX1, (PY0 + PY1) / 2, PIPE_Z];
  parts.push({ box: [[PIPE_X - 2.4, pB[1], GROUND], [PIPE_X + 2.4, pA[1] + 2.4, PIPE_Z + 3]], svg: rod(pA, pB, PIPE_R, METAL, tone, 1.2) + cyl(pA[0], pA[1], GROUND, PIPE_Z + 3, 2.4, GM_CONCRETE, tone, 1.2, 16) });
  parts.push({ box: [[PX1, pC[1] - 2, GROUND], [PIPE_X, pC[1] + 2, PIPE_Z + 2]], svg: rod(pB, pC, PIPE_R, METAL, tone, 1.2) });
  for (const y of [pA[1] - 6, pB[1] + 4]) parts.push({ box: [[PIPE_X - 1.4, y - 0.8, GROUND], [PIPE_X + 1.4, y + 0.8, PIPE_Z - PIPE_R]], svg: box(PIPE_X - 1.4, y - 0.8, GROUND, PIPE_X + 1.4, y + 0.8, PIPE_Z - PIPE_R, GM_CONCRETE, tone, .9) });

  // the whole plant is one clickable target
  return parts.map(p => ({ ...p, svg: act('plant', p.svg) }));
}

/* ---------- camera zoom on the plant, kept centred while the map turns ---------- */
let gmBase = null;      // the viewBox that frames the whole map, centred in the window
let gmZoom = 0;         // 0 = whole map, 1 = on the plant
let gmPanelPx = 0;      // screen width taken by the panel on the right, so the plant centres in what is left
let gmZoomRun = 0;      // the latest zoom animation; an older one stops when a new one starts
function gmFrame(svg) {
  // the map block at the default view, centred, at the window's own aspect ratio
  const rect = svg.getBoundingClientRect(), aspect = rect.width && rect.height ? rect.height / rect.width : 0.6;
  const pts = [];
  for (const c of [0, GM.cols]) for (const r of [0, GM.rows]) for (const z of [0, GROUND]) pts.push(P0(...W3(c, r, z)));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
  const w = Math.max(bw / 0.9, bh / 0.86 / aspect), h = w * aspect;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
function gmApplyView() {
  const svg = document.getElementById('fig');
  if (!gmBase) gmBase = gmFrame(svg);
  const z = GM.zoom2d, zoomW = Math.min(gmBase.w, ((z.cols + z.rows) * T * C) / z.factor / z.fit);
  const k = gmZoom, w = gmBase.w + (zoomW - gmBase.w) * k, hgt = w * gmBase.h / gmBase.w;
  const box = svg.getBoundingClientRect(), shift = box.width ? (gmPanelPx / box.width) * w / 2 : 0;
  const [fx, fy] = P(...PLANT_FOCUS);
  const cx0 = gmBase.x + gmBase.w / 2, cy0 = gmBase.y + gmBase.h / 2;
  const cx = cx0 + (fx + shift - cx0) * k, cy = cy0 + (fy - cy0) * k;
  svg.setAttribute('viewBox', `${(cx - w / 2).toFixed(1)} ${(cy - hgt / 2).toFixed(1)} ${w.toFixed(1)} ${hgt.toFixed(1)}`);
  // Lines are drawn with vector-effect: non-scaling-stroke (map/style.css), so a stroke width is in screen pixels and
  // stays the same at every zoom; INK_K sets that width from the window size, never from the zoom.
  INK_K = GM.inkThin * (box.width || 1200) / INK_REF_VB;
}

function gmScene() {
  const parts = [...GM_TREES.map(gmTree), ...gmPlant()];
  return gmGround() + gmWaterDetails() + byDepth(parts);
}

window.GridMap = {
  /** hooks: { onPlant(), onMap() } — a press on the plant, and a click on the map away from it. */
  mount(hooks) {
    const ui = mountFigure({
      fig: '01', turn: 'full', title: 'GridSim', hint: '',
      size: [GM.rows * T, GM.cols * T, 30], palette: 'mint',
      state: {},
      scene: () => { gmApplyView(); return gmScene(); },
      buttons: [], credit: false,
      acts: { plant: () => hooks.onPlant() },
    });
    // No hand-drawn filter at all: no wobble, and no paper grain recomputed on every frame while the map turns.
    document.getElementById('art').removeAttribute('filter');
    ui.render();
    // a click on the map away from the plant (a press and release without dragging)
    const svg = document.getElementById('fig');
    let down = null;
    svg.addEventListener('pointerdown', e => { down = e.target.closest('[data-act]') ? null : [e.clientX, e.clientY]; });
    svg.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 4) hooks.onMap(); down = null; });
    addEventListener('resize', () => { gmBase = null; ui.render(); });
    this.ui = ui;
    return ui;
  },
  /** Ease the camera to the plant (true) or back to the whole map (false), like the 2D game. */
  focus(on, panelPx) {
    gmPanelPx = panelPx;
    // Zooming only moves the camera's frame (the viewBox): nothing is redrawn, so it stays smooth.
    const from = gmZoom, to = on ? 1 : 0, ms = GM.zoomMs, start = performance.now(), id = ++gmZoomRun;
    const step = now => {
      if (id !== gmZoomRun) return;
      const p = Math.min(1, (now - start) / ms);
      gmZoom = from + (to - from) * (1 - (1 - p) ** 3);
      gmApplyView();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },
};
