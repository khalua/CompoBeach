import type { Effort, LaneConfig, ProviderKind, Turn, Usage } from "../../shared/types";

export type AdapterEvent =
  | { type: "delta"; text: string }
  | { type: "thinking"; text: string }
  | {
      type: "final";
      usage: Usage;
      stopReason: string | null;
      modelReported?: string;
      rawAssistantContent?: unknown;
    };

export interface Adapter {
  id: string;
  kind: ProviderKind;
  name: string;
  efforts: Effort[];
  /** null when usable; otherwise the reason (e.g. missing key). */
  problem(): string | null;
  listModels(): Promise<string[]>;
  /** `history` excludes errored turns. */
  stream(lane: LaneConfig, history: Turn[], userText: string, signal: AbortSignal): AsyncGenerator<AdapterEvent>;
  countTokens(lane: LaneConfig, history: Turn[], userText: string): Promise<{ tokens: number; exact: boolean }>;
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { status?: number; message?: string; error?: { message?: string } };
    const msg = e.error?.message ?? e.message ?? String(err);
    return e.status ? `${e.status}: ${msg}` : msg;
  }
  return String(err);
}
