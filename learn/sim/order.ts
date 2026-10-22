// L1: the order in which water passes through the seven parts. Pure TypeScript.

export const PLANT_ORDER: readonly string[] = [
  "weir",
  "canal",
  "forebay",
  "penstock",
  "powerhouse",
  "tailrace",
  "powerline",
];

export function isCorrectOrder(ids: readonly string[]): boolean {
  return ids.length === PLANT_ORDER.length && ids.every((id, i) => id === PLANT_ORDER[i]);
}
