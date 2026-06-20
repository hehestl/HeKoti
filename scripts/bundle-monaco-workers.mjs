import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "monaco-workers");
const monacoVs = join(root, "node_modules", "monaco-editor", "esm", "vs");

const workers = [
  { out: "editor.worker.js", entry: join(monacoVs, "editor", "editor.worker.js") },
  { out: "json.worker.js", entry: join(monacoVs, "language", "json", "json.worker.js") },
  { out: "css.worker.js", entry: join(monacoVs, "language", "css", "css.worker.js") },
  { out: "html.worker.js", entry: join(monacoVs, "language", "html", "html.worker.js") },
  { out: "ts.worker.js", entry: join(monacoVs, "language", "typescript", "ts.worker.js") },
];

mkdirSync(outDir, { recursive: true });

for (const worker of workers) {
  await esbuild.build({
    entryPoints: [worker.entry],
    outfile: join(outDir, worker.out),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    logLevel: "silent",
  });
}

console.log(`monaco-workers: bundled ${workers.length} files → public/monaco-workers/`);
