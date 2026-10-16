// Number formatting per DESIGN.md §3. `null` is always "n/a", never 0.

export const NA = "n/a";

export function fmtTok(n: number | null | undefined): string {
  return n == null ? NA : Math.round(n).toLocaleString("en-US");
}

/** Compact form for chips: 3.1k, 12.4k, 1.2M. */
export function fmtTokShort(n: number | null | undefined): string {
  if (n == null) return NA;
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
}

/** $ to 4 decimals under $1, 2 above. A missing price is "no price". */
export function fmtUsd(n: number | null | undefined, missing = "no price"): string {
  if (n == null) return missing;
  const abs = Math.abs(n);
  // Never round a real cost down to something that reads as free.
  if (abs > 0 && abs < 0.0001) return `${n < 0 ? "-" : ""}<$0.0001`;
  return `${n < 0 ? "-" : ""}$${abs < 1 ? abs.toFixed(4) : abs.toFixed(2)}`;
}

export function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return NA;
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
