// Catalogul de unități și de consumatori. Valorile vin din docs/calcule.md, tabelul 2 (secțiunea 2).
// Fiecare `source` e un URL care apare literal în docs/calcule.md, secțiunea 4 (gate G4).
// Literele [A]..[I] din comentarii sunt cele din docs/calcule.md.

export type SourceKind =
  | "nuclear"
  | "coal"
  | "ccgt"
  | "ocgt"
  | "hydro"
  | "solar"
  | "wind"
  | "battery";

export interface SourceSpec {
  kind: SourceKind;
  label: string;
  /** Mașină sincronă (contribuie la S_sys și H_sys). Invertoarele sunt grid-following. */
  synchronous: boolean;
  /** Constanta de inerție, în secunde. */
  inertiaH: number;
  /** Viteza de variație, ca fracție din Pmax pe minut. */
  rampPerMin: number;
  /** Minimul tehnic, ca fracție din Pmax. */
  minLoad: number;
  /** Timp de pornire la cald, în minute. */
  startMinutes: number;
  /** CO2 pe ciclu de viață, g/kWh. `null` = nu emite în funcționare. */
  co2PerKWh: number | null;
  /** URL exact din docs/calcule.md. */
  source: string;
  /** URL-uri suplimentare din docs/calcule.md, pentru valori care nu vin din `source`. */
  sources?: readonly string[];
  /**
   * Timpul de activare completă a FCR pentru această unitate, în secunde.
   * Când lipsește, se folosește config.fcrFullTimeS.
   */
  fcrFullTimeS?: number;
  /** Text când valoarea e o presupunere de joc. */
  assumption?: string;
}

export const CATALOG: Record<SourceKind, SourceSpec> = {
  // H [A]; viteză, minim [D]; CO2 [F]
  nuclear: {
    kind: "nuclear",
    label: "Nuclear",
    synchronous: true,
    inertiaH: 4.2,
    rampPerMin: 0.05,
    minLoad: 0.5,
    startMinutes: 720,
    co2PerKWh: 12,
    source:
      "https://lpsc-indico.in2p3.fr/event/1357/contributions/750/attachments/646/847/9_LEMNA_Nuc_SCE.pdf",
    assumption:
      "Pornirea e 'ore' în sursă; 12 h e valoarea aleasă pentru joc (în nivel nu repornește).",
  },
  // H [A]; viteză, minim, pornire [C]; CO2 [F]
  coal: {
    kind: "coal",
    label: "Cărbune (huilă)",
    synchronous: true,
    inertiaH: 3.2,
    rampPerMin: 0.025,
    minLoad: 0.35,
    startMinutes: 165,
    co2PerKWh: 820,
    source:
      "https://www.agora-energiewende.org/fileadmin/Projekte/2017/Flexibility_in_thermal_plants/115_flexibility-report-WEB.pdf",
  },
  // H [A]; viteză, minim, pornire [C]; CO2 [F]
  ccgt: {
    kind: "ccgt",
    label: "Gaz, ciclu combinat",
    synchronous: true,
    inertiaH: 4.3,
    rampPerMin: 0.04,
    minLoad: 0.45,
    startMinutes: 75,
    co2PerKWh: 490,
    source:
      "https://www.agora-energiewende.org/fileadmin/Projekte/2017/Flexibility_in_thermal_plants/115_flexibility-report-WEB.pdf",
  },
  // H [B]; viteză, minim, pornire [C]; CO2 [F] (aproximare: aceeași clasă de combustibil)
  ocgt: {
    kind: "ocgt",
    label: "Gaz, turbină de vârf",
    synchronous: true,
    inertiaH: 5,
    rampPerMin: 0.1,
    minLoad: 0.45,
    startMinutes: 8,
    co2PerKWh: 490,
    source:
      "https://www.agora-energiewende.org/fileadmin/Projekte/2017/Flexibility_in_thermal_plants/115_flexibility-report-WEB.pdf",
    assumption: "CO2 aproximat cu cel al CCGT (aceeași clasă de combustibil).",
  },
  // H [B]; viteză [E]; CO2 [F]
  hydro: {
    kind: "hydro",
    label: "Hidro",
    synchronous: true,
    inertiaH: 3,
    rampPerMin: 0.3,
    minLoad: 0.2,
    startMinutes: 5,
    co2PerKWh: 24,
    source: "https://www.esig.energy/?p=5269",
    assumption:
      "Minimul tehnic de 20% și pornirea în 5 min ('minute' în sursă) sunt presupuneri de joc.",
  },
  // H [G]; viteză [H] (90% în 20 s = 2,7 Pmax/min); CO2 [F]
  solar: {
    kind: "solar",
    label: "Solar",
    synchronous: false,
    inertiaH: 0,
    rampPerMin: 2.7,
    minLoad: 0,
    startMinutes: 0,
    co2PerKWh: 48,
    source: "https://arxiv.org/pdf/2409.08084",
  },
  // H [G]; CO2 [F]
  wind: {
    kind: "wind",
    label: "Eolian",
    synchronous: false,
    inertiaH: 0,
    rampPerMin: 60,
    minLoad: 0,
    startMinutes: 0,
    co2PerKWh: 11,
    source: "https://www.nrel.gov/docs/fy20osti/73856.pdf",
    assumption:
      "Urmează vântul: nu are limită proprie de viteză în model (60 Pmax/min = 100% într-o secundă).",
  },
  // H [G]; viteză presupunere de joc; FFR (livrare completă în 1 s) [J]
  battery: {
    kind: "battery",
    label: "Baterie",
    synchronous: false,
    inertiaH: 0,
    rampPerMin: 60,
    minLoad: 0,
    startMinutes: 0,
    co2PerKWh: null,
    fcrFullTimeS: 1,
    source: "https://www.nrel.gov/docs/fy20osti/73856.pdf",
    sources: [
      "https://www.neso.energy/industry-information/balancing-services/frequency-response-services/dynamic-containment",
    ],
    assumption: "Răspuns de 100% într-o secundă (60 Pmax/min) e o presupunere de joc.",
  },
};

export type LoadKind = "homes" | "factory" | "datacenter" | "ev";

export interface LoadSpec {
  kind: LoadKind;
  label: string;
  /** Putere tipică, MW. */
  typicalMW: number;
  /** Toate valorile de aici sunt de joc, fără sursă primară. */
  assumption: string;
}

export const LOAD_CATALOG: Record<LoadKind, LoadSpec> = {
  homes: {
    kind: "homes",
    label: "Locuințe",
    typicalMW: 300,
    assumption: "Valoare de joc: un cartier mare.",
  },
  factory: {
    kind: "factory",
    label: "Fabrică",
    typicalMW: 40,
    assumption: "Valoare de joc.",
  },
  datacenter: {
    kind: "datacenter",
    label: "Centru de date",
    typicalMW: 100,
    assumption: "Valoare de joc.",
  },
  ev: {
    kind: "ev",
    label: "Stații de încărcare EV",
    typicalMW: 50,
    assumption: "Valoare de joc.",
  },
};
