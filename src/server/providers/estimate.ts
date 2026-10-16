import { encode } from "gpt-tokenizer";
import type { LaneConfig, Turn } from "../../shared/types";

/** Local tokenizer estimate for providers without a counting endpoint. */
export function estimateTokens(lane: LaneConfig, history: Turn[], userText: string): number {
  const parts = [lane.contextFile?.content ?? "", ...history.flatMap((t) => [t.userText, t.assistantText]), userText];
  // ~4 tokens of framing per message.
  return parts.reduce((n, p) => n + (p ? encode(p).length + 4 : 0), 0);
}
