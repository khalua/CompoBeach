import express from "express";
import { mkdir, readdir, rm, stat, writeFile, readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import type { Artifact, Run, Turn } from "../shared/types";

export const ARTIFACT_DIR = resolve(process.cwd(), "data/artifacts");
export const ARTIFACT_PORT = Number(process.env.ARTIFACT_PORT ?? 8788);

const EXT: Record<string, string> = {
  html: "html", htm: "html", svg: "svg", xml: "xml", css: "css", scss: "scss",
  js: "js", javascript: "js", jsx: "jsx", mjs: "mjs", ts: "ts", typescript: "ts", tsx: "tsx",
  json: "json", jsonc: "json", yaml: "yaml", yml: "yaml", toml: "toml", ini: "ini",
  py: "py", python: "py", rb: "rb", ruby: "rb", go: "go", rs: "rs", rust: "rs", java: "java",
  kt: "kt", kotlin: "kt", swift: "swift", c: "c", cpp: "cpp", "c++": "cpp", h: "h", cs: "cs", csharp: "cs",
  php: "php", sh: "sh", bash: "sh", zsh: "sh", shell: "sh", ps1: "ps1", powershell: "ps1",
  sql: "sql", graphql: "graphql", md: "md", markdown: "md", csv: "csv", dockerfile: "Dockerfile",
  vue: "vue", svelte: "svelte", lua: "lua", r: "r", dart: "dart", scala: "scala", tf: "tf", hcl: "hcl",
};
/** Always worth saving, even when short. */
const ALWAYS = new Set(["html", "svg"]);
/** A block this long with no filename is treated as a whole program, not a snippet. */
const MIN_LINES = 15;

const FILE_TOKEN = /([\w-][\w./-]*\.[A-Za-z0-9]{1,10}|Dockerfile|Makefile)/;

/** Filename from the fence info string: ```html title="index.html"```, ```js:app.js```, ```index.html```. */
function nameFromInfo(info: string): string | null {
  const attr = info.match(/(?:title|file|filename|name|path)\s*=\s*["']?([^"'\s]+)/i);
  if (attr) return attr[1];
  const colon = info.match(/^\S+?:(\S+\.\S+)$/);
  if (colon) return colon[1];
  const bare = info.trim();
  if (!bare.includes(" ") && /\.[A-Za-z0-9]{1,10}$/.test(bare) && FILE_TOKEN.test(bare)) return bare;
  return null;
}

/** Filename from the line just above the fence: "**index.html**", "`styles.css`:", "### app.js". */
function nameFromLine(line: string): string | null {
  const l = line.trim();
  if (!l || l.length > 100) return null;
  const m = l.match(/`([^`]+)`/) ?? l.match(FILE_TOKEN);
  const token = m?.[1]?.trim();
  return token && FILE_TOKEN.test(token) && /\.|Dockerfile|Makefile/.test(token) ? token.split(/\s/)[0] : null;
}

/** Keep names inside the turn folder: no absolute paths, no "..". */
function safeName(name: string): string | null {
  const n = normalize(name.replace(/\\/g, "/")).replace(/^(\.\/|\/)+/, "");
  if (!n || n.startsWith("..") || n.split(sep).includes("..")) return null;
  return n;
}

export interface Extracted {
  name: string;
  lang: string;
  content: string;
}

/** Fenced code blocks that look like files. Snippets stay inline only. */
export function extractArtifacts(text: string): Extracted[] {
  const out: Extracted[] = [];
  const lines = text.split("\n");
  let counter = 0;
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (!open) continue;
    const fence = open[1];
    const info = open[2].trim();
    let j = i + 1;
    while (j < lines.length && !new RegExp(`^\\s{0,3}${fence[0]}{${fence.length},}\\s*$`).test(lines[j])) j++;
    if (j >= lines.length) break; // unterminated (e.g. cut off by max tokens)
    const content = lines.slice(i + 1, j).join("\n");
    const lang = (info.split(/[\s:{]/)[0] || "").toLowerCase();
    const prev = lines.slice(Math.max(0, i - 2), i).reverse().find((l) => l.trim()) ?? "";
    const given = nameFromInfo(info) ?? nameFromLine(prev);
    const ext = EXT[lang] ?? (given ? extname(given).slice(1).toLowerCase() : "");
    const keep = given || ALWAYS.has(ext) || content.split("\n").length >= MIN_LINES;
    if (keep && content.trim()) {
      counter++;
      const fallback = ext === "Dockerfile" ? "Dockerfile" : `artifact-${counter}.${ext || "txt"}`;
      const name = (given && safeName(given)) || fallback;
      out.push({ name, lang: lang || ext || "text", content });
    }
    i = j;
  }
  // Same name twice in one reply: suffix the later ones.
  const seen = new Map<string, number>();
  for (const a of out) {
    const n = seen.get(a.name) ?? 0;
    seen.set(a.name, n + 1);
    if (n > 0) {
      const ext = extname(a.name);
      a.name = `${a.name.slice(0, a.name.length - ext.length)}-${n + 1}${ext}`;
    }
  }
  return out;
}

const turnDir = (runId: string, laneId: string, index: number) => join(ARTIFACT_DIR, runId, laneId, `T${index + 1}`);
const turnUrl = (runId: string, laneId: string, index: number) => `/${runId}/${laneId}/T${index + 1}/`;

/** Write a turn's artifacts to disk and return their descriptors. */
export async function writeTurnArtifacts(runId: string, laneId: string, turn: Turn): Promise<Artifact[]> {
  if (turn.error || !turn.assistantText) return [];
  const files = extractArtifacts(turn.assistantText);
  const dir = turnDir(runId, laneId, turn.index);
  await rm(dir, { recursive: true, force: true });
  if (files.length === 0) return [];
  const out: Artifact[] = [];
  for (const f of files) {
    const path = join(dir, f.name);
    if (!path.startsWith(dir + sep)) continue;
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, f.content);
    out.push({ name: f.name, lang: f.lang, bytes: Buffer.byteLength(f.content), url: turnUrl(runId, laneId, turn.index) + f.name });
  }
  return out;
}

/** Older runs (saved before artifacts existed): extract once, on open. */
export async function backfillArtifacts(run: Run): Promise<boolean> {
  let changed = false;
  for (const [laneId, turns] of Object.entries(run.conversations)) {
    for (const t of turns) {
      if (t.artifacts !== undefined) continue;
      t.artifacts = await writeTurnArtifacts(run.id, laneId, t);
      changed = true;
    }
  }
  return changed;
}

export async function removeArtifacts(runId: string, laneId?: string) {
  if (!/^[\w-]+$/.test(runId) || (laneId && !/^[\w-]+$/.test(laneId))) return;
  await rm(laneId ? join(ARTIFACT_DIR, runId, laneId) : join(ARTIFACT_DIR, runId), { recursive: true, force: true });
}

export async function readArtifact(url: string): Promise<string | null> {
  const path = resolve(ARTIFACT_DIR, "." + normalize(url));
  if (!path.startsWith(ARTIFACT_DIR + sep)) return null;
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Artifact server: a separate origin so model-written pages can't call /api.
// ---------------------------------------------------------------------------

/** Served as-is; everything else is shown as plain text in the tab. */
const WEB = new Set([".html", ".htm", ".css", ".js", ".mjs", ".json", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".txt", ".xml", ".wasm"]);

const CSP = [
  "default-src 'self' data: blob: https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  // No http: here — blocks requests back to the app on localhost:8787.
  "connect-src 'self' https: wss:",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function startArtifactServer() {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", CSP);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (req.query.download !== undefined) res.setHeader("Content-Disposition", "attachment");
    next();
  });
  app.use(
    express.static(ARTIFACT_DIR, {
      index: ["index.html"],
      dotfiles: "deny",
      setHeaders(res, path) {
        if (!WEB.has(extname(path).toLowerCase())) res.setHeader("Content-Type", "text/plain; charset=utf-8");
      },
    }),
  );
  // Folder listing when there's no index.html.
  app.use(async (req, res) => {
    const dir = resolve(ARTIFACT_DIR, "." + normalize(decodeURIComponent(req.path)));
    if (!dir.startsWith(ARTIFACT_DIR)) return void res.status(404).end();
    try {
      if (!(await stat(dir)).isDirectory()) return void res.status(404).end();
      const entries = await readdir(dir, { withFileTypes: true });
      const base = req.path.endsWith("/") ? req.path : req.path + "/";
      const items = entries
        .map((e) => `<li><a href="${esc(base + e.name)}${e.isDirectory() ? "/" : ""}">${esc(e.name)}${e.isDirectory() ? "/" : ""}</a></li>`)
        .join("");
      res.type("html").send(
        `<!doctype html><meta charset="utf-8"><title>${esc(base)}</title>` +
          `<body style="background:#ece6d8;color:#14110d;font:13px/1.8 'IBM Plex Mono',ui-monospace,monospace;padding:24px">` +
          `<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase">artifacts · ${esc(base)}</div><ul>${items}</ul>`,
      );
    } catch {
      res.status(404).end();
    }
  });
  app.listen(ARTIFACT_PORT, () => console.log(`[compobeach] artifacts on http://localhost:${ARTIFACT_PORT}`));
}
