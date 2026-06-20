/**
 * isomorphic-mermaid (and similar) can leave a fake `window` on globalThis without `location`.
 * Next.js and other server code may then throw on `window.location.protocol`.
 */
export function clearSsrWindowPollution(): void {
  if (typeof globalThis.window === "undefined") return;

  const location = globalThis.window.location;
  if (location && typeof location.protocol === "string") return;

  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { document?: unknown }).document;
}
