"use client";

// Single home for every Monaco third-party integration quirk. Nothing else
// in the codebase may touch window.require / window.define or know how the
// assets are hosted.
//
// The setup: Monaco's AMD build and monaco-vim are copied into public/ by
// scripts/copy-monaco.ts (postinstall), so the editor loads same-origin with
// no CDN. Turbopack never bundles either (it can't resolve `bun:`-style or
// AMD-only modules), which is exactly why access goes through the AMD loader
// at runtime.
import { loader } from "@monaco-editor/react";

type VimMode = { dispose: () => void };
type MonacoVimModule = {
  initVimMode: (editor: unknown, statusBarNode: HTMLElement) => VimMode;
};
type AmdWindow = {
  require: {
    config: (options: { paths: Record<string, string> }) => void;
    (
      deps: string[],
      onLoad: (mod: MonacoVimModule) => void,
      onError: (error: unknown) => void,
    ): void;
  };
  define: (id: string, deps: string[], factory: () => unknown) => void;
  monaco: unknown;
  __monacoApiShim?: boolean;
};

const configureMonacoLoader = () => {
  loader.config({ paths: { vs: "/monaco/vs" } });
};

// monaco-vim's UMD build declares an AMD dependency on
// "monaco-editor/esm/vs/editor/editor.api", which the loader would try to
// fetch as a file — pre-register that id to resolve to the already-loaded
// monaco instance instead.
const loadVimMode = (
  editor: unknown,
  statusBarNode: HTMLElement,
): Promise<VimMode> => {
  const w = window as unknown as AmdWindow;
  if (!w.__monacoApiShim) {
    w.define("monaco-editor/esm/vs/editor/editor.api", [], () => w.monaco);
    w.__monacoApiShim = true;
  }
  w.require.config({ paths: { "monaco-vim": "/monaco-vim/monaco-vim.umd" } });
  return new Promise((resolve, reject) => {
    w.require(
      ["monaco-vim"],
      (MonacoVim) => resolve(MonacoVim.initVimMode(editor, statusBarNode)),
      reject,
    );
  });
};

export { configureMonacoLoader, loadVimMode };
export type { VimMode };
