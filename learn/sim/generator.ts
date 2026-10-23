// L10: speed and frequency of an AC generator. Pure TypeScript: no three, no DOM.
// Source: n = 120 f / p (docs/learn/pelton/lectia-10.md, claim J2; ESHA table 6.5).

/** Frequency in Hz of a generator with `poles` poles turning at `rpm`: f = p n / 120. */
export function frequencyHz(poles: number, rpm: number): number {
  return (poles * rpm) / 120;
}

/** Synchronous speed in rpm for `poles` poles at `hz`: n = 120 f / p. */
export function syncSpeedRpm(poles: number, hz: number): number {
  return (120 * hz) / poles;
}

/** Speed ratio (generator over turbine) that gives 50 Hz. */
export function ratioFor50Hz(poles: number, turbineRpm: number): number {
  return syncSpeedRpm(poles, 50) / turbineRpm;
}
