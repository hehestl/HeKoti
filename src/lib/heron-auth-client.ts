export const HEKOTI_OAUTH_STATE_KEY = "hekoti_oauth_state";
export const HEKOTI_PKCE_VERIFIER_KEY = "hekoti_oidc_verifier";
export const HEKOTI_PKCE_NONCE_KEY = "hekoti_oidc_nonce";
export const HEKOTI_SILENT_FAILED_KEY = "hekoti_oidc_silent_failed";

/** Public Heron IdP origin — bake `NEXT_PUBLIC_HERON_AUTH_URL` at docker build (see .env). */
export function getHeronAuthPublicUrl(): string {
  const raw = process.env.NEXT_PUBLIC_HERON_AUTH_URL?.trim();
  if (!raw) {
    console.error(
      "[hekoti] NEXT_PUBLIC_HERON_AUTH_URL is not set — set it in .env and rebuild (Dockerfile ARG)",
    );
    return "";
  }
  return raw.replace(/\/+$/, "");
}

export function isHeronOidcLegacyFragment(): boolean {
  const legacy = process.env.NEXT_PUBLIC_HERON_OAUTH_LEGACY_FRAGMENT?.trim();
  return legacy === "1" || legacy?.toLowerCase() === "true";
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
      : (
          process.env.NEXT_PUBLIC_APP_URL?.trim() ||
          process.env.APP_URL?.trim() ||
          ""
        ).replace(/\/+$/, "");
  if (!origin) {
    console.error(
      "[hekoti] NEXT_PUBLIC_APP_URL / APP_URL is not set — set it in .env and rebuild",
    );
  }
  const params = new URLSearchParams({
    returnTo: safeReturnPath(returnToPath),
    state,
  });
  return `${origin}/auth/heron-callback?${params.toString()}`;
}

export async function buildHeronLoginUrl(
  returnToPath?: string | null,
  options?: { silent?: boolean },
): Promise<string> {
  const base = getHeronAuthPublicUrl();
  if (!base) return "";

  if (isHeronOidcLegacyFragment()) {
    const state = crypto.randomUUID();
    try {
      sessionStorage.setItem(HEKOTI_OAUTH_STATE_KEY, state);
    } catch {
      /* ignore */
    }
    const callbackUrl = buildHeronCallbackUrl(returnToPath ?? "/", state);
    const params = new URLSearchParams({ return_to: callbackUrl });
    return `${base}/login?${params.toString()}`;
  }

  const state = crypto.randomUUID();
  const { generateCodeVerifier, generateNonce, codeChallengeS256, buildHeronAuthorizeUrl } =
    await import("@/lib/heron-shared/oidc-pkce");
  const verifier = generateCodeVerifier();
  const nonce = generateNonce();
  try {
    sessionStorage.setItem(HEKOTI_OAUTH_STATE_KEY, state);
    sessionStorage.setItem(HEKOTI_PKCE_VERIFIER_KEY, verifier);
    sessionStorage.setItem(HEKOTI_PKCE_NONCE_KEY, nonce);
  } catch {
    /* ignore */
  }

  const redirectUri =
    buildHeronCallbackUrl(returnToPath ?? "/", state).split("?")[0] ??
    buildHeronCallbackUrl(returnToPath ?? "/", state);
  const challenge = await codeChallengeS256(verifier);
  const clientId = process.env.NEXT_PUBLIC_HERON_OAUTH_CLIENT_ID?.trim();
  if (!clientId) {
    console.error(
      "[hekoti] NEXT_PUBLIC_HERON_OAUTH_CLIENT_ID is not set — set it in .env and rebuild",
    );
    return "";
  }

  return buildHeronAuthorizeUrl({
    heronBaseUrl: base,
    clientId,
    redirectUri,
    state,
    nonce,
    codeChallenge: challenge,
    prompt: options?.silent ? "none" : undefined,
  });
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

export function markSilentOidcFailed(): void {
  try {
    sessionStorage.setItem(HEKOTI_SILENT_FAILED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearSilentOidcFailed(): void {
  try {
    sessionStorage.removeItem(HEKOTI_SILENT_FAILED_KEY);
  } catch {
    /* ignore */
  }
}

export function shouldUseSilentOidc(): boolean {
  try {
    return sessionStorage.getItem(HEKOTI_SILENT_FAILED_KEY) !== "1";
  } catch {
    return true;
  }
}

export function buildAuthLoginPath(
  returnTo?: string | null,
  auto?: boolean,
  interactive?: boolean,
): string {
  const path = safeReturnPath(returnTo ?? "/");
  const params = new URLSearchParams({ returnTo: path });
  if (auto) params.set("auto", "1");
  if (interactive) params.set("interactive", "1");
  return `/auth/login?${params.toString()}`;
}

export function startHeronLogin(
  returnToPath?: string | null,
  options?: { silent?: boolean },
): void {
  void buildHeronLoginUrl(returnToPath, options).then((url) => {
    if (!url) return;
    window.location.href = url;
  });
}

export function readHeronOidcPkce(): { verifier: string; nonce: string } | null {
  try {
    const verifier = sessionStorage.getItem(HEKOTI_PKCE_VERIFIER_KEY);
    const nonce = sessionStorage.getItem(HEKOTI_PKCE_NONCE_KEY);
    if (!verifier || !nonce) return null;
    return { verifier, nonce };
  } catch {
    return null;
  }
}

export function clearHeronOidcPkce(): void {
  try {
    sessionStorage.removeItem(HEKOTI_PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(HEKOTI_PKCE_NONCE_KEY);
  } catch {
    /* ignore */
  }
}

export function isSilentOidcError(error: string | null | undefined): boolean {
  return error === "login_required" || error === "interaction_required";
}

export function isRetryableOidcError(error: string | null | undefined): boolean {
  return isSilentOidcError(error) || error === "invalid_request";
}
