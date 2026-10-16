import { useRef, useState, type ReactNode } from "react";
import type { ContextFile, Effort, LaneConfig, ProviderInfo, ThinkingDisplay } from "../../shared/types";
import { stock } from "../lib/stocks";
import { defaultMaxTokens, usePrefs } from "../store";
import { Field, IconButton, Input, LaneId, Panel, Select, Tag, Toggle } from "../ui";

/** One lane's provider/model/options. Used on Configure and in the Compare empty frame. */
export function LaneConfigCard({
  lane,
  providers,
  onChange,
  actions,
  crop,
}: {
  lane: LaneConfig;
  providers: ProviderInfo[] | null;
  onChange: (patch: Partial<LaneConfig>) => void;
  actions?: ReactNode;
  crop?: boolean;
}) {
  const s = stock(lane.slot);
  const provider = providers?.find((p) => p.id === lane.providerId);
  const models = provider?.models ?? [];
  const model = models.find((m) => m.id === lane.model);
  const modelIds = models.some((m) => m.id === lane.model) || !lane.model ? models : [{ id: lane.model, name: lane.model, price: null }, ...models];

  function changeProvider(id: string) {
    const p = providers?.find((x) => x.id === id);
    onChange({
      providerId: id,
      model: p?.models[0]?.id ?? "",
      effort: undefined,
      maxTokens: defaultMaxTokens(id),
    });
  }

  return (
    <Panel
      crop={crop}
      title={
        <span className="flex items-center gap-1.5">
          <LaneId slot={lane.slot} />
          <span>
            {s.letter} · {s.name}
          </span>
        </span>
      }
      right={actions}
    >
      <div className="grid grid-cols-2 gap-2">
        <Field label="Provider">
          <Select value={lane.providerId} onChange={(e) => changeProvider(e.target.value)}>
            {(providers ?? [{ id: lane.providerId, name: lane.providerId } as ProviderInfo]).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.configured === false ? " — no key" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Model">
          <Select value={lane.model} onChange={(e) => onChange({ model: e.target.value })}>
            {modelIds.length === 0 && <option value="">no models</option>}
            {modelIds.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
                {m.price ? ` · $${m.price.input}/$${m.price.output}` : " · no price"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Effort">
          <Select value={lane.effort ?? ""} onChange={(e) => onChange({ effort: (e.target.value || undefined) as Effort | undefined })}>
            <option value="">model default</option>
            {(provider?.efforts ?? []).map((ef) => (
              <option key={ef} value={ef}>
                {ef}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Thinking">
          <Select
            value={lane.thinkingDisplay ?? "summarized"}
            onChange={(e) => onChange({ thinkingDisplay: e.target.value as ThinkingDisplay })}
          >
            <option value="summarized">show summary</option>
            <option value="omitted">hide</option>
          </Select>
        </Field>
        <Field label="Max tokens">
          <Input
            type="number"
            min={256}
            step={1000}
            className="num"
            value={lane.maxTokens}
            onChange={(e) => onChange({ maxTokens: Math.max(1, Number(e.target.value) || 0) })}
          />
        </Field>
        <div className="flex flex-col justify-end gap-1 pb-1">
          {lane.providerId === "anthropic" ? (
            <Toggle checked={lane.caching} onChange={(v) => onChange({ caching: v })} label="Prompt caching" />
          ) : (
            <span className="label">caching: automatic</span>
          )}
        </div>
      </div>

      <div className="mt-2">
        <ContextDrop file={lane.contextFile} onChange={(f) => onChange({ contextFile: f })} />
      </div>

      {(provider?.problem || (lane.model && !model?.price)) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {provider?.problem && <Tag variant="muted">{provider.problem}</Tag>}
          {lane.model && !model?.price && <Tag variant="muted">no price</Tag>}
        </div>
      )}
    </Panel>
  );
}

function ContextDrop({ file, onChange }: { file?: ContextFile; onChange: (f: ContextFile | undefined) => void }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { recentContexts, rememberContext } = usePrefs();

  async function take(f: File | undefined) {
    if (!f) return;
    const ctx = { name: f.name, content: await f.text() };
    rememberContext(ctx);
    onChange(ctx);
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="label">Context file (system prompt)</span>
      <div
        className="dropzone"
        data-over={over}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files[0]);
        }}
      >
        {file ? (
          <span className="min-w-0 truncate normal-case tracking-normal">
            ctx: {file.name} <span className="text-graphite">· {file.content.length.toLocaleString("en-US")} chars</span>
          </span>
        ) : (
          <button type="button" className="text-left uppercase" onClick={() => input.current?.click()}>
            Drop .md <span className="text-graphite">or click</span>
          </button>
        )}
        <span className="flex shrink-0 items-center gap-1">
          {recentContexts.length > 0 && (
            <select
              aria-label="Recent context files"
              className="max-w-[120px] cursor-pointer border border-rule bg-transparent px-1 font-mono text-[11px] normal-case"
              value=""
              onChange={(e) => {
                const c = recentContexts.find((x) => x.name === e.target.value);
                if (c) onChange(c);
              }}
            >
              <option value="">recent ▾</option>
              {recentContexts.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {file && (
            <IconButton className="!size-[24px]" aria-label="Remove context file" onClick={() => onChange(undefined)}>
              ×
            </IconButton>
          )}
        </span>
        <input
          ref={input}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          hidden
          onChange={(e) => {
            void take(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
