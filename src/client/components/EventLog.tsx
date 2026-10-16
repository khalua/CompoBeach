import type { LogLine } from "../store";

const WIDTH = 28;

export function EventLog({ lines }: { lines: LogLine[] }) {
  if (lines.length === 0) return <p className="fig">No events yet.</p>;
  return (
    <pre className="evlog max-h-[220px] overflow-y-auto">
      {lines.map((l, i) => (
        <div key={i}>
          <span className="k">{l.key}</span> {l.name} {".".repeat(Math.max(3, WIDTH - l.name.length))}{" "}
          <span className={l.error ? "er" : "v"}>{l.value}</span>
        </div>
      ))}
    </pre>
  );
}
