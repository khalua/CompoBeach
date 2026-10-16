// Lane identity: stocks follow lane slots (DESIGN.md §8).
export const STOCKS = [
  { letter: "A", key: "a", name: "Sheet" },
  { letter: "B", key: "b", name: "Carbon" },
  { letter: "C", key: "c", name: "Vellum" },
  { letter: "D", key: "d", name: "Kraft" },
] as const;

export const MAX_LANES = 4;

export const stock = (slot: number) => STOCKS[slot] ?? STOCKS[0];

/** Lowest slot not already taken. */
export function nextFreeSlot(taken: number[]): number {
  for (let i = 0; i < MAX_LANES; i++) if (!taken.includes(i)) return i;
  return -1;
}

export const newId = () => Math.random().toString(36).slice(2, 10);
