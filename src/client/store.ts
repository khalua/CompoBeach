import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CompareRequest,
  ContextFile,
  CountResult,
  LaneConfig,
  ProviderInfo,
  Run,
  RunSummary,
  StreamEvent,
  TurnScope,
} from "../shared/types";
import { api, streamCompare } from "./lib/api";
import { fmtTok } from "./lib/format";
import { MAX_LANES, newId, nextFreeSlot, stock } from "./lib/stocks";

// ---------------------------------------------------------------------------
// Preferences: persisted to localStorage (last-used lanes, presets, view)
// ---------------------------------------------------------------------------

export type ViewMode = "rendered" | "raw" | "diff";

export const defaultMaxTokens = (providerId: string) => (providerId === "anthropic" ? 64000 : 16000);

export function defaultLane(slot = 0): LaneConfig {
  return {
    id: newId(),
    slot,
    providerId: "anthropic",
    model: "claude-opus-5-5",
    thinkingDisplay: "summarized",
    maxTokens: defaultMaxTokens("anthropic"),
    caching: true,
  };
}

interface Preset {
  name: string;
  lanes: LaneConfig[];
}

interface Prefs {
  lanes: LaneConfig[];
  presets: Preset[];
  recentContexts: ContextFile[];
  view: ViewMode;
  syncScroll: boolean;
  diffPair: [number, number];
  eventsOpen: boolean;
  historyOpen: boolean;

  setLane: (id: string, patch: Partial<LaneConfig>) => void;
  addLane: () => void;
  duplicateLane: (id: string) => void;
  removeLane: (id: string) => void;
  resetDefaults: () => void;
  savePreset: (name: string) => void;
  loadPreset: (name: string) => void;
  deletePreset: (name: string) => void;
  rememberContext: (f: ContextFile) => void;
  set: (patch: Partial<Pick<Prefs, "view" | "syncScroll" | "diffPair" | "eventsOpen" | "historyOpen" | "lanes">>) => void;
}

export const usePrefs = create<Prefs>()(
  persist(
    (set, get) => ({
      lanes: [defaultLane(0)],
      presets: [],
      recentContexts: [],
      view: "rendered",
      syncScroll: true,
      diffPair: [0, 1],
      eventsOpen: false,
      historyOpen: true,

      setLane: (id, patch) => set({ lanes: get().lanes.map((l) => (l.id === id ? { ...l, ...patch } : l)) }),
      addLane: () => {
        const { lanes } = get();
        const slot = nextFreeSlot(lanes.map((l) => l.slot));
        if (slot < 0) return;
        const last = lanes[lanes.length - 1];
        set({ lanes: [...lanes, last ? { ...last, id: newId(), slot } : defaultLane(slot)] });
      },
      duplicateLane: (id) => {
        const { lanes } = get();
        const src = lanes.find((l) => l.id === id);
        const slot = nextFreeSlot(lanes.map((l) => l.slot));
        if (!src || slot < 0) return;
        set({ lanes: [...lanes, { ...src, id: newId(), slot }] });
      },
      removeLane: (id) => {
        const lanes = get().lanes.filter((l) => l.id !== id);
        set({ lanes: lanes.length ? lanes : [defaultLane(0)] });
      },
      resetDefaults: () =>
        set({ lanes: [defaultLane(0)], view: "rendered", syncScroll: true, diffPair: [0, 1], eventsOpen: false }),
      savePreset: (name) => {
        const presets = get().presets.filter((p) => p.name !== name);
        set({ presets: [...presets, { name, lanes: get().lanes }] });
      },
      loadPreset: (name) => {
        const p = get().presets.find((x) => x.name === name);
        if (p) set({ lanes: p.lanes.map((l) => ({ ...l, id: newId() })) });
      },
      deletePreset: (name) => set({ presets: get().presets.filter((p) => p.name !== name) }),
      rememberContext: (f) => {
        const rest = get().recentContexts.filter((c) => c.name !== f.name);
        set({ recentContexts: [f, ...rest].slice(0, 8) });
      },
      set: (patch) => set(patch),
    }),
    { name: "compobeach.prefs", version: 1 },
  ),
);

// ---------------------------------------------------------------------------
// Session: providers, the open run, live streams, history, event log
// ---------------------------------------------------------------------------

export interface LiveTurn {
  turnIndex: number;
  userText: string;
  scope: TurnScope;
  text: string;
  thinking: string;
  replay?: { of: number; total: number };
}

export interface LogLine {
  key: string; // "a/2"
  name: string;
  value: string;
  error?: boolean;
}

interface Session {
  artifactOrigin: string;
  providers: ProviderInfo[] | null;
  providersError: string | null;
  run: Run | null;
  live: Record<string, LiveTurn | undefined>;
  history: RunSummary[];
  log: LogLine[];
  notice: string | null;
  estimates: Record<string, CountResult>;
  /** Lane slot staged in the empty frame (incremental flow). */
  pending: LaneConfig | null;

  loadProviders: () => Promise<void>;
  loadHistory: () => Promise<void>;
  openRun: (id: string) => Promise<void>;
  closeRun: () => void;
  deleteRun: (id: string) => Promise<void>;
  sendNew: (message: string) => Promise<void>;
  sendShared: (message: string) => Promise<void>;
  sendLane: (laneId: string, message: string) => Promise<void>;
  addLaneToRun: (lane: LaneConfig) => Promise<void>;
  removeRunLane: (laneId: string) => Promise<void>;
  updateRunLane: (laneId: string, patch: Partial<LaneConfig>) => void;
  setEstimates: (r: CountResult[]) => void;
  setPending: (l: LaneConfig | null) => void;
  cancelAll: () => void;
  dismissNotice: () => void;
}

const controllers = new Set<AbortController>();

/** Keep the URL at #/run/<id> (bookmarkable, survives refresh) without a navigation. */
export function setRunHash(id: string | null) {
  const next = id ? `#/run/${id}` : location.pathname + location.search;
  if (id ? location.hash === next : !location.hash) return;
  history.replaceState(null, "", next);
  dispatchEvent(new HashChangeEvent("hashchange"));
}

export const isBusy = (s: Pick<Session, "live">) => Object.values(s.live).some(Boolean);

export const useSession = create<Session>()((set, get) => {
  const laneKey = (laneId: string, turnIndex: number) => {
    const lane = get().run?.lanes.find((l) => l.id === laneId);
    return `${lane ? stock(lane.slot).key : "?"}/${turnIndex + 1}`;
  };
  const log = (line: LogLine) => set({ log: [...get().log, line].slice(-400) });

  function onEvent(e: StreamEvent) {
    switch (e.type) {
      case "run": {
        const prev = get().run;
        set({ run: e.run });
        if (!prev || prev.id !== e.run.id) {
          set({ log: [] });
          setRunHash(e.run.id);
        }
        break;
      }
      case "turn_start": {
        set({
          live: {
            ...get().live,
            [e.laneId]: { turnIndex: e.turnIndex, userText: e.userText, scope: e.scope, text: "", thinking: "", replay: e.replay },
          },
        });
        log({ key: laneKey(e.laneId, e.turnIndex), name: e.replay ? `replay ${e.replay.of}/${e.replay.total}` : "turn_start", value: e.scope });
        break;
      }
      case "delta":
      case "thinking": {
        const cur = get().live[e.laneId];
        if (!cur) break;
        const first = !cur.text && !cur.thinking;
        const next = e.type === "delta" ? { ...cur, text: cur.text + e.text } : { ...cur, thinking: cur.thinking + e.text };
        set({ live: { ...get().live, [e.laneId]: next } });
        if (first) log({ key: laneKey(e.laneId, e.turnIndex), name: e.type === "delta" ? "first token" : "thinking", value: "streaming" });
        break;
      }
      case "turn_done": {
        const run = get().run;
        if (run) {
          const conv = [...(run.conversations[e.laneId] ?? [])];
          conv[e.turnIndex] = e.turn;
          set({ run: { ...run, conversations: { ...run.conversations, [e.laneId]: conv } } });
        }
        set({ live: { ...get().live, [e.laneId]: undefined } });
        const k = laneKey(e.laneId, e.turnIndex);
        const t = e.turn;
        if (t.error) log({ key: k, name: "error", value: t.error, error: true });
        else {
          log({ key: k, name: `delta → ${fmtTok(t.usage.output)} tok`, value: "done" });
          log({ key: k, name: "stop_reason", value: t.stopReason ?? "n/a", error: t.stopReason === "refusal" });
          log({ key: k, name: "usage · cache_read", value: fmtTok(t.usage.cacheRead) });
          if (t.artifacts?.length) log({ key: k, name: "artifacts", value: t.artifacts.map((a) => a.name).join(", ") });
        }
        break;
      }
      case "error":
        if (e.laneId) log({ key: laneKey(e.laneId, e.turnIndex ?? 0), name: "error", value: e.message, error: true });
        else set({ notice: e.message });
        break;
      case "run_saved":
        void get().loadHistory();
        break;
    }
  }

  async function compare(body: CompareRequest) {
    const ctrl = new AbortController();
    controllers.add(ctrl);
    try {
      await streamCompare(body, onEvent, ctrl.signal);
    } catch (err) {
      if (!ctrl.signal.aborted) set({ notice: (err as Error).message });
    } finally {
      controllers.delete(ctrl);
      // Clear any lane left mid-stream (e.g. connection dropped).
      if (controllers.size === 0) set({ live: {} });
    }
  }

  const estimatesFor = (laneIds: string[]) => {
    const out: Record<string, { tokens: number; exact: boolean }> = {};
    for (const id of laneIds) {
      const e = get().estimates[id];
      if (e?.tokens != null) out[id] = { tokens: e.tokens, exact: e.exact };
    }
    return out;
  };

  return {
    artifactOrigin: `http://${location.hostname}:8788`,
    providers: null,
    providersError: null,
    run: null,
    live: {},
    history: [],
    log: [],
    notice: null,
    estimates: {},
    pending: null,

    loadProviders: async () => {
      api.config().then((c) => set({ artifactOrigin: c.artifactOrigin })).catch(() => {});
      try {
        set({ providers: await api.providers(), providersError: null });
      } catch (err) {
        set({ providersError: (err as Error).message });
      }
    },
    loadHistory: async () => {
      try {
        set({ history: await api.runs() });
      } catch {
        /* server down: keep the old list */
      }
    },
    openRun: async (id) => {
      get().cancelAll();
      try {
        const run = await api.run(id);
        set({ run, live: {}, log: [], pending: null, estimates: {} });
        setRunHash(run.id);
      } catch (err) {
        set({ notice: (err as Error).message });
      }
    },
    closeRun: () => {
      get().cancelAll();
      set({ run: null, live: {}, log: [], pending: null, estimates: {} });
      if (location.hash.startsWith("#/run/")) setRunHash(null);
    },
    deleteRun: async (id) => {
      await api.deleteRun(id);
      if (get().run?.id === id) get().closeRun();
      await get().loadHistory();
    },
    sendNew: async (message) => {
      const lanes = usePrefs.getState().lanes;
      set({ run: null, live: {}, log: [], pending: null });
      await compare({ lanes, message, scope: "shared", estimates: estimatesFor(lanes.map((l) => l.id)) });
    },
    sendShared: async (message) => {
      const run = get().run;
      if (!run) return get().sendNew(message);
      await compare({
        runId: run.id,
        lanes: run.lanes,
        message,
        scope: "shared",
        estimates: estimatesFor(run.lanes.map((l) => l.id)),
      });
    },
    sendLane: async (laneId, message) => {
      const run = get().run;
      if (!run) return;
      await compare({ runId: run.id, lanes: run.lanes, message, scope: "lane", targetLaneIds: [laneId] });
    },
    addLaneToRun: async (lane) => {
      const run = get().run;
      if (!run || run.lanes.length >= MAX_LANES) return;
      set({ pending: null });
      await compare({ runId: run.id, addLane: lane });
    },
    removeRunLane: async (laneId) => {
      const run = get().run;
      if (!run || get().live[laneId]) return;
      try {
        set({ run: await api.removeLane(run.id, laneId) });
        await get().loadHistory();
      } catch (err) {
        set({ notice: (err as Error).message });
      }
    },
    updateRunLane: (laneId, patch) => {
      const run = get().run;
      if (!run) return;
      set({ run: { ...run, lanes: run.lanes.map((l) => (l.id === laneId ? { ...l, ...patch } : l)) } });
    },
    setEstimates: (r) => set({ estimates: Object.fromEntries(r.map((x) => [x.laneId, x])) }),
    setPending: (l) => set({ pending: l }),
    cancelAll: () => {
      for (const c of controllers) c.abort();
      controllers.clear();
      set({ live: {} });
    },
    dismissNotice: () => set({ notice: null }),
  };
});
