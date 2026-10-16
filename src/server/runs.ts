import { mkdir, readdir, readFile, rm, writeFile, rename } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { laneTotals } from "../shared/cost";
import type { LaneConfig, Run, RunSummary } from "../shared/types";

const DIR = resolve(process.cwd(), "data/runs");
const SAFE_ID = /^[\w-]+$/;

export function newRunId(): string {
  const iso = new Date().toISOString().replace(/[:.]/g, "-").replace("Z", "");
  return `${iso}-${randomBytes(3).toString("hex")}`;
}

// Runs in use stay in memory so concurrent requests (e.g. two lane-only replies) share one object.
const live = new Map<string, Run>();

export function createRun(lanes: LaneConfig[], title: string): Run {
  const now = new Date().toISOString();
  const run: Run = {
    id: newRunId(),
    createdAt: now,
    updatedAt: now,
    title: title.slice(0, 120),
    lanes,
    conversations: Object.fromEntries(lanes.map((l) => [l.id, []])),
    annotations: [],
  };
  live.set(run.id, run);
  return run;
}

const path = (id: string) => {
  if (!SAFE_ID.test(id)) throw new Error("bad run id");
  return resolve(DIR, `${id}.json`);
};

// Serialize writes per run: parallel lanes finish at different times.
const writeChains = new Map<string, Promise<void>>();

export function saveRun(run: Run): Promise<void> {
  run.updatedAt = new Date().toISOString();
  const snapshot = JSON.stringify(run, null, 2);
  const prev = writeChains.get(run.id) ?? Promise.resolve();
  const next = prev.then(async () => {
    await mkdir(DIR, { recursive: true });
    const tmp = `${path(run.id)}.tmp`;
    await writeFile(tmp, snapshot);
    await rename(tmp, path(run.id));
  });
  writeChains.set(run.id, next.catch(() => {}));
  return next;
}

export async function loadRun(id: string): Promise<Run | null> {
  const hit = live.get(id);
  if (hit) return hit;
  try {
    const run = JSON.parse(await readFile(path(id), "utf8")) as Run;
    live.set(id, run);
    return run;
  } catch {
    return null;
  }
}

export async function deleteRun(id: string): Promise<void> {
  live.delete(id);
  await rm(path(id), { force: true });
}

export async function listRuns(): Promise<RunSummary[]> {
  await mkdir(DIR, { recursive: true });
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".json"));
  const out: RunSummary[] = [];
  for (const f of files) {
    try {
      const run = JSON.parse(await readFile(resolve(DIR, f), "utf8")) as Run;
      let cost: number | null = null;
      let turns = 0;
      for (const lane of run.lanes) {
        const t = laneTotals(run.conversations[lane.id] ?? []);
        if (t.cost != null) cost = (cost ?? 0) + t.cost;
        turns = Math.max(turns, t.turns);
      }
      out.push({
        id: run.id,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        title: run.title,
        lanes: run.lanes.map((l) => ({ id: l.id, slot: l.slot, model: l.model })),
        totalCost: cost,
        turns,
      });
    } catch {
      /* skip unreadable files */
    }
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
