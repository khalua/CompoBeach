import { useEffect, useState } from "react";
import { HistorySidebar } from "./components/HistorySidebar";
import { CompareScreen } from "./screens/CompareScreen";
import { ComposeScreen } from "./screens/ComposeScreen";
import { Styleguide } from "./screens/Styleguide";
import { useSession } from "./store";
import { Alert, Wordmark } from "./ui";

function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return hash;
}

export function App() {
  const hash = useHash();
  const { run, notice, dismissNotice, providers, providersError, loadProviders, loadHistory, closeRun, openRun } = useSession();

  const connected = providers !== null && !providersError;

  // Deep link: wait until the server answers, so a page opened during startup still loads its run.
  useEffect(() => {
    const m = hash.match(/^#\/run\/([\w-]+)$/);
    if (connected && m && useSession.getState().run?.id !== m[1]) void openRun(m[1]);
  }, [hash, openRun, connected]);

  useEffect(() => {
    void loadProviders();
    void loadHistory();
  }, [loadProviders, loadHistory]);

  // `npm run dev` starts the client before the server is listening: keep retrying until it is.
  useEffect(() => {
    if (!providersError) return;
    const t = setInterval(() => {
      void loadProviders();
      void loadHistory();
    }, 1500);
    return () => clearInterval(t);
  }, [providersError, loadProviders, loadHistory]);

  const unconfigured = providers?.filter((p) => !p.configured && p.kind !== "compat") ?? [];

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-[54px] shrink-0 items-center gap-3 border-b border-ink bg-paper px-3">
        <button type="button" onClick={closeRun} aria-label="CompoBeach home">
          <Wordmark size={30} />
        </button>
        <span className="flex-1" />
        {unconfigured.map((p) => (
          <span key={p.id} className="tag border-rule text-graphite">
            {p.problem}
          </span>
        ))}
        <a href={hash === "#/styleguide" ? "#" : "#/styleguide"} className="font-mono text-[11px] uppercase tracking-[.12em] text-cobalt underline">
          {hash === "#/styleguide" ? "App" : "Styleguide"}
        </a>
      </header>

      <div className="flex min-h-0 flex-1">
        {hash !== "#/styleguide" && <HistorySidebar />}
        <main className="frame relative min-h-0 min-w-0 flex-1 overflow-y-auto">
          {(notice || providersError) && (
            <div className="sticky top-0 z-30 p-2">
              <Alert error onDismiss={notice ? dismissNotice : undefined}>
                {notice ?? `Can't reach the local server yet (${providersError}). Retrying… If this persists, check that "npm run dev" is running.`}
              </Alert>
            </div>
          )}
          {hash === "#/styleguide" ? <Styleguide /> : run ? <CompareScreen run={run} /> : <ComposeScreen />}
        </main>
      </div>
    </div>
  );
}
