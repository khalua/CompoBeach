// Primitive components. Each wraps a DESIGN.md §7 spec so screens never restyle them.
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, InputHTMLAttributes } from "react";
import { stock } from "../lib/stocks";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" };

export function Button({ variant = "ghost", className, type = "button", ...rest }: BtnProps) {
  return <button type={type} className={cx("btn", `btn-${variant}`, className)} {...rest} />;
}

export function IconButton({ className, type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cx("btn-icon", className)} {...rest} />;
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-1", className)}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("input", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("input resize-y", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block min-w-0">
      <select className={cx("select", className)} {...rest}>
        {children}
      </select>
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 font-mono text-sm">
        ▾
      </span>
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-1.5 font-mono text-xs disabled:cursor-not-allowed disabled:opacity-35"
    >
      <span className="toggle" aria-checked={checked} />
      {label}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" className="inline-flex border border-ink">
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={cx(
            "px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[.12em] disabled:cursor-not-allowed disabled:opacity-35",
            i > 0 && "border-l border-ink",
            value === o.value ? "bg-ink text-paper" : "hover:bg-ink/10",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type TagVariant = "neutral" | "solid" | "winner" | "error" | "muted";
const TAG: Record<TagVariant, string> = {
  neutral: "text-ink",
  solid: "border-ink bg-ink text-paper",
  winner: "border-ink bg-kr text-ink",
  error: "border-redline text-redline-text",
  muted: "border-rule text-graphite",
};

export function Tag({ variant = "neutral", children, title }: { variant?: TagVariant; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cx("tag whitespace-nowrap leading-none", TAG[variant])}>
      {children}
    </span>
  );
}

export function Alert({ error, children, onDismiss }: { error?: boolean; children: ReactNode; onDismiss?: () => void }) {
  return (
    <div role={error ? "alert" : "status"} className={cx("alert flex items-start justify-between gap-2", error && "alert-err")}>
      <div className="min-w-0">{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="font-mono text-sm" aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

export function Panel({
  title,
  crop,
  className,
  children,
  right,
}: {
  title?: ReactNode;
  crop?: boolean;
  className?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className={cx("panel", crop && "crop", className)}>
      {title && (
        <div className="panel-h flex items-center justify-between gap-2">
          <span>{title}</span>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Meter({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="meter" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SectionIndex({ n, label, right }: { n: string; label: string; right?: ReactNode }) {
  return (
    <div className="sec-h">
      <span className="n">{n}</span>
      <span>{label}</span>
      <span className="rule" />
      {right}
    </div>
  );
}

/** 24×24 lane letter block, filled with the lane's stock. */
export function LaneId({ slot, winner }: { slot: number; winner?: boolean }) {
  const s = stock(slot);
  return (
    <span
      data-stock={winner ? undefined : s.key}
      className={cx("lane-id shrink-0 !text-xs !leading-none", winner && "!bg-kr !text-ink")}
      style={{ fontFamily: "var(--font-mono)" }}
      title={`Lane ${s.letter} · ${s.name}`}
    >
      {s.letter}
    </span>
  );
}

/** Number with its unit in graphite. */
export function Num({ value, unit, className }: { value: string; unit?: string; className?: string }) {
  const na = value === "n/a" || value === "no price";
  return (
    <span className={cx("num", na && "text-graphite", className)}>
      {value}
      {unit && !na && <span className="text-graphite"> {unit}</span>}
    </span>
  );
}

export function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }} aria-label="CompoBeach">
      Compo<span className="slash">/</span>Beach
    </span>
  );
}

export function Spectrum() {
  return (
    <figure className="m-0">
      <div className="spectrum">
        <div className="mk">
          <span>605.78 nm — ref.</span>
        </div>
      </div>
      <div className="ticks" />
      <figcaption className="fig mt-3">
        fig. 06 — visible band 400–700 nm. Accent is pinned to the marked line: it marks the winning lane, and no other
        hue carries meaning.
      </figcaption>
    </figure>
  );
}
