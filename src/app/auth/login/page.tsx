"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { buildHeronLoginUrl, safeReturnPath, startHeronLogin } from "@/lib/heron-auth-client";

function HeronLoginInner() {
  const searchParams = useSearchParams();
  const isAuto = searchParams.get("auto") === "1";
  const returnTo = safeReturnPath(searchParams.get("returnTo") || "/");

  useEffect(() => {
    if (!isAuto) return;
    startHeronLogin(returnTo);
  }, [isAuto, returnTo]);

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
            window.location.href = buildHeronLoginUrl(returnTo);
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
