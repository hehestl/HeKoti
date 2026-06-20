/** Monaco web workers — must run before @monaco-editor/react loader.config(). */
const MONACO_VERSION = "0.52.2";
const CDN_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;

export function configureMonacoEnvironment() {
  if (typeof window === "undefined") return;

  const g = globalThis as typeof globalThis & {
    MonacoEnvironment?: {
      getWorkerUrl?: (workerId: string, label: string) => string;
      getWorker?: (workerId: string, label: string) => Worker;
    };
  };

  if (g.MonacoEnvironment?.getWorkerUrl || g.MonacoEnvironment?.getWorker) return;

  g.MonacoEnvironment = {
    getWorkerUrl(_workerId, label) {
      switch (label) {
        case "json":
          return `${CDN_BASE}/language/json/json.worker.js`;
        case "css":
        case "scss":
        case "less":
          return `${CDN_BASE}/language/css/css.worker.js`;
        case "html":
        case "handlebars":
        case "razor":
          return `${CDN_BASE}/language/html/html.worker.js`;
        case "typescript":
        case "javascript":
          return `${CDN_BASE}/language/typescript/ts.worker.js`;
        default:
          return `${CDN_BASE}/editor/editor.worker.js`;
      }
    },
  };
}
