/** Monaco — same-origin workers; must load before @monaco-editor/react mounts. */
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

const WORKERS_BASE = "/monaco-workers";

function workerPath(label: string): string {
  switch (label) {
    case "json":
      return `${WORKERS_BASE}/json.worker.js`;
    case "css":
    case "scss":
    case "less":
      return `${WORKERS_BASE}/css.worker.js`;
    case "html":
    case "handlebars":
    case "razor":
      return `${WORKERS_BASE}/html.worker.js`;
    case "typescript":
    case "javascript":
      return `${WORKERS_BASE}/ts.worker.js`;
    default:
      return `${WORKERS_BASE}/editor.worker.js`;
  }
}

function workerAbsUrl(label: string): string {
  const path = workerPath(label);
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).href;
}

if (typeof window !== "undefined") {
  const g = globalThis as typeof globalThis & {
    MonacoEnvironment?: {
      getWorker?: (workerId: string, label: string) => Worker;
      getWorkerUrl?: (workerId: string, label: string) => string;
    };
  };

  g.MonacoEnvironment = {
    getWorker(_workerId, label) {
      return new Worker(workerAbsUrl(label));
    },
    getWorkerUrl(_workerId, label) {
      return workerAbsUrl(label);
    },
  };

  loader.config({ monaco });
}
