import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ProviderInfo } from "../../shared/types";
import { priceFor, pricedModelIds } from "../pricing";
import { anthropicAdapter } from "./anthropic";
import { compatAdapter, type CompatEndpoint } from "./compat";
import { openaiAdapter } from "./openai";
import { errorMessage, type Adapter } from "./types";

function loadCompat(): CompatEndpoint[] {
  try {
    const raw = JSON.parse(readFileSync(resolve(process.cwd(), "providers.config.json"), "utf8"));
    return (raw.compat ?? []) as CompatEndpoint[];
  } catch {
    return [];
  }
}

export const adapters: Adapter[] = [anthropicAdapter, openaiAdapter, ...loadCompat().map(compatAdapter)];

export function getAdapter(id: string): Adapter | undefined {
  return adapters.find((a) => a.id === id);
}

const MODEL_TTL_MS = 5 * 60_000;
const modelCache = new Map<string, { at: number; ids: string[]; problem?: string }>();

async function modelsFor(a: Adapter): Promise<{ ids: string[]; problem?: string }> {
  const hit = modelCache.get(a.id);
  if (hit && Date.now() - hit.at < MODEL_TTL_MS) return hit;
  let entry: { at: number; ids: string[]; problem?: string };
  try {
    entry = { at: Date.now(), ids: await a.listModels() };
  } catch (err) {
    // Fall back to the models we know prices for, so the picker still works.
    const fallback = a.kind === "anthropic" ? pricedModelIds("claude-") : [];
    entry = { at: Date.now(), ids: fallback, problem: `model list failed: ${errorMessage(err)}` };
  }
  modelCache.set(a.id, entry);
  return entry;
}

export async function providerInfo(): Promise<ProviderInfo[]> {
  return Promise.all(
    adapters.map(async (a) => {
      const problem = a.problem();
      const { ids, problem: listProblem } = problem
        ? { ids: a.kind === "anthropic" ? pricedModelIds("claude-") : [], problem: undefined }
        : await modelsFor(a);
      return {
        id: a.id,
        kind: a.kind,
        name: a.name,
        configured: !problem,
        problem: problem ?? listProblem,
        efforts: a.efforts,
        models: ids.map((id) => ({ id, name: id, price: priceFor(id, a.kind) })),
      };
    }),
  );
}
