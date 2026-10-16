import type {
  AppConfig,
  CompareRequest,
  CountRequest,
  CountResult,
  ProviderInfo,
  Run,
  RunSummary,
  StreamEvent,
} from "../../shared/types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()) || res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  config: () => fetch("/api/config").then((r) => json<AppConfig>(r)),
  artifactText: (url: string) =>
    fetch(`/api/artifact?url=${encodeURIComponent(url)}`).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status}`)))),
  providers: () => fetch("/api/providers").then((r) => json<ProviderInfo[]>(r)),
  runs: () => fetch("/api/runs").then((r) => json<RunSummary[]>(r)),
  run: (id: string) => fetch(`/api/runs/${id}`).then((r) => json<Run>(r)),
  deleteRun: (id: string) => fetch(`/api/runs/${id}`, { method: "DELETE" }),
  removeLane: (id: string, laneId: string) =>
    fetch(`/api/runs/${id}/lanes/${laneId}`, { method: "DELETE" }).then((r) => json<Run>(r)),
  count: (body: CountRequest, signal?: AbortSignal) =>
    fetch("/api/count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    }).then((r) => json<CountResult[]>(r)),
};

/** POST /api/compare and feed each NDJSON event to `onEvent`. */
export async function streamCompare(
  body: CompareRequest,
  onEvent: (e: StreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`${res.status}: ${await res.text()}`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) onEvent(JSON.parse(line) as StreamEvent);
    }
  }
  if (buf.trim()) onEvent(JSON.parse(buf) as StreamEvent);
}
