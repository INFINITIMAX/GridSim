// Lesson data for Hydro · Pelton, lessons 1-6. Every text that states something carries the claim IDs
// from docs/learn/pelton/lectia-0N.md. Rows marked "to find" there (A11, A12, B5 as a claim, C8, F6) are not used.

export interface Fact {
  /** Part id in the 3D scene (callouts, parts, steps). */
  part?: string;
  /** Phosphor icon name, resolved in ui.ts. */
  icon: string;
  label?: string;
  text: string;
  claims: string[];
}

export type SceneId = "plant" | "intake" | "penstock" | "nozzle";
export type SimId = "order" | "power" | "settling" | "friction" | "hammer" | "jet";

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

export const UNLOCKED = 6;

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

const L4_CALLOUTS: Fact[] = [
  { part: "forebay", icon: "grid-four", label: "Forebay", text: "Where the pipe starts. Its water level is the top of the gross head.", claims: ["D1"] },
  { part: "penstock", icon: "pipe", label: "Penstock", text: "The pressure pipe. Water rubbing on its wall loses part of the head.", claims: ["D1", "D2"] },
  { part: "anchor", icon: "stack", label: "Anchor block", text: "Concrete blocks hold the pipe at every bend.", claims: ["D7"] },
  { part: "energy", icon: "waves", label: "Energy line", text: "Drops a little along the pipe: that drop is the friction loss.", claims: ["D2", "D3"] },
  { part: "net", icon: "arrows-vertical", label: "Net head", text: "What is left at the nozzle: gross head minus all losses.", claims: ["D1"] },
];

const L4: Lesson = {
  n: 4,
  title: LESSON_TITLES[3] ?? "",
  scene: "penstock",
  sim: "friction",
  intro: {
    text: "The penstock brings the water down under pressure. Water rubbing on the pipe wall loses some of its head on the way, so the turbine gets a little less than the full drop.",
    claims: ["D1", "D2"],
  },
  rows: [
    { icon: "arrows-vertical", text: "Net head = gross head − losses", claims: ["D1"] },
    { icon: "waves", text: "Friction is the main loss", claims: ["D2"] },
    { icon: "pipe", text: "A narrower pipe loses much more", claims: ["D4"] },
  ],
  parts: [
    { part: "forebay", icon: "grid-four", label: "Forebay", text: "Where the pipe starts. Its water level is the top of the gross head.", claims: ["D1"] },
    { part: "penstock", icon: "pipe", label: "Penstock", text: "The pressure pipe. Water rubbing on its wall loses part of the head.", claims: ["D1", "D2"] },
    { part: "anchor", icon: "stack", label: "Anchor blocks", text: "Concrete blocks hold the pipe at every bend.", claims: ["D7"] },
    { part: "valve", icon: "gear-six", label: "Valve", text: "Valves add small losses of their own. More in lesson 5.", claims: ["D1"] },
    { icon: "funnel", label: "Nozzle", text: "Where the net head ends: what is left after all the losses. More in lesson 6.", claims: ["D1"] },
  ],
  how: [
    { part: "penstock", icon: "calculator", label: "Darcy–Weisbach", text: "hf = f · (L / D) · V² / 2g", claims: ["D3"] },
    { part: "penstock", icon: "ruler", label: "The friction factor f", text: "f depends on how rough the pipe wall is and on the Reynolds number.", claims: ["D3", "D5"] },
    { part: "penstock", icon: "pipe", label: "Why diameter matters", text: "Doubling the diameter cuts the loss by tens of times. ESHA: halving it multiplies the loss by about 40.", claims: ["D4"] },
  ],
  specs: [
    { icon: "ruler", label: "Roughness", text: "Polyethylene 0.003 mm · welded steel 0.6 mm (ESHA table 2.1)", claims: ["D5"] },
    { icon: "percent", label: "Usual target", text: "Keep the loss to a few percent of the head", claims: ["D6"] },
  ],
  callouts: L4_CALLOUTS,
};

const L5_CALLOUTS: Fact[] = [
  { part: "valve", icon: "gear-six", label: "Inlet valve", text: "Shuts the water off before the turbine. It must always close slowly.", claims: ["E1", "E6"] },
  { part: "wave", icon: "waves", label: "Pressure wave", text: "Stopping the water too fast sends a pressure wave up the pipe and back.", claims: ["E2", "E3"] },
  { part: "forebay", icon: "grid-four", label: "Forebay", text: "The free water surface where the wave turns back.", claims: ["E3"] },
  { part: "wall", icon: "pipe", label: "Penstock wall", text: "A stiff steel pipe gets a higher surge than a plastic one.", claims: ["E7"] },
  { part: "gauge", icon: "gauge", label: "Pressure gauge", text: "The surge adds to the static pressure. The pipe must hold both.", claims: ["E2", "E8"] },
];

const L5: Lesson = {
  n: 5,
  title: LESSON_TITLES[4] ?? "",
  scene: "penstock",
  sim: "hammer",
  intro: {
    text: "A long pipe holds tonnes of moving water. Stop it suddenly and its momentum turns into a pressure wave that can be several times the normal pressure. That is why valves close slowly.",
    claims: ["E1", "E2"],
  },
  rows: [
    { icon: "gauge", text: "Surge can be several times the static pressure", claims: ["E2"] },
    { icon: "waves", text: "Close slower than the wave's round trip", claims: ["E4"] },
    { icon: "pipe", text: "Plastic pipes surge less than steel", claims: ["E7"] },
  ],
  parts: [
    { part: "valve", icon: "gear-six", label: "Inlet valve", text: "Shuts the water off before the turbine. It must always close slowly.", claims: ["E1", "E6"] },
    { part: "wave", icon: "waves", label: "Pressure wave", text: "Stopping the water too fast sends a pressure wave up the pipe and back.", claims: ["E2", "E3"] },
    { part: "forebay", icon: "grid-four", label: "Forebay", text: "The free water surface where the wave turns back.", claims: ["E3"] },
    { part: "wall", icon: "pipe", label: "Penstock wall", text: "A stiff steel pipe gets a higher surge than a plastic one.", claims: ["E7"] },
    { part: "gauge", icon: "gauge", label: "Pressure gauge", text: "The surge adds to the static pressure. The pipe must hold both.", claims: ["E2", "E8"] },
  ],
  how: [
    { part: "wave", icon: "waves", label: "The wave's trip", text: "The wave climbs to the free surface, bounces back to the valve and repeats, a little weaker each time.", claims: ["E3"] },
    { part: "wall", icon: "pipe", label: "Wave speed", text: "The speed c depends on the water and on how elastic the pipe is: much lower in plastic than in steel.", claims: ["E7"] },
    { part: "wave", icon: "ruler", label: "Critical time", text: "Tc = 2L / c, the wave's round trip. Close slower than that and the surge drops.", claims: ["E4"] },
    { part: "valve", icon: "calculator", label: "Sudden closing", text: "ΔH = c · ΔV / g (Joukowsky).", claims: ["E5"] },
    { part: "valve", icon: "calculator", label: "Slow closing", text: "The Allievi formula gives a smaller surge.", claims: ["E5"] },
  ],
  specs: [
    { icon: "waves", label: "Wave speed", text: "c ≈ 1420 m/s in free water, less in a pipe", claims: ["E7"] },
    { icon: "percent", label: "Normal Pelton shutdown", text: "Surge up to ~25 % of the gross head", claims: ["E8"] },
    { icon: "gauge", label: "Pipe margin", text: "Choose the pipe for ~30 % above the static pressure", claims: ["E8"] },
  ],
  callouts: L5_CALLOUTS,
};

const L6_CALLOUTS: Fact[] = [
  { part: "nozzle", icon: "funnel", label: "Nozzle", text: "Turns the water's pressure into a fast jet.", claims: ["F1"] },
  { part: "spear", icon: "arrow-line-right", label: "Spear", text: "Slides inside the nozzle to make the jet thinner or thicker. That is how the flow is set.", claims: ["F3"] },
  { part: "jet", icon: "drop", label: "Jet", text: "Its speed depends only on the head, not on how open the spear is.", claims: ["F2"] },
  { part: "deflector", icon: "arrow-counter-clockwise", label: "Deflector", text: "Swings into the jet and turns it away from the buckets in an instant.", claims: ["F4"] },
  { part: "runner", icon: "gear-six", label: "Runner", text: "Takes the jet's energy (lesson 7).", claims: ["F1"] },
];

const L6: Lesson = {
  n: 6,
  title: LESSON_TITLES[5] ?? "",
  scene: "nozzle",
  sim: "jet",
  intro: {
    text: "At the bottom of the pipe all the head becomes speed. The nozzle shapes the water into one fast jet, the spear sets how much water flows, and the deflector can push the jet away from the runner in an instant.",
    claims: ["F1", "F3", "F4"],
  },
  rows: [
    { icon: "calculator", text: "v = Cv · √(2gH)", claims: ["F2"] },
    { icon: "arrow-line-right", text: "The spear sets the flow", claims: ["F3"] },
    { icon: "arrow-counter-clockwise", text: "The deflector stops power, not water", claims: ["F4", "F5"] },
  ],
  parts: L6_CALLOUTS,
  how: [
    { part: "nozzle", icon: "funnel", label: "Pressure becomes speed", text: "All the head turns into speed before the jet hits the buckets.", claims: ["F1"] },
    { part: "spear", icon: "arrow-line-right", label: "Speed and the spear", text: "The jet's speed does not depend on how open the spear is. The spear only changes how much water passes.", claims: ["F2", "F3"] },
    { part: "deflector", icon: "arrow-counter-clockwise", label: "Deflector and spear", text: "The deflector turns the jet away at once, then the spear closes slowly. That avoids the water hammer of lesson 5.", claims: ["F4", "F5"] },
  ],
  specs: [
    { icon: "percent", label: "Velocity coefficient", text: "Cv ≈ 0.98–0.99", claims: ["F2"] },
    { icon: "gauge", label: "Jet speed at 60 m", text: "v = 33.6 m/s", claims: ["F2"] },
  ],
  callouts: L6_CALLOUTS,
};

export const LESSONS: readonly Lesson[] = [L1, L2, L3, L4, L5, L6];
