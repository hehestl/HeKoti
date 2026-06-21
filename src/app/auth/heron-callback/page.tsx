"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import {
  parseHeronAccessTokenFromHash,
  safeReturnPath,
  stripHistoryAccessToken,
  verifyOAuthState,
} from "@/lib/heron-auth-client";

function parseCallback(): {
  accessToken: string | null;
  returnTo: string | null;
  state: string | null;
} {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  const query = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const accessToken = (
    hashParams.get("access_token") ||
    hashParams.get("accessToken") ||
    query.get("access_token") ||
    ""
  ).trim();
  const returnTo = (query.get("returnTo") || hashParams.get("returnTo") || "").trim() || null;
  const state = (query.get("state") || hashParams.get("state") || "").trim() || null;
  return { accessToken: accessToken || null, returnTo, state };
}

export default function HeronAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { accessToken, returnTo, state } = parseCallback();

      // Hub silent SSO: token in #fragment without OAuth state (see ecosystem-sso → heron-callback).
      if (state && !verifyOAuthState(state)) {
        if (!cancelled) {
          setError("Invalid OAuth state. Please sign in again.");
        }
        return;
      }

      if (!accessToken) {
        if (!cancelled) {
          setError("Heron access token not found in callback URL.");
        }
        return;
      }

      stripHistoryAccessToken();

      try {
        const res = await apiFetch("/api/auth/heron/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            accessToken,
            returnTo: returnTo ?? undefined,
          }),
        });
        const body = (await res.json()) as {
          ok?: boolean;
          message?: string;
          returnTo?: string;
        };
        if (!res.ok || !body.ok) {
          if (!cancelled) {
            setError(body.message ?? "Heron sign-in failed.");
          }
          return;
        }
        if (!cancelled) {
          router.replace(safeReturnPath(body.returnTo ?? returnTo ?? "/"));
        }
      } catch {
        if (!cancelled) {
          setError("Heron sign-in failed.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

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
