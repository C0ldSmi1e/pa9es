"use client";

import { useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { configureMonacoLoader, loadVimMode, type VimMode } from "@/src/lib/monaco";

configureMonacoLoader();

const CodeEditor = ({
  value,
  onChange,
  onSave,
  wrap,
  vim,
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  wrap: boolean;
  vim: boolean;
}) => {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const vimModeRef = useRef<VimMode | null>(null);
  const vimBarRef = useRef<HTMLDivElement>(null);
  const onSaveRef = useRef(onSave);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
      onSaveRef.current(),
    );
    setMounted(true);
  };

  useEffect(() => {
    if (!mounted) return;
    if (vim && !vimModeRef.current && editorRef.current && vimBarRef.current) {
      void loadVimMode(editorRef.current, vimBarRef.current).then((mode) => {
        if (vimModeRef.current) {
          mode.dispose();
        } else {
          vimModeRef.current = mode;
        }
      });
    }
    if (!vim && vimModeRef.current) {
      vimModeRef.current.dispose();
      vimModeRef.current = null;
      if (vimBarRef.current) vimBarRef.current.textContent = "";
    }
  }, [vim, mounted]);

  useEffect(() => () => vimModeRef.current?.dispose(), []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1">
        <Editor
          value={value}
          language="html"
          theme="light"
          onChange={(next) => onChange(next ?? "")}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            wordWrap: wrap ? "on" : "off",
            fontSize: 13,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 10 },
          }}
        />
      </div>
      <div
        ref={vimBarRef}
        className={`border-t border-edge bg-panel px-3 py-0.5 font-mono text-xs text-dim ${vim ? "" : "hidden"}`}
      />
    </div>
  );
};

export { CodeEditor };
