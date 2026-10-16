import OpenAI from "openai";
import { emptyUsage } from "../../shared/cost";
import type { Turn } from "../../shared/types";
import { estimateTokens } from "./estimate";
import type { Adapter, AdapterEvent } from "./types";

export interface CompatEndpoint {
  id: string;
  name: string;
  baseURL: string;
  apiKeyEnv: string | null;
  models: string[];
}

function buildMessages(system: string | undefined, history: Turn[], userText: string) {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (system) messages.push({ role: "system", content: system });
  for (const t of history) {
    messages.push({ role: "user", content: t.userText });
    messages.push({ role: "assistant", content: t.assistantText });
  }
  messages.push({ role: "user", content: userText });
  return messages;
}

/** Generic OpenAI-compatible endpoint via Chat Completions. */
export function compatAdapter(ep: CompatEndpoint): Adapter {
  let client: OpenAI | null = null;
  const getClient = () =>
    (client ??= new OpenAI({
      baseURL: ep.baseURL,
      apiKey: (ep.apiKeyEnv && process.env[ep.apiKeyEnv]) || "not-needed",
    }));

  return {
    id: ep.id,
    kind: "compat",
    name: ep.name,
    efforts: ["low", "medium", "high"],

    problem() {
      if (ep.apiKeyEnv && !process.env[ep.apiKeyEnv]) return `${ep.apiKeyEnv} not set`;
      return null;
    },

    async listModels() {
      // Configured models first; merge in whatever the endpoint reports, if it answers quickly.
      const ids = new Set(ep.models);
      try {
        const page = await getClient().models.list({ timeout: 1500, maxRetries: 0 });
        for (const m of page.data) ids.add(m.id);
      } catch {
        /* endpoint may not implement /models */
      }
      return [...ids];
    },

    async *stream(lane, history, userText, signal): AsyncGenerator<AdapterEvent> {
      const stream = await getClient().chat.completions.create(
        {
          model: lane.model,
          messages: buildMessages(lane.contextFile?.content, history, userText),
          max_completion_tokens: lane.maxTokens,
          ...(lane.effort ? { reasoning_effort: lane.effort as "low" | "medium" | "high" } : {}),
          stream: true,
          stream_options: { include_usage: true },
        },
        { signal },
      );

      let stopReason: string | null = null;
      let model: string | undefined;
      let usage = emptyUsage();
      for await (const chunk of stream) {
        model ??= chunk.model;
        const choice = chunk.choices[0];
        if (choice?.delta?.content) yield { type: "delta", text: choice.delta.content };
        // Several servers (DeepSeek, vLLM, Ollama) stream reasoning under a non-standard key.
        const d = choice?.delta as { reasoning_content?: string; reasoning?: string } | undefined;
        const r = d?.reasoning_content ?? d?.reasoning;
        if (r) yield { type: "thinking", text: r };
        if (choice?.finish_reason) stopReason = choice.finish_reason;
        if (chunk.usage) {
          const u = chunk.usage;
          const cached = u.prompt_tokens_details?.cached_tokens ?? null;
          usage = {
            ...emptyUsage(),
            inputUncached: u.prompt_tokens - (cached ?? 0),
            cacheRead: cached,
            output: u.completion_tokens,
            reasoning: u.completion_tokens_details?.reasoning_tokens ?? null,
          };
        }
      }
      yield { type: "final", usage, stopReason, modelReported: model };
    },

    async countTokens(lane, history, userText) {
      return { tokens: estimateTokens(lane, history, userText), exact: false };
    },
  };
}
