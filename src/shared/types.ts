// Types shared by the client and the local server.

export type ProviderKind = "anthropic" | "openai" | "compat";
export type Effort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
export type ThinkingDisplay = "summarized" | "omitted";

export interface ContextFile {
  name: string;
  content: string;
}

export interface LaneConfig {
  id: string;
  /** Slot 0–3 → stock A–D. */
  slot: number;
  providerId: string; // "anthropic" | "openai" | compat endpoint id
  model: string;
  effort?: Effort;
  thinkingDisplay?: ThinkingDisplay;
  maxTokens: number;
  /** Anthropic only; OpenAI caches automatically. */
  caching: boolean;
  contextFile?: ContextFile;
}

/** Normalized usage. `null` means "not reported", never "zero". */
export interface Usage {
  inputUncached: number | null;
  cacheWrite: number | null;
  cacheRead: number | null;
  output: number | null;
  reasoning: number | null;
  estimatedPreSend: number | null;
  estimateExact: boolean;
}

export interface CostBreakdown {
  input: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
  total: number;
  /** What the same tokens would cost with no caching, minus the actual cost. */
  savedByCache: number;
}

export type TurnScope = "shared" | "lane";

/** A file extracted from a reply's fenced code blocks and written to data/artifacts. */
export interface Artifact {
  name: string;
  lang: string;
  bytes: number;
  /** Path on the artifact server, e.g. /<run>/<lane>/T2/index.html */
  url: string;
}

export interface AppConfig {
  artifactOrigin: string;
}

export interface Turn {
  index: number;
  scope: TurnScope;
  userText: string;
  assistantText: string;
  thinking?: string;
  /** Provider-native assistant content, replayed unchanged on the next turn. */
  rawAssistantContent?: unknown;
  usage: Usage;
  cost: CostBreakdown | null;
  ttftMs: number | null;
  totalMs: number | null;
  stopReason: string | null;
  modelReported?: string;
  error?: string;
  /** Undefined on runs saved before artifacts existed (backfilled on open). */
  artifacts?: Artifact[];
}

export interface Run {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  lanes: LaneConfig[];
  conversations: Record<string, Turn[]>;
  /** Reserved for the preferred / why / comments feature. */
  annotations: unknown[];
}

export interface RunSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  lanes: { id: string; slot: number; model: string }[];
  totalCost: number | null;
  turns: number;
}

export interface Price {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  price: Price | null;
}

export interface ProviderInfo {
  id: string;
  kind: ProviderKind;
  name: string;
  configured: boolean;
  /** Why it isn't configured, e.g. "ANTHROPIC_API_KEY not set". */
  problem?: string;
  models: ModelInfo[];
  efforts: Effort[];
}

// ---- /api/compare ----

export interface CompareRequest {
  runId?: string;
  /** Lanes for a new run, or the full current lane set (config edits are saved). */
  lanes?: LaneConfig[];
  message?: string;
  scope?: TurnScope;
  targetLaneIds?: string[];
  /** Add a lane to an existing run and replay its shared turns. */
  addLane?: LaneConfig;
  /** Pre-send estimates from /api/count, recorded on the turn for est. vs actual. */
  estimates?: Record<string, { tokens: number; exact: boolean }>;
}

export type StreamEvent =
  | { type: "run"; run: Run }
  | { type: "turn_start"; laneId: string; turnIndex: number; userText: string; scope: TurnScope; replay?: { of: number; total: number } }
  | { type: "delta"; laneId: string; turnIndex: number; text: string }
  | { type: "thinking"; laneId: string; turnIndex: number; text: string }
  | { type: "turn_done"; laneId: string; turnIndex: number; turn: Turn }
  | { type: "error"; laneId?: string; turnIndex?: number; message: string }
  | { type: "run_saved"; runId: string };

// ---- /api/count ----

export interface CountRequest {
  runId?: string;
  lanes: LaneConfig[];
  message: string;
}

export interface CountResult {
  laneId: string;
  tokens: number | null;
  exact: boolean;
  costUsd: number | null;
  error?: string;
}
