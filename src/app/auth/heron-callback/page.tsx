"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import {
  buildHeronCallbackUrl,
  buildHeronLoginUrl,
  clearHeronOidcPkce,
  clearSilentOidcFailed,
  isHeronOidcLegacyFragment,
  isRetryableOidcError,
  markSilentOidcFailed,
  parseHeronAccessTokenFromHash,
  readHeronOidcPkce,
  safeReturnPath,
  stripHistoryAccessToken,
  verifyOAuthState,
} from "@/lib/heron-auth-client";

function parseCallback(search: string, hash: string) {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  const query = new URLSearchParams(search);
  const accessToken = (
    parseHeronAccessTokenFromHash(hash) ||
    query.get("access_token") ||
    hashParams.get("access_token") ||
    ""
  ).trim();
  const code = (query.get("code") || hashParams.get("code") || "").trim();
  const returnTo = (query.get("returnTo") || hashParams.get("returnTo") || "").trim() || null;
  const state = (query.get("state") || hashParams.get("state") || "").trim() || null;
  const error = (query.get("error") || hashParams.get("error") || "").trim() || null;
  return {
    accessToken: accessToken || null,
    code: code || null,
    returnTo,
    state,
    error,
  };
}

function HeronAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const { accessToken, code, returnTo, state, error: oidcError } = parseCallback(search, hash);
      const returnPath = safeReturnPath(returnTo ?? "/");

      if (isRetryableOidcError(oidcError)) {
        markSilentOidcFailed();
        void buildHeronLoginUrl(returnPath, { silent: false }).then((url) => {
          if (url) window.location.href = url;
        });
        return;
      }

      if (oidcError) {
        if (!cancelled) setError(`Heron sign-in failed: ${oidcError}`);
        return;
      }

      if (state && !verifyOAuthState(state)) {
        if (!cancelled) setError("Invalid OAuth state. Please sign in again.");
        return;
      }

      stripHistoryAccessToken();

      let body: Record<string, string>;
      if (code) {
        const pkce = readHeronOidcPkce();
        if (!pkce) {
          if (!cancelled) setError("PKCE session expired. Please sign in again.");
          return;
        }
        const redirectUri =
          buildHeronCallbackUrl(returnPath, state ?? "").split("?")[0] ?? "";
        body = {
          code,
          codeVerifier: pkce.verifier,
          redirectUri,
          nonce: pkce.nonce,
          returnTo: returnPath,
        };
        clearHeronOidcPkce();
      } else if (accessToken && isHeronOidcLegacyFragment()) {
        body = { accessToken, returnTo: returnPath };
      } else {
        if (!cancelled) setError("Heron authorization code not found in callback URL.");
        return;
      }

      try {
        const res = await apiFetch("/api/auth/heron/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
        });
        const payload = (await res.json()) as {
          ok?: boolean;
          message?: string;
          returnTo?: string;
        };
        if (!res.ok || !payload.ok) {
          if (!cancelled) setError(payload.message ?? "Heron sign-in failed.");
          return;
        }
        if (!cancelled) {
          clearSilentOidcFailed();
          router.replace(safeReturnPath(payload.returnTo ?? returnPath));
        }
      } catch {
        if (!cancelled) setError("Heron sign-in failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <main style={{ display: "grid", placeItems: "center", minHeight: "50vh", padding: 16 }}>
        <section style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ color: "var(--muted)" }}>{error}</p>
          <p style={{ marginTop: 12 }}>
            <a href="/auth/login">Try again</a>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "50vh", padding: 16 }}>
      <p style={{ color: "var(--muted)" }}>Signing in via Heron Auth…</p>
    </main>
  );
}

export default function HeronAuthCallbackPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "50vh" }} />}>
      <HeronAuthCallbackInner />
    </Suspense>
  );
}
