import express, { type Response } from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { computeCost, emptyUsage } from "../shared/cost";
import type {
  CompareRequest,
  CountRequest,
  CountResult,
  LaneConfig,
  Run,
  StreamEvent,
  Turn,
  TurnScope,
} from "../shared/types";
import {
  ARTIFACT_PORT,
  backfillArtifacts,
  readArtifact,
  removeArtifacts,
  startArtifactServer,
  writeTurnArtifacts,
} from "./artifacts";
import { priceFor } from "./pricing";
import { getAdapter, providerInfo } from "./providers";
import { errorMessage } from "./providers/types";
import { createRun, deleteRun, listRuns, loadRun, saveRun } from "./runs";

const app = express();
app.use(express.json({ limit: "25mb" }));

// Only the app itself may call the API: blocks other origins (including the artifact
// server's model-written pages) from spending tokens or deleting runs.
const port = Number(process.env.PORT ?? 8787);
const ALLOWED_ORIGINS = new Set([`http://localhost:${port}`, "http://localhost:5173", `http://127.0.0.1:${port}`, "http://127.0.0.1:5173"]);
app.use("/api", (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) return void res.status(403).json({ error: "origin not allowed" });
  next();
});

app.get("/api/config", (req, res) => {
  const host = (req.headers.host ?? "localhost").split(":")[0];
  res.json({ artifactOrigin: `http://${host}:${ARTIFACT_PORT}` });
});

/** Raw artifact text, same-origin, for the diff view. */
app.get("/api/artifact", async (req, res) => {
  const text = await readArtifact(String(req.query.url ?? ""));
  if (text == null) return void res.status(404).end();
  res.type("text/plain").send(text);
});

app.get("/api/providers", async (_req, res) => {
  res.json(await providerInfo());
});

app.get("/api/runs", async (_req, res) => {
  res.json(await listRuns());
});

app.get("/api/runs/:id", async (req, res) => {
  const run = await loadRun(req.params.id);
  if (!run) return void res.status(404).json({ error: "not found" });
  if (await backfillArtifacts(run)) await saveRun(run);
  res.json(run);
});

app.delete("/api/runs/:id", async (req, res) => {
  await deleteRun(req.params.id);
  await removeArtifacts(req.params.id);
  res.status(204).end();
});

app.delete("/api/runs/:id/lanes/:laneId", async (req, res) => {
  const run = await loadRun(req.params.id);
  if (!run) return void res.status(404).json({ error: "not found" });
  run.lanes = run.lanes.filter((l) => l.id !== req.params.laneId);
  delete run.conversations[req.params.laneId];
  await saveRun(run);
  await removeArtifacts(run.id, req.params.laneId);
  res.json(run);
});

/** Turns that are sent back to the model as history (failed turns are skipped). */
const usableHistory = (turns: Turn[]) => turns.filter((t) => !t.error);

async function runTurn(
  run: Run,
  lane: LaneConfig,
  userText: string,
  scope: TurnScope,
  emit: (e: StreamEvent) => void,
  signal: AbortSignal,
  replay?: { of: number; total: number },
  estimate?: { tokens: number; exact: boolean },
): Promise<Turn> {
  const busyKey = `${run.id}:${lane.id}`;
  if (busyLanes.has(busyKey)) {
    emit({ type: "error", laneId: lane.id, message: "This lane is still streaming a reply." });
    throw new Error("lane busy");
  }
  busyLanes.add(busyKey);
  try {
    return await runTurnInner(run, lane, userText, scope, emit, signal, replay, estimate);
  } finally {
    busyLanes.delete(busyKey);
  }
}

const busyLanes = new Set<string>();

async function runTurnInner(
  run: Run,
  lane: LaneConfig,
  userText: string,
  scope: TurnScope,
  emit: (e: StreamEvent) => void,
  signal: AbortSignal,
  replay?: { of: number; total: number },
  estimate?: { tokens: number; exact: boolean },
): Promise<Turn> {
  const conv = (run.conversations[lane.id] ??= []);
  const index = conv.length;
  emit({ type: "turn_start", laneId: lane.id, turnIndex: index, userText, scope, replay });

  const adapter = getAdapter(lane.providerId);
  const t0 = performance.now();
  let ttft: number | null = null;
  let text = "";
  let thinking = "";
  const turn: Turn = {
    index,
    scope,
    userText,
    assistantText: "",
    usage: { ...emptyUsage(), estimatedPreSend: estimate?.tokens ?? null, estimateExact: estimate?.exact ?? false },
    cost: null,
    ttftMs: null,
    totalMs: null,
    stopReason: null,
  };

  try {
    if (!adapter) throw new Error(`unknown provider "${lane.providerId}"`);
    const problem = adapter.problem();
    if (problem) throw new Error(problem);
    for await (const ev of adapter.stream(lane, usableHistory(conv), userText, signal)) {
      if (ev.type === "final") {
        turn.usage = { ...ev.usage, estimatedPreSend: turn.usage.estimatedPreSend, estimateExact: turn.usage.estimateExact };
        turn.stopReason = ev.stopReason;
        turn.modelReported = ev.modelReported;
        turn.rawAssistantContent = ev.rawAssistantContent;
        continue;
      }
      ttft ??= performance.now() - t0;
      if (ev.type === "delta") text += ev.text;
      else thinking += ev.text;
      emit({ type: ev.type, laneId: lane.id, turnIndex: index, text: ev.text });
    }
  } catch (err) {
    turn.error = signal.aborted ? "cancelled" : errorMessage(err);
  }

  turn.assistantText = text;
  if (thinking) turn.thinking = thinking;
  turn.ttftMs = ttft == null ? null : Math.round(ttft);
  turn.totalMs = Math.round(performance.now() - t0);
  turn.cost = adapter ? computeCost(turn.usage, priceFor(lane.model, adapter.kind)) : null;
  try {
    turn.artifacts = await writeTurnArtifacts(run.id, lane.id, turn);
  } catch (err) {
    console.warn("[artifacts]", errorMessage(err));
    turn.artifacts = [];
  }
  conv.push(turn);
  emit({ type: "turn_done", laneId: lane.id, turnIndex: index, turn });
  await saveRun(run);
  return turn;
}

/** The shared prompts of a run, in order, taken from the lane that has the most of them. */
function sharedPrompts(run: Run): string[] {
  let best: string[] = [];
  for (const lane of run.lanes) {
    const prompts = (run.conversations[lane.id] ?? []).filter((t) => t.scope === "shared").map((t) => t.userText);
    if (prompts.length > best.length) best = prompts;
  }
  return best;
}

function ndjson(res: Response) {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  return (e: StreamEvent) => {
    if (!res.writableEnded) res.write(JSON.stringify(e) + "\n");
  };
}

app.post("/api/compare", async (req, res) => {
  const body = req.body as CompareRequest;
  let run: Run | null;

  if (body.runId) {
    run = await loadRun(body.runId);
    if (!run) return void res.status(404).json({ error: "run not found" });
    if (body.lanes) {
      // Apply config edits (e.g. effort changed between turns) for lanes that exist.
      run.lanes = run.lanes.map((l) => body.lanes!.find((n) => n.id === l.id) ?? l);
    }
  } else {
    if (!body.lanes?.length || !body.message?.trim()) {
      return void res.status(400).json({ error: "lanes and message are required" });
    }
    run = createRun(body.lanes, body.message.trim());
  }

  const abort = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) abort.abort();
  });
  const emit = ndjson(res);
  const theRun = run;

  try {
    if (body.addLane) {
      if (theRun.lanes.length >= 4) throw new Error("Max 4 lanes");
      const lane = body.addLane;
      const prompts = sharedPrompts(theRun);
      theRun.lanes.push(lane);
      theRun.conversations[lane.id] = [];
      await saveRun(theRun);
      emit({ type: "run", run: theRun });
      for (let i = 0; i < prompts.length; i++) {
        if (abort.signal.aborted) break;
        await runTurn(theRun, lane, prompts[i], "shared", emit, abort.signal, { of: i + 1, total: prompts.length });
      }
    } else {
      const message = body.message?.trim();
      if (!message) throw new Error("message is required");
      const scope: TurnScope = body.scope ?? "shared";
      const targets = theRun.lanes.filter((l) => !body.targetLaneIds || body.targetLaneIds.includes(l.id));
      await saveRun(theRun);
      emit({ type: "run", run: theRun });
      await Promise.allSettled(
        targets.map((lane) =>
          runTurn(theRun, lane, message, scope, emit, abort.signal, undefined, body.estimates?.[lane.id]),
        ),
      );
    }
    emit({ type: "run_saved", runId: theRun.id });
  } catch (err) {
    emit({ type: "error", message: errorMessage(err) });
  }
  res.end();
});

app.post("/api/count", async (req, res) => {
  const body = req.body as CountRequest;
  const run = body.runId ? await loadRun(body.runId) : null;
  const results: CountResult[] = await Promise.all(
    body.lanes.map(async (lane): Promise<CountResult> => {
      const adapter = getAdapter(lane.providerId);
      if (!adapter) return { laneId: lane.id, tokens: null, exact: false, costUsd: null, error: "unknown provider" };
      const problem = adapter.problem();
      if (problem) return { laneId: lane.id, tokens: null, exact: false, costUsd: null, error: problem };
      try {
        const history = usableHistory(run?.conversations[lane.id] ?? []);
        const { tokens, exact } = await adapter.countTokens(lane, history, body.message);
        const price = priceFor(lane.model, adapter.kind);
        // Pre-send cost assumes nothing is cached: an upper bound for the input side.
        return { laneId: lane.id, tokens, exact, costUsd: price ? (tokens * price.input) / 1e6 : null };
      } catch (err) {
        return { laneId: lane.id, tokens: null, exact: false, costUsd: null, error: errorMessage(err) };
      }
    }),
  );
  res.json(results);
});

// Serve the built client when present (npm run build && npm start).
const dist = resolve(process.cwd(), "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(resolve(dist, "index.html")));
}

startArtifactServer();
app.listen(port, () => console.log(`[compobeach] server on http://localhost:${port}`));
