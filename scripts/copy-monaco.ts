// Copies Monaco's AMD build (and monaco-vim) from node_modules into public/
// so the editor loads them same-origin — no CDN at runtime. Runs on
// postinstall; skips work when already in place.
import { cpSync, existsSync, rmSync } from "node:fs";

const jobs = [
  { from: "node_modules/monaco-editor/min/vs", to: "public/monaco/vs" },
  { from: "node_modules/monaco-vim/dist", to: "public/monaco-vim" },
];

for (const { from, to } of jobs) {
  if (!existsSync(from)) {
    console.error(`copy-monaco: missing ${from} — run bun install first`);
    process.exit(1);
  }
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  console.log(`copy-monaco: ${from} → ${to}`);
}
