import { useState } from "react";
import { laneTotals } from "../../shared/cost";
import type { Turn } from "../../shared/types";
import { fmtMs, fmtTok, fmtTokShort, fmtUsd, NA } from "../lib/format";
import { Num } from "../ui";

const actualInput = (t: Turn) => {
  const u = t.usage;
  if (u.inputUncached == null && u.cacheRead == null && u.cacheWrite == null) return null;
  return (u.inputUncached ?? 0) + (u.cacheRead ?? 0) + (u.cacheWrite ?? 0);
};

/** Per-turn chip: one mono line, expands to the full breakdown. Sits on paper chrome, not the stock. */
export function TurnChip({ turn }: { turn: Turn }) {
  const [open, setOpen] = useState(false);
  const u = turn.usage;
  const c = turn.cost;
  const cached = u.cacheRead == null && u.cacheWrite == null ? null : (u.cacheRead ?? 0) + (u.cacheWrite ?? 0);

  return (
    <div className="border border-rule bg-paper font-mono text-[11px] text-ink">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="num flex w-full flex-wrap items-center gap-x-1 px-1.5 py-1 text-left hover:bg-ink/5"
      >
        <span>in {fmtTokShort(u.inputUncached)}</span>·<span>cached {fmtTokShort(cached)}</span>·
        <span>out {fmtTokShort(u.output)}</span>·<span className={c ? "" : "text-graphite"}>{fmtUsd(c?.total)}</span>·
        <span>{fmtMs(turn.totalMs)}</span>
        <span className="ml-auto text-graphite">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <table className="dtable border-t border-rule">
          <thead>
            <tr>
              <th>Field</th>
              <th className="r">Tokens</th>
              <th className="r">$</th>
            </tr>
          </thead>
          <tbody>
            <Row label="new input" tok={u.inputUncached} usd={c?.input} />
            <Row label="cache write" tok={u.cacheWrite} usd={c?.cacheWrite} />
            <Row label="cache read" tok={u.cacheRead} usd={c?.cacheRead} />
            <Row label="output" tok={u.output} usd={c?.output} />
            <Row label="· reasoning" tok={u.reasoning} />
            <tr>
              <td>est. vs actual in</td>
              <td className="r" colSpan={2}>
                <Num value={u.estimatedPreSend == null ? NA : `${u.estimateExact ? "" : "~"}${fmtTok(u.estimatedPreSend)}`} />
                {" / "}
                <Num value={fmtTok(actualInput(turn))} />
              </td>
            </tr>
            <tr>
              <td>saved by cache</td>
              <td className="r" colSpan={2}>
                <span className="num underline decoration-kr decoration-2 underline-offset-4">{fmtUsd(c?.savedByCache)}</span>
              </td>
            </tr>
            <tr>
              <td>ttft / total</td>
              <td className="r" colSpan={2}>
                <span className="num">
                  {fmtMs(turn.ttftMs)} / {fmtMs(turn.totalMs)}
                </span>
              </td>
            </tr>
            {turn.modelReported && (
              <tr>
                <td>model</td>
                <td className="r" colSpan={2}>
                  {turn.modelReported}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Row({ label, tok, usd }: { label: string; tok: number | null; usd?: number }) {
  return (
    <tr>
      <td>{label}</td>
      <td className="r">
        <Num value={fmtTok(tok)} />
      </td>
      <td className="r">
        <Num value={usd == null ? NA : fmtUsd(usd)} />
      </td>
    </tr>
  );
}

/** Sticky session totals under the lane header; hover shows the per-turn table. */
export function TotalsStrip({ turns }: { turns: Turn[] }) {
  const t = laneTotals(turns);
  const cached = t.cacheRead == null && t.cacheWrite == null ? null : (t.cacheRead ?? 0) + (t.cacheWrite ?? 0);
  return (
    <div className="group relative border-y border-ink bg-paper px-2 py-1 font-mono text-[11px] uppercase tracking-[.08em]">
      <div className="num flex flex-wrap gap-x-1">
        <span>IN {fmtTok(t.inputUncached)}</span>·<span>CACHED {fmtTok(cached)}</span>·<span>OUT {fmtTok(t.output)}</span>·
        <span className={t.cost == null ? "text-graphite" : ""}>{fmtUsd(t.cost)}</span>·
        <span>
          {t.turns} {t.turns === 1 ? "TURN" : "TURNS"}
        </span>
      </div>
      {turns.length > 0 && (
        <div className="invisible absolute top-full right-0 left-0 z-20 border border-ink bg-sheet p-2 normal-case tracking-normal group-hover:visible">
          <table className="dtable">
            <thead>
              <tr>
                <th>Turn</th>
                <th className="r">In</th>
                <th className="r">Cached</th>
                <th className="r">Out</th>
                <th className="r">$</th>
              </tr>
            </thead>
            <tbody>
              {turns.map((x) => (
                <tr key={x.index}>
                  <td>
                    T{x.index + 1}
                    {x.scope === "lane" ? " · lane" : ""}
                  </td>
                  <td className="r">{fmtTok(x.usage.inputUncached)}</td>
                  <td className="r">
                    {x.usage.cacheRead == null && x.usage.cacheWrite == null
                      ? NA
                      : fmtTok((x.usage.cacheRead ?? 0) + (x.usage.cacheWrite ?? 0))}
                  </td>
                  <td className="r">{fmtTok(x.usage.output)}</td>
                  <td className="r">{fmtUsd(x.cost?.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {t.savedByCache != null && (
            <div className="fig mt-1.5 text-right">saved by cache {fmtUsd(t.savedByCache)}</div>
          )}
        </div>
      )}
    </div>
  );
}
