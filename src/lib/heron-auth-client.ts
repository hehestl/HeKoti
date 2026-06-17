export const HEKOTI_OAUTH_STATE_KEY = "hekoti_oauth_state";

const HERON_DEFAULT_URL = "https://heron.hehestl.com";

export function getHeronAuthPublicUrl(): string {
  const raw = process.env.NEXT_PUBLIC_HERON_AUTH_URL?.trim();
  return (raw || HERON_DEFAULT_URL).replace(/\/+$/, "");
}

export function safeReturnPath(returnTo: string | null | undefined): string {
  const r = returnTo?.trim();
  if (!r?.startsWith("/")) return "/";
  if (r.startsWith("//")) return "/";
  return r;
}

export function buildHeronCallbackUrl(returnToPath: string, state: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin.replace(/\/+$/, "")
      : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "https://wiki.hehestl.com";
  const params = new URLSearchParams({
    returnTo: safeReturnPath(returnToPath),
    state,
  });
  return `${origin}/auth/heron-callback?${params.toString()}`;
}

export function buildHeronLoginUrl(returnToPath?: string | null): string {
  const state = crypto.randomUUID();
  try {
    sessionStorage.setItem(HEKOTI_OAUTH_STATE_KEY, state);
  } catch {
    /* ignore */
  }
  const callbackUrl = buildHeronCallbackUrl(returnToPath ?? "/", state);
  const base = getHeronAuthPublicUrl();
  const params = new URLSearchParams({ return_to: callbackUrl });
  return `${base}/login?${params.toString()}`;
}

export function verifyOAuthState(queryState: string | null): boolean {
  if (!queryState?.trim()) return false;
  try {
    const stored = sessionStorage.getItem(HEKOTI_OAUTH_STATE_KEY);
    if (!stored || stored !== queryState.trim()) return false;
    sessionStorage.removeItem(HEKOTI_OAUTH_STATE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function parseHeronAccessTokenFromHash(hash: string): string | null {
  const raw = hash.replace(/^#/, "");
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const token = (params.get("access_token") || params.get("accessToken") || "").trim();
  return token || null;
}

export function stripHistoryAccessToken(): void {
  try {
    const url = new URL(window.location.href);
    if (url.hash) {
      url.hash = "";
      window.history.replaceState(null, "", url.toString());
    }
  } catch {
    /* ignore */
  }
}

export function buildAuthLoginPath(returnTo?: string | null, auto?: boolean): string {
  const path = safeReturnPath(returnTo ?? "/");
  const params = new URLSearchParams({ returnTo: path });
  if (auto) params.set("auto", "1");
  return `/auth/login?${params.toString()}`;
}

export function startHeronLogin(returnToPath?: string | null): void {
  window.location.href = buildHeronLoginUrl(returnToPath);
}
