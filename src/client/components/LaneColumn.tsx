import { forwardRef, useState, type KeyboardEvent } from "react";
import type { LaneConfig, Turn } from "../../shared/types";
import { stock } from "../lib/stocks";
import { useSession, type LiveTurn } from "../store";
import { Alert, IconButton, LaneId, Tag } from "../ui";
import { TotalsStrip, TurnChip } from "./metrics";
import { ArtifactsRow } from "./Artifacts";
import { Reply } from "./Reply";

export const LaneColumn = forwardRef<
  HTMLDivElement,
  { lane: LaneConfig; turns: Turn[]; live?: LiveTurn; raw: boolean; onScroll?: () => void; canRemove: boolean }
>(function LaneColumn({ lane, turns, live, raw, onScroll, canRemove }, ref) {
  const s = stock(lane.slot);
  const { sendLane, removeRunLane } = useSession();
  const busy = !!live;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-ink first:border-l-0">
      {/* Header + totals: shared paper chrome */}
      <header className="flex items-center gap-1.5 bg-paper px-2 py-1.5">
        <LaneId slot={lane.slot} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[12px] font-medium">
            {s.letter} · {s.name}
            <span className="text-graphite">
              {" "}
              · {lane.model} · {lane.effort ?? "default"}
            </span>
          </div>
          {lane.contextFile && (
            <div className="truncate font-mono text-[11px] text-graphite">ctx: {lane.contextFile.name}</div>
          )}
        </div>
        {busy && <Tag variant="solid">{live.replay ? `turn ${live.replay.of}/${live.replay.total}` : "streaming"}</Tag>}
        {canRemove && (
          <IconButton aria-label={`Remove lane ${s.letter}`} title="Remove lane" disabled={busy} onClick={() => void removeRunLane(lane.id)}>
            ×
          </IconButton>
        )}
      </header>
      <TotalsStrip turns={turns} />

      {/* Body: the lane's stock */}
      <div ref={ref} onScroll={onScroll} data-stock={s.key} className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-3">
          {turns.length === 0 && !live && <p className="font-mono text-[12px]" style={{ color: "var(--stock-muted)" }}>No turns yet.</p>}
          {turns.map((t) => (
            <TurnView key={t.index} turn={t} raw={raw} />
          ))}
          {live && <LiveTurnView live={live} raw={raw} />}
        </div>
        <LaneReplyBox disabled={busy} onSend={(m) => void sendLane(lane.id, m)} />
      </div>
    </div>
  );
});

function UserBlock({ index, text, scope }: { index: number; text: string; scope: Turn["scope"] }) {
  return (
    <div className="you px-2 py-1.5">
      <div className="who mb-0.5 flex items-center gap-1 font-mono text-[11px] uppercase tracking-[.12em]">
        You · T{index + 1}
        {scope === "lane" && <Tag>lane-only</Tag>}
      </div>
      <div className="whitespace-pre-wrap">{text}</div>
    </div>
  );
}

function Thinking({ text, open }: { text: string; open?: boolean }) {
  return (
    <details className="thinking" open={open}>
      <summary className="cursor-pointer select-none uppercase tracking-[.12em]">Thinking</summary>
      <div className="mt-1 whitespace-pre-wrap">{text}</div>
    </details>
  );
}

function TurnView({ turn, raw }: { turn: Turn; raw: boolean }) {
  const refused = turn.stopReason === "refusal" || turn.stopReason === "content_filter";
  return (
    <article className="flex flex-col gap-1.5">
      <UserBlock index={turn.index} text={turn.userText} scope={turn.scope} />
      {turn.thinking && <Thinking text={turn.thinking} />}
      {turn.assistantText && <Reply text={turn.assistantText} raw={raw} />}
      {refused && (
        <div className="bg-paper">
          <Alert error>
            <Tag variant="error">refused</Tag> stop_reason: {turn.stopReason}
          </Alert>
        </div>
      )}
      {turn.stopReason === "max_tokens" && (
        <div className="bg-paper">
          <Alert>Reply hit max tokens and was cut off.</Alert>
        </div>
      )}
      {turn.error && (
        <div className="bg-paper">
          <Alert error>{turn.error}</Alert>
        </div>
      )}
      {!turn.error && <TurnChip turn={turn} />}
      {turn.artifacts && <ArtifactsRow artifacts={turn.artifacts} />}
    </article>
  );
}

function LiveTurnView({ live, raw }: { live: LiveTurn; raw: boolean }) {
  return (
    <article className="flex flex-col gap-1.5">
      <UserBlock index={live.turnIndex} text={live.userText} scope={live.scope} />
      {live.thinking && <Thinking text={live.thinking} open={!live.text} />}
      <Reply text={live.text} raw={raw} streaming />
    </article>
  );
}

function LaneReplyBox({ disabled, onSend }: { disabled: boolean; onSend: (m: string) => void }) {
  const [text, setText] = useState("");
  const send = () => {
    const m = text.trim();
    if (!m || disabled) return;
    onSend(m);
    setText("");
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  };
  return (
    <div className="sticky bottom-0 flex gap-1 border-t px-3 py-2" style={{ borderColor: "var(--stock-rule)", background: "var(--stock-bg)" }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        disabled={disabled}
        placeholder="Reply to this lane only…"
        aria-label="Lane-only reply"
        className="min-w-0 flex-1 border bg-transparent px-1.5 py-1 font-mono text-[13px] disabled:opacity-35"
        style={{ borderColor: "var(--stock-fg)", color: "var(--stock-fg)" }}
      />
      <button
        type="button"
        disabled={disabled || !text.trim()}
        onClick={send}
        className="border px-1.5 font-mono text-[11px] uppercase tracking-[.12em] disabled:cursor-not-allowed disabled:opacity-35"
        style={{ borderColor: "var(--stock-fg)", color: "var(--stock-fg)" }}
      >
        Send →
      </button>
    </div>
  );
}
