import { useState } from "react";
import type { Turn } from "../../shared/types";
import { EventLog } from "../components/EventLog";
import { TotalsStrip, TurnChip } from "../components/metrics";
import { Reply } from "../components/Reply";
import { STOCKS } from "../lib/stocks";
import { Alert, Button, Field, IconButton, Input, LaneId, Meter, Panel, SectionIndex, Segmented, Select, Spectrum, Tag, Textarea, Toggle, Wordmark } from "../ui";

const SAMPLE_MD = `### Short answer
Cache reads are billed at **~0.1×** the input price. See [the docs](#).

- Turn 1 writes the prefix
- Turn 2 reads it back

\`\`\`ts
// resend the whole history
const usage = msg.usage;
\`\`\`

> Missing values show as n/a, never 0.

| Field | Tokens |
|---|---|
| cache read | 12,402 |`;

const SAMPLE_TURN: Turn = {
  index: 1,
  scope: "shared",
  userText: "Now make it shorter.",
  assistantText: "",
  usage: { inputUncached: 3118, cacheWrite: 0, cacheRead: 12402, output: 2904, reasoning: 812, estimatedPreSend: 15490, estimateExact: true },
  cost: { input: 0.01247, cacheWrite: 0, cacheRead: 0.00496, output: 0.05808, total: 0.07551, savedByCache: 0.04465 },
  ttftMs: 412,
  totalMs: 4210,
  stopReason: "end_turn",
};

/** Hidden route (#/styleguide): every primitive and all four lane stocks, for checking against DESIGN.md. */
export function Styleguide() {
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState<"rendered" | "raw" | "diff">("rendered");

  return (
    <div className="mx-auto flex max-w-[1260px] flex-col gap-6 px-6 py-8">
      <Wordmark size={150} />
      <Spectrum />

      <SectionIndex n="01" label="Colour" />
      <div className="grid grid-cols-3 gap-2 md:grid-cols-9">
        {["paper", "sheet", "rule", "graphite", "ink", "kr", "cobalt", "redline", "redline-text"].map((c) => (
          <div key={c} className="border border-ink bg-sheet">
            <div className="h-12 border-b border-ink" style={{ background: `var(--color-${c})` }} />
            <div className="p-1 font-mono text-[11px]">{c}</div>
          </div>
        ))}
      </div>

      <SectionIndex n="02" label="Typography" />
      <div className="flex flex-col gap-2">
        <div className="text-[88px] leading-[.9] font-bold tracking-[-0.03em] uppercase">Side by side</div>
        <div className="text-[48px] leading-none font-bold tracking-[-0.03em] uppercase">Opus vs GPT, high effort</div>
        <div className="text-[30px] leading-[1.1] font-medium">Lane B finished first</div>
        <div className="text-[20px] leading-[1.2] font-medium">H3 sentence case</div>
        <p className="m-0 max-w-[62ch] text-[16px] leading-normal">
          Every follow-up resends the whole conversation, so input is split into new, cache write and cache read.
        </p>
        <div className="num text-[13px]">{'{"laneId":"b","turnIndex":2,"type":"usage","cacheRead":12402}'}</div>
        <span className="label">Label · mono 11 uppercase</span>
      </div>

      <SectionIndex n="03" label="Controls" />
      <div className="grid gap-3 md:grid-cols-3">
        <Panel title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Send to all lanes</Button>
            <Button>Duplicate lane</Button>
            <Button variant="danger">Delete run</Button>
            <Button disabled>Max 4 lanes</Button>
            <IconButton aria-label="close">×</IconButton>
          </div>
        </Panel>
        <Panel title="Inputs">
          <div className="flex flex-col gap-2">
            <Field label="Prompt">
              <Textarea rows={2} placeholder="Explain this diff like I'm on call…" />
            </Field>
            <Field label="Model">
              <Select>
                <option>claude-opus-5-5 · $4/$20</option>
                <option>gpt-x · no price</option>
              </Select>
            </Field>
            <Input placeholder="preset name" />
            <div className="flex gap-3">
              <Toggle checked={on} onChange={setOn} label="Caching" />
              <Toggle checked={!on} onChange={(v) => setOn(!v)} label="Synced scroll" />
            </div>
            <Segmented value={seg} onChange={setSeg} options={[{ value: "rendered", label: "Rendered" }, { value: "raw", label: "Raw" }, { value: "diff", label: "Diff" }]} />
          </div>
        </Panel>
        <Panel title="Status" crop>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1">
              <Tag variant="solid">Streaming</Tag>
              <Tag>Lane-only</Tag>
              <Tag>est.</Tag>
              <Tag variant="winner">Cheapest</Tag>
              <Tag variant="error">Refused</Tag>
              <Tag variant="muted">no price</Tag>
            </div>
            <Meter value={0.64} label="progress" />
            <Alert>Cache read = 0 on turn 1: prefix is below the model minimum.</Alert>
            <Alert error>Lane C: 401, OPENAI_API_KEY not set. Other lanes still running.</Alert>
          </div>
        </Panel>
      </div>

      <SectionIndex n="04" label="Metrics" />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <TotalsStrip turns={[SAMPLE_TURN]} />
          <TurnChip turn={SAMPLE_TURN} />
          <TurnChip turn={{ ...SAMPLE_TURN, usage: { ...SAMPLE_TURN.usage, cacheRead: null, cacheWrite: null, reasoning: null, estimatedPreSend: null }, cost: null }} />
        </div>
        <Panel title="Event log">
          <EventLog
            lines={[
              { key: "a/2", name: "thinking", value: "summarized" },
              { key: "b/2", name: "delta → 1,846 tok", value: "done" },
              { key: "c/2", name: "stop_reason", value: "refusal", error: true },
              { key: "a/2", name: "usage · cache_read", value: "12,402" },
            ]}
          />
        </Panel>
      </div>

      <SectionIndex n="05" label="Lane stocks" />
      <div className="grid border border-ink md:grid-cols-4">
        {STOCKS.map((s, i) => (
          <div key={s.key} className="flex min-w-0 flex-col border-ink md:border-l md:first:border-l-0">
            <div className="flex items-center gap-1.5 bg-paper px-2 py-1.5 font-mono text-[12px]">
              <LaneId slot={i} /> {s.letter} · {s.name.toUpperCase()}
              {i === 1 && <LaneId slot={i} winner />}
            </div>
            <div data-stock={s.key} className="flex flex-col gap-1.5 p-3">
              <div className="you px-2 py-1.5">
                <div className="who mb-0.5 font-mono text-[11px] uppercase tracking-[.12em]">You · T2</div>
                Summarize the trade-offs.
              </div>
              <details className="thinking">
                <summary className="cursor-pointer uppercase tracking-[.12em]">Thinking</summary>
                Weighing cache reads against output length.
              </details>
              <Reply text={SAMPLE_MD} raw={false} streaming={i === 2} />
              <TurnChip turn={SAMPLE_TURN} />
            </div>
          </div>
        ))}
      </div>

      <SectionIndex n="06" label="Spacing · 6px base" />
      <div className="flex items-end gap-3">
        {[6, 12, 18, 24, 36, 48, 72, 96].map((s) => (
          <div key={s} className="flex flex-col items-center gap-1 font-mono text-[10px] text-graphite">
            <span className="block bg-kr" style={{ width: s, height: s }} />
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}
