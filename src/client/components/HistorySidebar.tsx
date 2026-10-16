import { useState } from "react";
import { fmtDate, fmtUsd } from "../lib/format";
import { usePrefs, useSession } from "../store";
import { LaneId } from "../ui";

export function HistorySidebar() {
  const { history, run, openRun, closeRun, deleteRun } = useSession();
  const [confirming, setConfirming] = useState<string | null>(null);
  const open = usePrefs((s) => s.historyOpen);
  const setPrefs = usePrefs((s) => s.set);

  if (!open) {
    return (
      <aside className="flex w-[36px] shrink-0 flex-col items-center border-r border-ink bg-sheet">
        <button
          type="button"
          onClick={() => setPrefs({ historyOpen: true })}
          aria-label="Open history"
          title="Open history"
          className="flex w-full flex-1 flex-col items-center gap-2 py-2 font-mono text-[11px] uppercase tracking-[.14em] hover:bg-ink/5"
        >
          <span aria-hidden>»</span>
          <span style={{ writingMode: "vertical-rl" }}>
            History · <span className="num">{history.length}</span>
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-ink bg-sheet">
      <div className="flex items-center gap-2 border-b border-rule px-2 py-1.5">
        <span className="label flex-1 !text-ink">History</span>
        <button type="button" className="font-mono text-[11px] uppercase tracking-[.12em] hover:underline" onClick={closeRun}>
          + New run
        </button>
        <button
          type="button"
          onClick={() => setPrefs({ historyOpen: false })}
          aria-label="Close history"
          title="Close history"
          className="font-mono text-[13px] leading-none hover:text-cobalt"
        >
          «
        </button>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto">
        {history.length === 0 && <li className="fig p-2">No runs yet. Each comparison is saved here.</li>}
        {history.map((h) => {
          const active = run?.id === h.id;
          return (
            <li key={h.id} className="relative border-b border-rule">
              {active && <span className="absolute inset-y-0 left-0 w-1 bg-kr" aria-hidden />}
              <button type="button" onClick={() => void openRun(h.id)} className="block w-full px-2 py-1.5 pl-3 text-left hover:bg-ink/5" aria-current={active}>
                <span className="line-clamp-2 text-[14px] leading-snug">{h.title}</span>
                <span className="mt-1 flex items-center gap-1">
                  {h.lanes.map((l) => (
                    <LaneId key={l.id} slot={l.slot} />
                  ))}
                  <span className="fig ml-1 truncate">{fmtDate(h.updatedAt)}</span>
                  <span className={`num ml-auto text-[12px] ${h.totalCost == null ? "text-graphite" : ""}`}>{fmtUsd(h.totalCost)}</span>
                </span>
              </button>
              {active && (
                <div className="flex justify-end gap-1 px-2 pb-1.5">
                  {confirming === h.id ? (
                    <>
                      <button type="button" className="font-mono text-[11px] uppercase text-redline-text hover:underline" onClick={() => void deleteRun(h.id).then(() => setConfirming(null))}>
                        Confirm delete
                      </button>
                      <button type="button" className="font-mono text-[11px] uppercase hover:underline" onClick={() => setConfirming(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button type="button" className="font-mono text-[11px] uppercase text-redline-text hover:underline" onClick={() => setConfirming(h.id)}>
                      Delete run
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
