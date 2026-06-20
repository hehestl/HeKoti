/** Monaco web workers — same-origin static bundles in /monaco-workers/. */

const WORKERS_BASE = "/monaco-workers";

type MonacoGlobal = typeof globalThis & {
  MonacoEnvironment?: {
    getWorkerUrl?: (workerId: string, label: string) => string;
    getWorker?: (workerId: string, label: string) => Worker;
  };
};

function workerUrl(label: string): string {
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

export function configureMonacoEnvironment() {
  if (typeof window === "undefined") return;

  const g = globalThis as MonacoGlobal;
  if (g.MonacoEnvironment?.getWorkerUrl || g.MonacoEnvironment?.getWorker) return;

  g.MonacoEnvironment = {
    getWorkerUrl(_workerId, label) {
      return workerUrl(label);
    },
  };
}
