import OpenAI from "openai";
import { emptyUsage } from "../../shared/cost";
import type { Turn } from "../../shared/types";
import { estimateTokens } from "./estimate";
import type { Adapter, AdapterEvent } from "./types";

let client: OpenAI | null = null;
function getClient() {
  client ??= new OpenAI();
  return client;
}

function buildInput(history: Turn[], userText: string): OpenAI.Responses.ResponseInputItem[] {
  const input: OpenAI.Responses.ResponseInputItem[] = [];
  for (const t of history) {
    input.push({ role: "user", content: t.userText });
    input.push({ role: "assistant", content: t.assistantText });
  }
  input.push({ role: "user", content: userText });
  return input;
}

const CHAT_MODEL = /^(gpt-|o\d|chatgpt-)/;
const NOT_CHAT = /(audio|realtime|transcribe|tts|image|embedding|moderation|search|instruct)/;

export const openaiAdapter: Adapter = {
  id: "openai",
  kind: "openai",
  name: "OpenAI",
  efforts: ["none", "minimal", "low", "medium", "high", "xhigh"],

  problem() {
    return process.env.OPENAI_API_KEY ? null : "OPENAI_API_KEY not set";
  },

  async listModels() {
    const ids: string[] = [];
    for await (const m of getClient().models.list()) {
      if (CHAT_MODEL.test(m.id) && !NOT_CHAT.test(m.id)) ids.push(m.id);
    }
    return ids.sort();
  },

  async *stream(lane, history, userText, signal): AsyncGenerator<AdapterEvent> {
    const stream = await getClient().responses.create(
      {
        model: lane.model,
        input: buildInput(history, userText),
        ...(lane.contextFile ? { instructions: lane.contextFile.content } : {}),
        max_output_tokens: lane.maxTokens,
        // Reasoning params only when an effort is chosen; non-reasoning models reject them.
        ...(lane.effort
          ? {
              reasoning: {
                effort: lane.effort,
                ...(lane.thinkingDisplay === "summarized" ? { summary: "auto" as const } : {}),
              },
            }
          : {}),
        store: false,
        stream: true,
      },
      { signal },
    );

    for await (const ev of stream) {
      switch (ev.type) {
        case "response.output_text.delta":
        case "response.refusal.delta":
          yield { type: "delta", text: ev.delta };
          break;
        case "response.reasoning_summary_text.delta":
          yield { type: "thinking", text: ev.delta };
          break;
        case "error":
          throw new Error(ev.message);
        case "response.failed":
          throw new Error(ev.response.error?.message ?? "response failed");
        case "response.completed":
        case "response.incomplete": {
          const r = ev.response;
          const u = r.usage;
          const cached = u?.input_tokens_details?.cached_tokens ?? null;
          yield {
            type: "final",
            usage: {
              ...emptyUsage(),
              inputUncached: u ? u.input_tokens - (cached ?? 0) : null,
              cacheRead: cached,
              cacheWrite: u?.input_tokens_details?.cache_write_tokens ?? null,
              output: u?.output_tokens ?? null,
              reasoning: u?.output_tokens_details?.reasoning_tokens ?? null,
            },
            stopReason: r.status === "completed" ? "completed" : (r.incomplete_details?.reason ?? r.status ?? null),
            modelReported: r.model,
          };
          break;
        }
      }
    }
  },

  async countTokens(lane, history, userText) {
    return { tokens: estimateTokens(lane, history, userText), exact: false };
  },
};
