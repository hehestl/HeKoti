"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

type Props = {
  sourcePath: string;
  targetLang: string;
  label: string;
  note: string;
};

export function WikiClonePageForm({ sourcePath, targetLang, label, note }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/pages", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sourcePath, targetLang }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        path?: string;
        code?: string;
        existingPath?: string;
        message?: string;
      };
      if (res.status === 409 && body.code === "exists" && body.existingPath) {
        router.push(`/${targetLang}/admin?tab=posts&activePath=${encodeURIComponent(body.existingPath)}`);
        return;
      }
      if (!res.ok || !body.path) {
        setError(body.message ?? "Create failed.");
        return;
      }
      router.push(`/${targetLang}/admin?tab=posts&activePath=${encodeURIComponent(body.path)}`);
    } catch {
      setError("Create failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        style={{
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "10px 14px",
          background: "var(--accent)",
          color: "white",
          fontWeight: 700,
          cursor: busy ? "wait" : "pointer",
          width: "fit-content",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {label}
      </button>
      {error ? (
        <div style={{ marginTop: 8, color: "#ff5f7d", fontSize: 13 }}>{error}</div>
      ) : (
        <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>{note}</div>
      )}
    </div>
  );
}