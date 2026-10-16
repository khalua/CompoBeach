import { useEffect, useRef, useState } from "react";
import type { LaneConfig } from "../../shared/types";
import { api } from "../lib/api";
import { fmtTok, fmtUsd } from "../lib/format";
import { stock } from "../lib/stocks";
import { useSession } from "../store";
import { Button, LaneId, Panel, Tag, Textarea } from "../ui";

/** Prompt box with the pre-send estimate per lane. */
export function Composer({
  lanes,
  runId,
  onSend,
  disabled,
  title = "Prompt",
  rows = 5,
  compact,
}: {
  lanes: LaneConfig[];
  runId?: string;
  onSend: (message: string) => void;
  disabled?: boolean;
  title?: string;
  rows?: number;
  /** Tighter layout for the follow-up box under the lanes. */
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const { estimates, setEstimates } = useSession();
  const ctrl = useRef<AbortController | null>(null);
  const lanesKey = JSON.stringify(lanes);

  // Debounced count while typing. Anthropic is exact (count_tokens), others are local estimates.
  useEffect(() => {
    const message = text.trim();
    if (!message || lanes.length === 0) {
      setEstimates([]);
      return;
    }
    const t = setTimeout(() => {
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      api
        .count({ runId, lanes, message }, ctrl.current.signal)
        .then(setEstimates)
        .catch(() => {});
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, runId, lanesKey]);

  const send = () => {
    const m = text.trim();
    if (!m || disabled) return;
    onSend(m);
    setText("");
  };

  return (
    <Panel crop title={compact ? undefined : title} className={compact ? "!px-2 !py-1.5" : undefined}>
      <Textarea
        rows={rows}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Ask something worth comparing…"
        aria-label={title}
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {compact && <span className="label !text-ink">{title}</span>}
        <div className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1 font-mono text-[11px]">
          {text.trim() &&
            lanes.map((l) => {
              const e = estimates[l.id];
              return (
                <span key={l.id} className="num inline-flex items-center gap-1" title={e?.error}>
                  <LaneId slot={l.slot} />
                  {!e ? (
                    <span className="text-graphite">counting…</span>
                  ) : e.tokens == null ? (
                    <Tag variant="muted">n/a</Tag>
                  ) : (
                    <>
                      ~{fmtTok(e.tokens)} <span className="text-graphite">in</span> · {fmtUsd(e.costUsd).startsWith("<") ? "" : "~"}{fmtUsd(e.costUsd)}
                      {!e.exact && <Tag>est.</Tag>}
                    </>
                  )}
                  <span className="sr-only">lane {stock(l.slot).letter}</span>
                </span>
              );
            })}
        </div>
        <span className="font-mono text-[11px] text-graphite">⌘↵ send</span>
        <Button variant="primary" disabled={disabled || !text.trim()} onClick={send}>
          {lanes.length > 1 ? "Send to all lanes" : "Send"}
        </Button>
      </div>
    </Panel>
  );
}
