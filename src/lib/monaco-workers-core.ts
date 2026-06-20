/** Shared Monaco worker paths — same-origin `/monaco-workers/` (CSP worker-src 'self'). */

export const WORKERS_BASE = "/monaco-workers";

export function workerPath(label: string): string {
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

export function workerAbsUrl(label: string, origin?: string): string {
  const path = workerPath(label);
  if (!origin) return path;
  return new URL(path, origin).href;
}

export function applyMonacoWorkersEnv(): void {
  if (typeof window === "undefined") return;

  const g = globalThis as typeof globalThis & {
    MonacoEnvironment?: {
      getWorker?: (workerId: string, label: string) => Worker;
      getWorkerUrl?: (workerId: string, label: string) => string;
    };
  };

  g.MonacoEnvironment = {
    getWorker(_workerId, label) {
      return new Worker(workerAbsUrl(label, window.location.origin));
    },
    getWorkerUrl(_workerId, label) {
      return workerAbsUrl(label, window.location.origin);
    },
  };
}

/** Inline bootstrap — must run in <head> before any Monaco chunk (beats CDN / loader defaults). */
export const MONACO_WORKERS_INLINE_SCRIPT = `(function(){var B="${WORKERS_BASE}";function P(l){switch(l){case"json":return B+"/json.worker.js";case"css":case"scss":case"less":return B+"/css.worker.js";case"html":case"handlebars":case"razor":return B+"/html.worker.js";case"typescript":case"javascript":return B+"/ts.worker.js";default:return B+"/editor.worker.js"}}function U(l){return location.origin+P(l)}globalThis.MonacoEnvironment={getWorker:function(w,l){return new Worker(U(l))},getWorkerUrl:function(w,l){return U(l)}}})();`;
