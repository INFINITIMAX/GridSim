// Lesson data for Hydro · Pelton, lessons 1-9. Every text that states something carries the claim IDs
// from docs/learn/pelton/lectia-0N.md. Rows marked "to find" there (A11, A12, B5 as a claim, C8, F6, G9, I7, and
// the 1.8-1.9 runaway figure of G8) are not used.

export interface Fact {
  /** Part id in the 3D scene (callouts, parts, steps). */
  part?: string;
  /** Phosphor icon name, resolved in ui.ts. */
  icon: string;
  label?: string;
  text: string;
  claims: string[];
}

export type SceneId = "plant" | "intake" | "penstock" | "nozzle" | "runner" | "chart";
export type SimId = "order" | "power" | "settling" | "friction" | "hammer" | "jet" | "bucket" | "efficiency" | "specific";

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

export const UNLOCKED = 9;

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

const L7_CALLOUTS: Fact[] = [
  { part: "bucket", icon: "gear-six", label: "Bucket", text: "A double cup. Its middle ridge splits the jet in two.", claims: ["G1"] },
  { part: "splitter", icon: "funnel", label: "Splitter", text: "Each half of the jet is turned almost all the way back.", claims: ["G1", "G2"] },
  { part: "jet", icon: "drop", label: "Jet", text: "Pushes the bucket. The faster the bucket runs away from it, the weaker the push.", claims: ["G3"] },
  { part: "exit", icon: "arrow-line-right", label: "Exit water", text: "What the water keeps of its speed is lost. At half the jet speed, it simply falls away.", claims: ["G6"] },
  { part: "runner", icon: "arrow-counter-clockwise", label: "Runner", text: "Best when the buckets move at half the jet speed.", claims: ["G4"] },
];

const L7: Lesson = {
  n: 7,
  title: LESSON_TITLES[6] ?? "",
  scene: "runner",
  sim: "bucket",
  intro: {
    text: "The jet from lesson 6 hits a ring of double cups. Each cup splits the jet and throws the water back the way it came. The push is strongest when the cup stands still, but then it does no work; when the cup runs as fast as the jet there is no push at all. The best is in the middle: half the jet speed.",
    claims: ["G1", "G2", "G3", "G4", "G8"],
  },
  rows: [
    { icon: "arrow-counter-clockwise", text: "Split and turned back", claims: ["G1", "G2"] },
    { icon: "gauge", text: "Best at half the jet speed", claims: ["G4"] },
    { icon: "drop-half", text: "Leftover speed is lost", claims: ["G6"] },
  ],
  parts: L7_CALLOUTS,
  how: [
    { part: "jet", icon: "arrow-line-right", label: "Force from the jet", text: "The push on the bucket depends on how fast the jet catches up with it: v₁ − u.", claims: ["G3"] },
    { part: "runner", icon: "calculator", label: "Power is force times speed", text: "Power = force × u, so it has a peak in the middle, at u = v₁/2.", claims: ["G3", "G4"] },
    { part: "splitter", icon: "arrow-counter-clockwise", label: "Turned back almost 180°", text: "A jet turned back by almost 180° (in practice about 165°) gives an ideal bucket a maximum hydraulic efficiency of (1 + cos 15°)/2 ≈ 98 %.", claims: ["G2", "G5"] },
    { part: "runner", icon: "warning", label: "As fast as the jet", text: "If the runner reaches the speed of the jet, the power drops to zero.", claims: ["G8"] },
  ],
  specs: [
    { icon: "ruler", label: "Deflection angle", text: "165°", claims: ["G2"] },
    { icon: "percent", label: "Design speed ratio", text: "u / √(2gH) = 0.43–0.48", claims: ["G7"] },
    { icon: "gauge", label: "Best hydraulic efficiency, ideal bucket", text: "98.3 %", claims: ["G5"] },
  ],
  callouts: L7_CALLOUTS,
};

const L8_CALLOUTS: Fact[] = [
  { part: "runner", icon: "gear-six", label: "Runner", text: "Turns most of the jet's power into shaft power, but never all of it.", claims: ["H3"] },
  { part: "nozzles", icon: "funnel", label: "Nozzles", text: "One to six jets. With more jets the turbine keeps a good efficiency at lower flows.", claims: ["H4"] },
  { part: "jet", icon: "drop", label: "Jet", text: "Thinner jet, less water. The efficiency barely drops until the flow gets small.", claims: ["H5"] },
  { part: "curve", icon: "percent", label: "Curve", text: "Efficiency changes with the flow. One number is not enough.", claims: ["H1"] },
];

const L8: Lesson = {
  n: 8,
  title: LESSON_TITLES[7] ?? "",
  scene: "runner",
  sim: "efficiency",
  intro: {
    text: "A turbine never turns all of the water's power into shaft power. How much it keeps is its efficiency, and that changes with the flow. A Pelton keeps a high efficiency over a wide range: from full flow down to about a third with one jet, and even lower with several jets.",
    claims: ["H1", "H3", "H4", "H5"],
  },
  rows: [
    { icon: "percent", text: "Efficiency depends on flow", claims: ["H1"] },
    { icon: "gauge", text: "Best Pelton: about 0.89–0.90", claims: ["H3"] },
    { icon: "drop", text: "Flat down to a third of the flow", claims: ["H4", "H5"] },
  ],
  parts: L8_CALLOUTS,
  how: [
    { part: "curve", icon: "percent", label: "Efficiency", text: "The efficiency of a turbine is its shaft power divided by the hydraulic power, and it depends on the flow.", claims: ["H1"] },
    { part: "curve", icon: "calculator", label: "The Pelton curve", text: "In the RETScreen model the curve peaks at about 2/3 of the design flow, then falls slowly toward full flow and fast toward small flows.", claims: ["H2", "H7"] },
    { part: "jet", icon: "drop", label: "Flat down to 60 %", text: "From full flow down to about 60 %, the efficiency changes by only 2–3 %.", claims: ["H5"] },
    { part: "nozzles", icon: "funnel", label: "More jets", text: "More jets keep the efficiency high at low flows. A turbine with several jets can close some of them.", claims: ["H4", "H6"] },
  ],
  specs: [
    { icon: "gauge", label: "Best efficiency", text: "0.89 with one jet, 0.90 with more", claims: ["H3"] },
    { icon: "percent", label: "Good range", text: "30–100 % of the flow with one jet, 10–100 % with more", claims: ["H4"] },
  ],
  callouts: L8_CALLOUTS,
};

const L9_CALLOUTS: Fact[] = [
  { part: "map", icon: "grid-four", label: "Map", text: "One number, the specific speed, sums up head, flow and speed. It tells which runner shape fits.", claims: ["I1"] },
  { part: "pelton", icon: "drop", label: "Pelton band", text: "High heads, small flows. More jets widen the band.", claims: ["I2", "I3", "I4"] },
  { part: "francis", icon: "waves", label: "Francis band", text: "Medium heads and flows.", claims: ["I2", "I4"] },
  { part: "kaplan", icon: "waves", label: "Kaplan band", text: "Low heads, big flows.", claims: ["I2", "I4"] },
  { part: "runner", icon: "gear-six", label: "Runner", text: "Its size follows from the head and the speed.", claims: ["I5"] },
  { part: "generator", icon: "lightning", label: "Generator", text: "Turns at a fixed standard speed. The turbine must match it, or a gearbox or belt is needed.", claims: ["I6"] },
];

const L9: Lesson = {
  n: 9,
  title: LESSON_TITLES[8] ?? "",
  scene: "chart",
  sim: "specific",
  intro: {
    text: "Head, flow and the speed of the generator together decide the runner. Engineers squeeze them into one number, the specific speed: small for high heads and little water (Pelton), larger for medium heads (Francis), largest for low heads and lots of water (Kaplan).",
    claims: ["I1", "I2", "I4"],
  },
  rows: [
    { icon: "calculator", text: "nQE = n·√Q / (gH)^0.75", claims: ["I1"] },
    { icon: "grid-four", text: "Each turbine has its band", claims: ["I2", "I4"] },
    { icon: "plus", text: "More jets, faster runner", claims: ["I3"] },
  ],
  parts: L9_CALLOUTS,
  how: [
    { part: "map", icon: "calculator", label: "Specific speed", text: "nQE = n·√Q / (gH)^0.75, with n in rev/s. It packs head, flow and speed into one number that describes the runner shape.", claims: ["I1"] },
    { part: "map", icon: "grid-four", label: "Bands by type", text: "Each turbine type works in a band of specific speed and in a range of heads.", claims: ["I2", "I4"] },
    { part: "pelton", icon: "plus", label: "More jets", text: "With more jets the runner can be smaller and turn faster.", claims: ["I3"] },
    { part: "runner", icon: "ruler", label: "Pelton diameter", text: "D1 = 0.68·√H / n, with n in rev/s.", claims: ["I5"] },
    { part: "generator", icon: "gear-six", label: "Generator speed", text: "The generator turns at a standard speed: 3000, 1500, 1000, 750… rpm at 50 Hz. More in lesson 10.", claims: ["I6"] },
  ],
  specs: [
    { icon: "drop", label: "Pelton", text: "nQE 0.005–0.025 (×√j) · 50–1300 m", claims: ["I2", "I4"] },
    { icon: "waves", label: "Francis", text: "nQE 0.05–0.33 · 25–350 m", claims: ["I2", "I4"] },
    { icon: "waves", label: "Kaplan", text: "nQE 0.19–1.55 · 2–40 m", claims: ["I2", "I4"] },
  ],
  callouts: L9_CALLOUTS,
};

export const LESSONS: readonly Lesson[] = [L1, L2, L3, L4, L5, L6, L7, L8, L9];
