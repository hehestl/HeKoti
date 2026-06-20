import "./mermaid-polyfill";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { createHTMLWindow } from "svgdom";
import { clearSsrWindowPollution } from "@/lib/node-globals-guard";

type DomGlobals = {
  window?: typeof globalThis.window;
  document?: typeof globalThis.document;
};

const MERMAID_LOCATION = {
  protocol: "http:",
  host: "localhost",
  hostname: "localhost",
  port: "",
  pathname: "/",
  search: "",
  hash: "",
  href: "http://localhost/",
  origin: "http://localhost",
};

/** Mermaid expects DOMPurify.sanitize on the factory module (see isomorphic-mermaid). */
const domPurifyWindow = new JSDOM("").window;
type DomPurifyWindow = Parameters<typeof createDOMPurify>[0];
const domPurify = createDOMPurify(domPurifyWindow as unknown as DomPurifyWindow);
Object.assign(createDOMPurify, domPurify);

let svgWindow: ReturnType<typeof createHTMLWindow> | null = null;
let renderChain: Promise<unknown> = Promise.resolve();

function getSvgWindow(): ReturnType<typeof createHTMLWindow> {
  if (!svgWindow) {
    svgWindow = createHTMLWindow();
    Object.defineProperty(svgWindow, "location", {
      value: MERMAID_LOCATION,
      configurable: true,
    });
  }
  return svgWindow;
}

function snapshotGlobals(): DomGlobals {
  return {
    window: globalThis.window,
    document: globalThis.document,
  };
}

function restoreGlobals(snapshot: DomGlobals) {
  if (snapshot.window === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    globalThis.window = snapshot.window;
  }

  if (snapshot.document === undefined) {
    delete (globalThis as { document?: unknown }).document;
  } else {
    globalThis.document = snapshot.document;
  }
}

async function runWithMermaidDom<T>(fn: () => Promise<T>): Promise<T> {
  const snapshot = snapshotGlobals();
  const window = getSvgWindow();
  try {
    globalThis.window = window as unknown as Window & typeof globalThis;
    globalThis.document = window.document;
    return await fn();
  } finally {
    restoreGlobals(snapshot);
    clearSsrWindowPollution();
  }
}

/** Serializes Mermaid renders and restores global `window`/`document` after each job. */
export function withMermaidDom<T>(fn: () => Promise<T>): Promise<T> {
  const job = renderChain.then(() => runWithMermaidDom(fn));
  renderChain = job.catch(() => undefined);
  return job;
}
