import { readFileSync, watchFile } from "node:fs";
import { resolve } from "node:path";
import type { Price, ProviderKind } from "../shared/types";

const PRICING_PATH = resolve(process.cwd(), "pricing.json");

type RawPrice = { input: number; output: number; cacheWrite?: number; cacheRead?: number };
let table: Record<string, RawPrice> = {};

function load() {
  try {
    const raw = JSON.parse(readFileSync(PRICING_PATH, "utf8")) as Record<string, unknown>;
    table = Object.fromEntries(
      Object.entries(raw).filter(([k, v]) => !k.startsWith("_") && typeof v === "object" && v !== null),
    ) as Record<string, RawPrice>;
  } catch (err) {
    console.warn(`[pricing] could not read ${PRICING_PATH}:`, (err as Error).message);
    table = {};
  }
}
load();
// Edits to pricing.json apply without a restart.
watchFile(PRICING_PATH, { interval: 2000 }, load);

/**
 * Price for a model, with cache prices derived when not set.
 * Anthropic: write 1.25x, read 0.1x input. Others: no assumed discount (read = input,
 * write = input) until the user enters real rates.
 */
export function priceFor(model: string, kind: ProviderKind): Price | null {
  const p = table[model];
  if (!p) return null;
  const anthropic = kind === "anthropic";
  return {
    input: p.input,
    output: p.output,
    cacheWrite: p.cacheWrite ?? (anthropic ? p.input * 1.25 : p.input),
    cacheRead: p.cacheRead ?? (anthropic ? p.input * 0.1 : p.input),
  };
}

export function pricedModelIds(prefix: string): string[] {
  return Object.keys(table).filter((k) => k.startsWith(prefix));
}
