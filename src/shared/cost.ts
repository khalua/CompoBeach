import type { CostBreakdown, Price, Turn, Usage } from "./types";

const PER = 1_000_000;

export function emptyUsage(): Usage {
  return {
    inputUncached: null,
    cacheWrite: null,
    cacheRead: null,
    output: null,
    reasoning: null,
    estimatedPreSend: null,
    estimateExact: false,
  };
}

/** Cost of one turn. Returns null when there's no price or no usage at all. */
export function computeCost(u: Usage, p: Price | null): CostBreakdown | null {
  if (!p) return null;
  if (u.inputUncached == null && u.output == null) return null;
  const n = (v: number | null) => v ?? 0;
  const input = (n(u.inputUncached) * p.input) / PER;
  const cacheWrite = (n(u.cacheWrite) * p.cacheWrite) / PER;
  const cacheRead = (n(u.cacheRead) * p.cacheRead) / PER;
  const output = (n(u.output) * p.output) / PER;
  const total = input + cacheWrite + cacheRead + output;
  const uncachedEquivalent =
    ((n(u.inputUncached) + n(u.cacheWrite) + n(u.cacheRead)) * p.input) / PER + output;
  return { input, cacheWrite, cacheRead, output, total, savedByCache: uncachedEquivalent - total };
}

export interface LaneTotals {
  inputUncached: number | null;
  cacheWrite: number | null;
  cacheRead: number | null;
  output: number | null;
  reasoning: number | null;
  cost: number | null;
  savedByCache: number | null;
  totalMs: number | null;
  turns: number;
}

/** Sums that stay null when no turn reported the field. */
export function laneTotals(turns: Turn[]): LaneTotals {
  const sum = (pick: (t: Turn) => number | null | undefined) => {
    let seen = false;
    let s = 0;
    for (const t of turns) {
      const v = pick(t);
      if (v != null) {
        seen = true;
        s += v;
      }
    }
    return seen ? s : null;
  };
  return {
    inputUncached: sum((t) => t.usage.inputUncached),
    cacheWrite: sum((t) => t.usage.cacheWrite),
    cacheRead: sum((t) => t.usage.cacheRead),
    output: sum((t) => t.usage.output),
    reasoning: sum((t) => t.usage.reasoning),
    cost: sum((t) => t.cost?.total),
    savedByCache: sum((t) => t.cost?.savedByCache),
    totalMs: sum((t) => t.totalMs),
    turns: turns.length,
  };
}
