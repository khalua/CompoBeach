import type { Artifact } from "../../shared/types";
import { useSession } from "../store";

const kb = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

/** Files extracted from a reply. Shared paper chrome; opens on the artifact server in a new tab. */
export function ArtifactsRow({ artifacts }: { artifacts: Artifact[] }) {
  const origin = useSession((s) => s.artifactOrigin);
  if (artifacts.length === 0) return null;
  // url = <turn folder>/<name>, and name may include subfolders.
  const folder = artifacts[0].url.slice(0, artifacts[0].url.length - artifacts[0].name.length);
  const link = "underline decoration-1 underline-offset-2 hover:text-cobalt";
  return (
    <div className="border border-rule bg-paper px-1.5 py-1 font-mono text-[11px] text-ink">
      <div className="mb-0.5 flex items-center justify-between">
        <span className="uppercase tracking-[.12em]">Artifacts · {artifacts.length}</span>
        <a className={link} href={origin + folder} target="_blank" rel="noopener noreferrer">
          folder ↗
        </a>
      </div>
      <ul className="m-0 list-none p-0">
        {artifacts.map((a) => (
          <li key={a.url} className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate" title={a.name}>
              {a.name} <span className="text-graphite">· {kb(a.bytes)}</span>
            </span>
            <a className={link} href={origin + a.url} target="_blank" rel="noopener noreferrer">
              open ↗
            </a>
            <a className={link} href={`${origin}${a.url}?download`} rel="noopener noreferrer">
              download
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
