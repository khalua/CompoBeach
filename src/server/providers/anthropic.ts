import Anthropic from "@anthropic-ai/sdk";
import { emptyUsage } from "../../shared/cost";
import type { LaneConfig, Turn } from "../../shared/types";
import type { Adapter, AdapterEvent } from "./types";

// Models that predate adaptive thinking / effort. Everything newer gets adaptive thinking.
const LEGACY = /claude-(3|haiku-4-5|sonnet-4-5|opus-4-5|opus-4-1|opus-4-0|sonnet-4-0)/;

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

function buildMessages(history: Turn[], userText: string): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];
  for (const t of history) {
    messages.push({ role: "user", content: t.userText });
    // Replay the provider's own content (incl. thinking blocks) unchanged.
    const content = (t.rawAssistantContent as Anthropic.ContentBlockParam[] | undefined) ?? t.assistantText;
    messages.push({ role: "assistant", content });
  }
  messages.push({ role: "user", content: userText });
  return messages;
}

function baseParams(lane: LaneConfig) {
  const legacy = LEGACY.test(lane.model);
  return {
    model: lane.model,
    ...(lane.contextFile ? { system: lane.contextFile.content } : {}),
    ...(legacy
      ? {}
      : { thinking: { type: "adaptive" as const, display: lane.thinkingDisplay ?? "summarized" } }),
    ...(lane.effort && !legacy ? { output_config: { effort: lane.effort as "low" | "medium" | "high" | "xhigh" | "max" } } : {}),
  };
}

export const anthropicAdapter: Adapter = {
  id: "anthropic",
  kind: "anthropic",
  name: "Anthropic",
  efforts: ["low", "medium", "high", "xhigh", "max"],

  problem() {
    return process.env.ANTHROPIC_API_KEY ? null : "ANTHROPIC_API_KEY not set";
  },

  async listModels() {
    const ids: string[] = [];
    for await (const m of getClient().models.list({ limit: 100 })) ids.push(m.id);
    return ids;
  },

  async *stream(lane, history, userText, signal): AsyncGenerator<AdapterEvent> {
    const stream = getClient().messages.stream(
      {
        ...baseParams(lane),
        max_tokens: lane.maxTokens,
        messages: buildMessages(history, userText),
        ...(lane.caching ? { cache_control: { type: "ephemeral" as const } } : {}),
      },
      { signal },
    );

    for await (const ev of stream) {
      if (ev.type !== "content_block_delta") continue;
      if (ev.delta.type === "text_delta") yield { type: "delta", text: ev.delta.text };
      else if (ev.delta.type === "thinking_delta") yield { type: "thinking", text: ev.delta.thinking };
    }

    const msg = await stream.finalMessage();
    const u = msg.usage;
    yield {
      type: "final",
      usage: {
        ...emptyUsage(),
        inputUncached: u.input_tokens,
        cacheWrite: u.cache_creation_input_tokens,
        cacheRead: u.cache_read_input_tokens,
        output: u.output_tokens,
        reasoning: u.output_tokens_details?.thinking_tokens ?? null,
      },
      stopReason: msg.stop_reason,
      modelReported: msg.model,
      rawAssistantContent: msg.content,
    };
  },

  async countTokens(lane, history, userText) {
    const res = await getClient().messages.countTokens({
      ...baseParams(lane),
      messages: buildMessages(history, userText),
    });
    return { tokens: res.input_tokens, exact: true };
  },
};
