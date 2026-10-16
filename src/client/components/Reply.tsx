import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Assistant reply on the lane's stock. Styling lives in .reply (app.css) and uses only var(--stock-*). */
export const Reply = memo(function Reply({ text, raw, streaming }: { text: string; raw: boolean; streaming?: boolean }) {
  if (raw) return <pre className={`raw ${streaming ? "cursor" : ""}`}>{text}</pre>;
  return (
    <div className={`reply ${streaming ? "streaming" : ""}`}>
      <Markdown remarkPlugins={[remarkGfm]}>{text || (streaming ? " " : "")}</Markdown>
      {streaming && !text && <span className="cursor" />}
    </div>
  );
});
