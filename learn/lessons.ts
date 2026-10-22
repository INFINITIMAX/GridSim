// Lesson data for Hydro · Pelton, lessons 1-3. Every text that states something carries the claim IDs
// from docs/learn/pelton/lectia-0N.md. Rows marked "to find" there (A11, A12, B5 as a claim, C8) are not used.

export interface Fact {
  /** Part id in the 3D scene (callouts, parts, steps). */
  part?: string;
  /** Phosphor icon name, resolved in ui.ts. */
  icon: string;
  label?: string;
  text: string;
  claims: string[];
}

export type SceneId = "plant" | "intake";
export type SimId = "order" | "power" | "settling";

export interface Lesson {
  n: number;
  title: string;
  scene: SceneId;
  sim: SimId;
  intro: { text: string; claims: string[] };
  rows: Fact[];
  parts: Fact[];
  how: Fact[];
  specs: Fact[];
  callouts: Fact[];
}

export const LESSON_TITLES: readonly string[] = [
  "Meet the plant",
  "Head and flow",
  "Weir & intake",
  "Penstock",
  "Valve & water hammer",
  "Nozzle & spear",
  "Pelton runner",
  "Efficiency",
  "Speed, size, choice",
  "Generator",
  "Load controller",
  "The whole chain",
];

export const UNLOCKED = 3;

const L1_PARTS: Fact[] = [
  { part: "weir", icon: "waves", label: "Weir & intake", text: "A low wall lifts the water level so part of the stream can enter the intake. The rest flows over.", claims: ["A2", "A3"] },
  { part: "canal", icon: "arrow-line-right", label: "Canal", text: "Carries the water gently along the hillside to the forebay.", claims: ["A4"] },
  { part: "forebay", icon: "grid-four", label: "Forebay & trash rack", text: "A small tank at the top of the pipe. The rack stops leaves and debris.", claims: ["A5"] },
  { part: "penstock", icon: "pipe", label: "Penstock", text: "The pressure pipe down to the powerhouse.", claims: ["A4", "A6"] },
  { part: "powerhouse", icon: "gear-six", label: "Powerhouse", text: "The turbine turns the water's energy into rotation; the generator makes electricity.", claims: ["A7"] },
  { part: "tailrace", icon: "drop", label: "Tailrace", text: "Returns the water to the stream.", claims: ["A8"] },
  { part: "powerline", icon: "lightning", label: "Power line", text: "Takes the electricity to where it is used.", claims: ["A9"] },
];

const L1: Lesson = {
  n: 1,
  title: LESSON_TITLES[0] ?? "",
  scene: "plant",
  sim: "order",
  intro: {
    text: "A micro-hydro plant borrows water from a stream, lets it fall through a pipe and gives it back further down. Nothing is burned and most of the stream keeps flowing.",
    claims: ["A6", "A8", "A10"],
  },
  rows: [
    { icon: "gauge", text: "Under 100 kW", claims: ["A1"] },
    { icon: "waves", text: "Run-of-river: no big reservoir", claims: ["A2"] },
    { icon: "drop-half", text: "Only part of the stream is used", claims: ["A10"] },
  ],
  parts: L1_PARTS,
  how: L1_PARTS,
  specs: [{ icon: "gauge", label: "Micro-hydro", text: "Under 100 kW", claims: ["A1"] }],
  callouts: L1_PARTS,
};

const L2_CALLOUTS: Fact[] = [
  { part: "head", icon: "arrows-vertical", label: "Head (H)", text: "How far the water falls, in metres. Measured vertically, not along the pipe.", claims: ["B2"] },
  { part: "flow", icon: "drop", label: "Flow (Q)", text: "How much water passes each second, in cubic metres or litres per second.", claims: ["B1"] },
  { part: "losses", icon: "warning", label: "Losses", text: "Friction in the pipe, the rack and the valves eat part of the head.", claims: ["B4"] },
  { part: "eff", icon: "percent", label: "Efficiency (e)", text: "Turbine, generator and pipe all lose a bit. NRCan uses e = 0.5–0.7.", claims: ["B3"] },
];

const L2: Lesson = {
  n: 2,
  title: LESSON_TITLES[1] ?? "",
  scene: "plant",
  sim: "power",
  intro: {
    text: "Two things decide how much power a stream can give: how far the water falls (head) and how much of it falls each second (flow). Double either one and the power doubles.",
    claims: ["B1", "B3"],
  },
  rows: [
    { icon: "calculator", text: "P = Q · H · g · e", claims: ["B3"] },
    { icon: "mountains", text: "Head is almost constant, flow varies over the year", claims: ["B6"] },
    { icon: "percent", text: "NRCan uses e = 0.5–0.7", claims: ["B3"] },
  ],
  parts: [
    { part: "head", icon: "arrows-vertical", label: "Head (H) · m", text: "How far the water falls, in metres. Measured vertically, not along the pipe.", claims: ["B2"] },
    { part: "flow", icon: "drop", label: "Flow (Q) · L/s or m³/s", text: "How much water passes each second, in cubic metres or litres per second.", claims: ["B1"] },
    { part: "g", icon: "stack", label: "Gravity (g) · m/s²", text: "In the formula g = 9.81.", claims: ["B1", "B3"] },
    { part: "eff", icon: "percent", label: "Efficiency (e) · 0–1", text: "Turbine, generator and pipe all lose a bit. NRCan uses e = 0.5–0.7.", claims: ["B3"] },
  ],
  how: [
    { icon: "drop", label: "Energy to power", text: "Falling water carries energy. The power depends on the flow, the fall and gravity.", claims: ["B1", "B3"] },
    { part: "losses", icon: "warning", label: "Gross to net head", text: "Gross head minus losses is the net head the turbine actually gets.", claims: ["B4"] },
    { icon: "mountains", label: "One flow reading", text: "Head stays almost constant, flow changes through the year, so one flow measurement tells little.", claims: ["B6"] },
  ],
  specs: [
    { icon: "calculator", label: "Formula", text: "P [kW] = Q [m³/s] · H [m] · 9.81 · e", claims: ["B3"] },
    { icon: "ruler", label: "NRCan example", text: "10 m, 0.3 m³/s, e = 0.5 → 14.7 kW", claims: ["B7"] },
  ],
  callouts: L2_CALLOUTS,
};

const L3_PARTS: Fact[] = [
  { part: "weir", icon: "waves", label: "Weir", text: "Not a dam: it only raises the water so part of it can enter. The rest flows on.", claims: ["C1"] },
  { part: "rack", icon: "grid-four", label: "Trash rack", text: "Bars that stop leaves, branches and stones.", claims: ["C3"] },
  { part: "basin", icon: "funnel", label: "Settling basin", text: "The water slows down here, so sand has time to sink.", claims: ["C4", "C5"] },
  { part: "gate", icon: "door", label: "Flushing gate", text: "Opens to wash the collected sand back to the stream.", claims: ["C4"] },
];

const L3: Lesson = {
  n: 3,
  title: LESSON_TITLES[2] ?? "",
  scene: "intake",
  sim: "settling",
  intro: {
    text: "The intake takes a calm, clean share of the stream. Its two jobs: let the right amount of water in, and keep stones, leaves and sand out.",
    claims: ["C1", "C3", "C4"],
  },
  rows: [
    { icon: "waves", text: "A weir raises, it does not store", claims: ["C1"] },
    { icon: "fish", text: "Some water must stay in the river", claims: ["C2"] },
    { icon: "warning", text: "Sand that gets through wears the equipment", claims: ["C6"] },
  ],
  parts: L3_PARTS,
  how: [
    { part: "basin", icon: "funnel", label: "Slower water", text: "The water slows down here, so sand has time to sink.", claims: ["C4", "C5"] },
    { part: "basin", icon: "ruler", label: "Basin length", text: "The basin must be long enough for a grain to reach the floor before the water leaves.", claims: ["C5"] },
  ],
  specs: [
    { icon: "funnel", label: "Usual target", text: "Keep particles larger than 0.2 mm", claims: ["C4"] },
    { icon: "calculator", label: "Settling speed", text: "Zanke formula, ESHA eq. 5.8", claims: ["C9"] },
    { icon: "ruler", label: "Minimum length", text: "L = Q / (vD · B)", claims: ["C5"] },
  ],
  callouts: [
    { part: "weir", icon: "waves", label: "Weir", text: "Not a dam: it only raises the water so part of it can enter. The rest flows on.", claims: ["C1"] },
    { part: "residual", icon: "fish", label: "Residual flow", text: "A share of the stream must always stay in the river, for the fish.", claims: ["C2"] },
    { part: "rack", icon: "grid-four", label: "Trash rack", text: "Bars that stop leaves, branches and stones.", claims: ["C3"] },
    { part: "basin", icon: "funnel", label: "Settling basin", text: "The water slows down here, so sand has time to sink.", claims: ["C4", "C5"] },
    { part: "gate", icon: "door", label: "Flushing gate", text: "Opens to wash the collected sand back to the stream.", claims: ["C4"] },
  ],
};

export const LESSONS: readonly Lesson[] = [L1, L2, L3];
