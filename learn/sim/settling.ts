// L3: settling basin sizing. Pure TypeScript: no three, no DOM.
// Source: ESHA guide, eq. 5.8 (Zanke), eq. 5.7 (L = Q / (vD * B)), and the B < L/8 rule.

/** Settling speed in mm/s for a grain of d mm (Zanke, still water). */
export function zankeVdMmS(dMm: number): number {
  return (100 / (9 * dMm)) * (Math.sqrt(1 + 157 * dMm ** 3) - 1);
}

/** Minimum basin length in m for flow (L/s), settling speed (mm/s) and basin width (m). */
export function trapLengthM(flowLps: number, vdMmS: number, widthM: number): number {
  return flowLps / 1000 / ((vdMmS / 1000) * widthM);
}

/** True when the basin is wider than 1/8 of its length. */
export function widthTooLarge(widthM: number, lengthM: number): boolean {
  return widthM > lengthM / 8;
}
