import { DiffEditor, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";

// Bundle Monaco locally (no CDN) and give it its editor worker.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

monaco.editor.defineTheme("krypton", {
  base: "vs",
  inherit: true,
  rules: [{ token: "comment", foreground: "6b6354" }],
  colors: {
    "editor.background": "#f4efe4",
    "editor.foreground": "#14110d",
    "editorLineNumber.foreground": "#b9ae96",
    "editorLineNumber.activeForeground": "#14110d",
    "editor.selectionBackground": "#ff5b1440",
    "editorCursor.foreground": "#ff5b14",
    "diffEditor.insertedTextBackground": "#1b3cff22",
    "diffEditor.removedTextBackground": "#d8121b22",
    "diffEditor.insertedLineBackground": "#1b3cff12",
    "diffEditor.removedLineBackground": "#d8121b12",
    "diffEditor.border": "#14110d",
  },
});

export default function DiffView({ original, modified, language }: { original: string; modified: string; language: string }) {
  return (
    <div className="h-full min-h-0 border border-ink">
      <DiffEditor
        theme="krypton"
        // Avoids "TextModel got disposed before DiffEditorWidget model got reset" on unmount.
        keepCurrentOriginalModel
        keepCurrentModifiedModel
        language={language}
        original={original}
        modified={modified}
        options={{
          readOnly: true,
          originalEditable: false,
          renderSideBySide: true,
          wordWrap: "on",
          diffWordWrap: "on",
          minimap: { enabled: false },
          fontFamily: "IBM Plex Mono",
          fontSize: 13,
          scrollBeyondLastLine: false,
          renderOverviewRuler: false,
          renderMarginRevertIcon: false,
          renderIndicators: false,
        }}
      />
    </div>
  );
}
