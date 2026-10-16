import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { laneTotals } from "../../shared/cost";
import type { Artifact, LaneConfig, Run, Turn } from "../../shared/types";
import { api } from "../lib/api";
import { Composer } from "../components/Composer";
import { EventLog } from "../components/EventLog";
import { LaneColumn } from "../components/LaneColumn";
import { LaneConfigCard } from "../components/LaneConfigCard";
import { fmtMs, fmtTok, fmtUsd } from "../lib/format";
import { MAX_LANES, newId, nextFreeSlot, stock } from "../lib/stocks";
import { isBusy, usePrefs, useSession, type ViewMode } from "../store";
import { Button, LaneId, Panel, SectionIndex, Segmented, Select, Toggle } from "../ui";

const DiffView = lazy(() => import("../components/DiffView"));
// Tiny and dependency-free, so it doesn't drag Monaco into the main chunk.
const LANG_EXT: Record<string, string> = {
  html: "html", htm: "html", svg: "xml", xml: "xml", css: "css", scss: "scss", js: "javascript", mjs: "javascript",
  jsx: "javascript", ts: "typescript", tsx: "typescript", json: "json", py: "python", md: "markdown", yaml: "yaml",
  yml: "yaml", sh: "shell", sql: "sql", go: "go", rs: "rust", java: "java", cs: "csharp", cpp: "cpp", c: "c", rb: "ruby", php: "php",
};
const languageFor = (name: string) => LANG_EXT[name.split(".").pop()?.toLowerCase() ?? ""] ?? "plaintext";

export function CompareScreen({ run }: { run: Run }) {
  const session = useSession();
  const prefs = usePrefs();
  const busy = isBusy(session);
  const lanes = [...run.lanes].sort((a, b) => a.slot - b.slot);
  const view: ViewMode = prefs.view === "diff" && lanes.length < 2 ? "rendered" : prefs.view;

  // ---- synced scroll ----
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const syncing = useRef(false);
  const onScroll = (id: string) => {
    if (!prefs.syncScroll || syncing.current) return;
    const src = refs.current[id];
    if (!src) return;
    const ratio = src.scrollTop / Math.max(1, src.scrollHeight - src.clientHeight);
    syncing.current = true;
    for (const [k, el] of Object.entries(refs.current)) {
      if (k !== id && el) el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
    }
    requestAnimationFrame(() => (syncing.current = false));
  };

  // Follow streaming output in each lane when the user is already at the bottom.
  useEffect(() => {
    for (const [id, el] of Object.entries(refs.current)) {
      if (el && session.live[id] && el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight;
    }
  }, [session.live]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 px-3 py-3">
      <SectionIndex
        n="03"
        label="Compare"
        right={
          <span className="flex items-center gap-2 normal-case tracking-normal">
            <Toggle checked={prefs.syncScroll} onChange={(v) => prefs.set({ syncScroll: v })} label="Synced scroll" />
            <Segmented<ViewMode>
              value={view}
              onChange={(v) => prefs.set({ view: v })}
              options={[
                { value: "rendered", label: "Rendered" },
                { value: "raw", label: "Raw" },
                { value: "diff", label: "Diff", disabled: lanes.length < 2 },
              ]}
            />
            {busy && <Button onClick={session.cancelAll}>Stop</Button>}
          </span>
        }
      />
      <h2 className="m-0 truncate text-[20px] font-medium leading-tight" title={run.title}>
        {run.title}
      </h2>

      <SummaryRow run={run} lanes={lanes} />

      <div className="flex min-h-0 flex-1 border border-ink bg-sheet">
        {view === "diff" ? (
          <DiffPane run={run} lanes={lanes} />
        ) : (
          <>
            {lanes.map((lane) => (
              <LaneColumn
                key={lane.id}
                ref={(el) => {
                  refs.current[lane.id] = el;
                }}
                lane={lane}
                turns={run.conversations[lane.id] ?? []}
                live={session.live[lane.id]}
                raw={view === "raw"}
                onScroll={() => onScroll(lane.id)}
                canRemove={lanes.length > 1}
              />
            ))}
            {lanes.length < MAX_LANES && <EmptyFrame run={run} lanes={lanes} expanded={lanes.length === 1} />}
          </>
        )}
      </div>

      <Composer lanes={lanes} runId={run.id} onSend={(m) => void session.sendShared(m)} disabled={busy} title="Follow-up · all lanes" rows={2} compact />

      <details open={prefs.eventsOpen} onToggle={(e) => prefs.set({ eventsOpen: (e.target as HTMLDetailsElement).open })} className="border border-ink bg-sheet">
        <summary className="label cursor-pointer select-none px-2 py-1 !text-ink">Events</summary>
        <div className="border-t border-rule px-2 py-1.5">
          <EventLog lines={session.log} />
        </div>
      </details>
    </div>
  );
}

function SummaryRow({ run, lanes }: { run: Run; lanes: LaneConfig[] }) {
  // Only shared turns are like-for-like: lane-only detours would skew the winners.
  const totals = lanes.map((l) => ({
    lane: l,
    t: laneTotals((run.conversations[l.id] ?? []).filter((t) => t.scope === "shared" && !t.error)),
  }));
  const best = (pick: (t: (typeof totals)[number]["t"]) => number | null) => {
    let win: (typeof totals)[number] | null = null;
    for (const x of totals) {
      const v = pick(x.t);
      if (v == null) continue;
      if (!win || v < pick(win.t)!) win = x;
    }
    return win ? { lane: win.lane, value: pick(win.t)! } : null;
  };
  const slots = [
    { label: "Cheapest", win: best((t) => t.cost), fmt: (v: number) => fmtUsd(v) },
    { label: "Fastest", win: best((t) => t.totalMs), fmt: (v: number) => fmtMs(v) },
    { label: "Fewest out", win: best((t) => t.output), fmt: (v: number) => `${fmtTok(v)}` },
  ];
  const comparable = lanes.length > 1;
  return (
    <Panel crop className="!py-2">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center divide-x divide-rule">
        {slots.map((s) => (
          <div key={s.label} className="flex items-center gap-2 px-3 first:pl-0">
            <span className="label">{s.label}</span>
            {s.win ? (
              <>
                <LaneId slot={s.win.lane.slot} winner={comparable} />
                <span className="num font-sans text-[40px] leading-none font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--font-sans)" }}>
                  {s.fmt(s.win.value)}
                </span>
                {s.label === "Fewest out" && <span className="font-mono text-[11px] text-graphite">tok</span>}
              </>
            ) : (
              <span className="num text-graphite">n/a</span>
            )}
          </div>
        ))}
        <span className="fig px-3">shared turns only</span>
      </div>
    </Panel>
  );
}

/** The incremental flow: pick a model here and the run's shared prompts replay against it. */
function EmptyFrame({ run, lanes, expanded: startExpanded }: { run: Run; lanes: LaneConfig[]; expanded: boolean }) {
  const { providers, pending, setPending, addLaneToRun } = useSession();
  const [expanded, setExpanded] = useState(startExpanded);
  useEffect(() => setExpanded(startExpanded), [startExpanded, run.id]);

  const slot = nextFreeSlot(lanes.map((l) => l.slot));
  const draft = useMemo<LaneConfig>(() => {
    if (pending && pending.slot === slot) return pending;
    const last = lanes[lanes.length - 1];
    return { ...last, id: newId(), slot, contextFile: last?.contextFile };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, slot, lanes.length]);

  const shared = Math.max(0, ...lanes.map((l) => (run.conversations[l.id] ?? []).filter((t) => t.scope === "shared").length));

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-[48px] shrink-0 items-center justify-center border-l border-dashed border-ink font-mono text-[11px] uppercase tracking-[.14em] hover:bg-ink/5"
        style={{ writingMode: "vertical-rl" }}
      >
        + Add lane {stock(slot).letter}
      </button>
    );
  }

  return (
    <div className="flex min-h-0 w-full max-w-[520px] min-w-[340px] flex-1 flex-col overflow-y-auto border-l border-dashed border-ink bg-paper p-3">
      <LaneConfigCard
        lane={draft}
        providers={providers}
        onChange={(patch) => setPending({ ...draft, ...patch })}
        actions={
          lanes.length > 1 ? (
            <button type="button" className="font-mono text-sm" aria-label="Collapse" onClick={() => setExpanded(false)}>
              ×
            </button>
          ) : undefined
        }
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="fig">
          Replays {shared} shared {shared === 1 ? "prompt" : "prompts"} in order. Lane-only turns are skipped.
        </span>
        <Button disabled={!draft.model || shared === 0} onClick={() => void addLaneToRun(draft)}>
          Run lane {stock(slot).letter}
        </Button>
      </div>
    </div>
  );
}

const replyText = (turns: Turn[]) =>
  turns
    .map((t) => `## T${t.index + 1}${t.scope === "lane" ? " (lane-only)" : ""}\n\n${t.error ? `[error] ${t.error}` : t.assistantText}`)
    .join("\n\n");

/** Latest artifact per filename in a lane (a later turn's index.html replaces an earlier one). */
function latestArtifacts(turns: Turn[]): Map<string, Artifact> {
  const m = new Map<string, Artifact>();
  for (const t of turns) for (const a of t.artifacts ?? []) m.set(a.name, a);
  return m;
}

const REPLY = "";

function DiffPane({ run, lanes }: { run: Run; lanes: LaneConfig[] }) {
  const prefs = usePrefs();
  const [a, b] = prefs.diffPair;
  const left = lanes.find((l) => l.slot === a) ?? lanes[0];
  const right = lanes.find((l) => l.slot === b && l.id !== left.id) ?? lanes.find((l) => l.id !== left.id)!;
  const pick = (side: 0 | 1, slot: number) => {
    const next: [number, number] = [left.slot, right.slot];
    next[side] = slot;
    prefs.set({ diffPair: next });
  };

  // Source: the reply text, or an artifact filename both lanes produced.
  const [source, setSource] = useState(REPLY);
  const leftFiles = latestArtifacts(run.conversations[left.id] ?? []);
  const rightFiles = latestArtifacts(run.conversations[right.id] ?? []);
  const shared = [...leftFiles.keys()].filter((n) => rightFiles.has(n)).sort();
  const file = shared.includes(source) ? source : REPLY;
  const [texts, setTexts] = useState<{ key: string; left: string; right: string } | null>(null);
  const key = `${left.id}|${right.id}|${file}|${leftFiles.get(file)?.url}|${rightFiles.get(file)?.url}`;

  useEffect(() => {
    if (file === REPLY) return;
    let live = true;
    Promise.all([api.artifactText(leftFiles.get(file)!.url), api.artifactText(rightFiles.get(file)!.url)])
      .then(([l, r]) => live && setTexts({ key, left: l, right: r }))
      .catch(() => live && setTexts({ key, left: "[could not read artifact]", right: "[could not read artifact]" }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loading = file !== REPLY && texts?.key !== key;
  const original = file === REPLY ? replyText(run.conversations[left.id] ?? []) : loading ? "" : texts!.left;
  const modified = file === REPLY ? replyText(run.conversations[right.id] ?? []) : loading ? "" : texts!.right;

  const opts = lanes.map((l) => (
    <option key={l.id} value={l.slot}>
      {stock(l.slot).letter} · {l.model}
    </option>
  ));
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2">
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
        <Select aria-label="Left lane" value={left.slot} onChange={(e) => pick(0, Number(e.target.value))}>
          {opts}
        </Select>
        <Select aria-label="Compare" value={file} onChange={(e) => setSource(e.target.value)}>
          <option value={REPLY}>reply text</option>
          {shared.map((n) => (
            <option key={n} value={n}>
              artifact: {n}
            </option>
          ))}
        </Select>
        <Select aria-label="Right lane" value={right.slot} onChange={(e) => pick(1, Number(e.target.value))}>
          {opts}
        </Select>
      </div>
      <div className="min-h-0 flex-1">
        <Suspense fallback={<p className="fig p-2">Loading diff…</p>}>
          {/* Stays mounted while artifacts load; remounting Monaco's diff editor is slow and error-prone. */}
          <DiffView original={original} modified={modified} language={file === REPLY ? "markdown" : languageFor(file)} />
        </Suspense>
      </div>
      <p className="fig">
        fig. 03 — {stock(left.slot).letter} ⇄ {stock(right.slot).letter}
        {file === REPLY ? "" : ` · ${file}`}
        {loading ? " · reading artifacts…" : ""}. Removed text in red, added in cobalt.
        {shared.length === 0 && " No artifact filenames in common yet."}
      </p>
    </div>
  );
}
