"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  isHeronOidcLegacyFragment,
  parseHeronAccessTokenFromHash,
  safeReturnPath,
  shouldUseSilentOidc,
  startHeronLogin,
  stripHistoryAccessToken,
} from "@/lib/heron-auth-client";
import { apiFetch } from "@/lib/api-fetch";

async function exchangeHeronToken(
  accessToken: string,
  returnTo: string,
): Promise<{ ok?: boolean; returnTo?: string; message?: string }> {
  stripHistoryAccessToken();
  const res = await apiFetch("/api/auth/heron/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ accessToken, returnTo }),
  });
  return (await res.json()) as { ok?: boolean; returnTo?: string; message?: string };
}

function HeronLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuto = searchParams.get("auto") === "1";
  const forceInteractive = searchParams.get("interactive") === "1";
  const returnTo = safeReturnPath(searchParams.get("returnTo") || "/");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (isHeronOidcLegacyFragment()) {
        const hashToken = parseHeronAccessTokenFromHash(window.location.hash);
        if (hashToken) {
          try {
            const body = await exchangeHeronToken(hashToken, returnTo);
            if (cancelled) return;
            if (!body.ok) {
              setError(body.message ?? "Heron sign-in failed.");
              return;
            }
            router.replace(safeReturnPath(body.returnTo ?? returnTo));
            return;
          } catch {
            if (!cancelled) setError("Heron sign-in failed.");
            return;
          }
        }
      }

      if (!isAuto) return;
      const wantSilent = shouldUseSilentOidc() && !forceInteractive;
      startHeronLogin(returnTo, { silent: wantSilent });
    })();
    return () => {
      cancelled = true;
    };
  }, [forceInteractive, isAuto, returnTo, router]);

  if (error) {
    return (
      <main style={{ display: "grid", placeItems: "center", minHeight: "50vh", padding: 16 }}>
        <section style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ color: "var(--muted)" }}>{error}</p>
          <button
            type="button"
            onClick={() => {
              startHeronLogin(returnTo, { silent: false });
            }}
            style={{ marginTop: 12 }}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (isAuto) {
    return (
      <main style={{ display: "grid", placeItems: "center", minHeight: "50vh", padding: 16 }}>
        <p style={{ color: "var(--muted)" }}>Redirecting to Heron Auth…</p>
      </main>
    );
  }

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "50vh", padding: 16 }}>
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          border: "1px solid var(--line)",
          borderRadius: 14,
          background: "var(--panel)",
          padding: 16,
          textAlign: "center",
        }}
      >
        <h1>Sign in with Heron</h1>
        <p style={{ color: "var(--muted)", margin: "12px 0" }}>
          Use your Heron Auth account for wiki access.
        </p>
        <button
          type="button"
          onClick={() => {
            startHeronLogin(returnTo, { silent: false });
          }}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            background: "var(--accent, #3b82f6)",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Continue with Heron
        </button>
      </section>
    </main>
  );
}

export default function HeronLoginPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "50vh" }} />}>
      <HeronLoginInner />
    </Suspense>
  );
}
