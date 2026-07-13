const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Read double-submit CSRF cookie set by middleware (`csrf_token`). */
export function readCsrfTokenFromDocument(): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith("csrf_token=")) continue;
    const raw = trimmed.slice("csrf_token=".length);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

async function ensureCsrfToken(): Promise<string | null> {
  const existing = readCsrfTokenFromDocument();
  if (existing) return existing;
  try {
    await fetch("/api/health", { credentials: "same-origin" });
  } catch {
    return null;
  }
  return readCsrfTokenFromDocument();
}

/**
 * Same-origin fetch wrapper: adds `x-csrf-token` for state-changing requests.
 * Login/logout/heron exchange remain CSRF-exempt in middleware when called without the header.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (MUTATING_METHODS.has(method)) {
    const token = (await ensureCsrfToken()) ?? readCsrfTokenFromDocument();
    if (token && !headers.has("x-csrf-token")) {
      headers.set("x-csrf-token", token);
    }
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "same-origin",
  });
}