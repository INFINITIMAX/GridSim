// Parametrii rețelei, cu valorile implicite din docs/calcule.md.

export interface UflsStage {
  /** Treapta se declanșează când f <= hz. */
  hz: number;
  /** Fracția cumulată din sarcină deconectată după această treaptă. */
  cumulativeFraction: number;
}

export interface AfrrConfig {
  /** Câștig proporțional, ca fracție din sarcina totală per Hz (MW = kp · P_load · e). */
  kp: number;
  /** Câștig integral, ca fracție din sarcina totală per Hz și per secundă. */
  ki: number;
  /** Constanta de timp a anti-windup-ului prin back-calculation, în secunde. */
  trackingTimeS: number;
}

export interface GridConfig {
  f0: number;
  dt: number;
  loadDampingPerHz: number;
  fcrDeadbandHz: number;
  fcrFullDeviationHz: number;
  fcrFullTimeS: number;
  ufls: readonly UflsStage[];
  genTripLowHz: number;
  genTripHighHz: number;
  afrr: AfrrConfig;
  /** Randament implicit pentru baterii când UnitInit nu îl dă. */
  batteryDefaultEta: number;
}

export const DEFAULT_CONFIG: GridConfig = {
  // SO GL: frecvența nominală (calcule.md, tabelul 1)
  f0: 50,
  // Pas fix de 50 ms (spec.md)
  dt: 0.05,
  // 1 %/Hz, varianta conservatoare din [I] (calcule.md, secțiunea 2)
  loadDampingPerHz: 0.01,
  // SO GL, Anexa V: insensibilitate + bandă moartă 10 mHz
  fcrDeadbandHz: 0.01,
  // SO GL, Anexa V: activare completă la ±200 mHz
  fcrFullDeviationHz: 0.2,
  // SO GL, Anexa V și art. 154(7): 30 s, 50% la 15 s
  fcrFullTimeS: 30,
  // NC ER, Anexă: 6 trepte, 49,0 Hz / 5% până la 48,0 Hz / 45% (calcule.md, secțiunea 1)
  ufls: [
    { hz: 49.0, cumulativeFraction: 0.05 },
    { hz: 48.8, cumulativeFraction: 0.13 },
    { hz: 48.6, cumulativeFraction: 0.21 },
    { hz: 48.4, cumulativeFraction: 0.29 },
    { hz: 48.2, cumulativeFraction: 0.37 },
    { hz: 48.0, cumulativeFraction: 0.45 },
  ],
  // RfG, art. 13, Tabelul 2: în afara 47,5–51,5 Hz generatoarele pot ieși din rețea
  genTripLowHz: 47.5,
  genTripHighHz: 51.5,
  // Calibrare aFRR (T4, calcule.md): incident de 3 000 MW la P_load = 150 000 MW, FCR 15 000 MW/Hz,
  // D·P = 1 500 MW/Hz. Cât timp abaterea e peste banda moartă FCR (10 mHz), rigiditatea totală e
  // (15 000 + 1 500 + kp·P) MW/Hz, iar integratorul o reduce cu constanta de timp
  //   tau = (16 500 + kp·P) / (ki·P) = 18 000 / 150 = 120 s   (kp = 0,01; ki = 0,001).
  // Abaterea ajunge la 10 mHz (deci 50,00 ± 0,01 Hz) după ~ln(17,5)·tau = ~340 s, adică ~6 min,
  // sub cei 15 min din SO GL, cu marjă pentru limitele de viteză ale unităților. Gains relative la
  // sarcină, ca să dea același răspuns la orice mărime de rețea. Nu e rulat; de verificat prin T4.
  afrr: { kp: 0.01, ki: 0.001, trackingTimeS: 30 },
  // Presupunere de joc (randament de ordinul 95% pe sens).
  batteryDefaultEta: 0.95,
};

/**
 * Preset pentru nivelul de insulă (sistem sincron mic). SO GL, Anexa V, coloana GB:
 * activare completă FCR în 10 s, la ±500 mHz (calcule.md, secțiunea 2, "Parametri pentru o rețea mică").
 * Restul parametrilor rămân cei impliciți.
 */
export const ISLAND_CONFIG: GridConfig = {
  ...DEFAULT_CONFIG,
  fcrFullTimeS: 10,
  fcrFullDeviationHz: 0.5,
};
