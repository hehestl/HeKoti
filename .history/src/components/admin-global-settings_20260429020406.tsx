"use client";

import { useState } from "react";
import { enabledLanguages } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n";

export function AdminGlobalSettings({
  lang,
  defaultLanguage,
  dict,
}: {
  lang: string;
  defaultLanguage: string;
  dict: Dictionary;
}) {
  const [defLang, setDefLang] = useState(defaultLanguage);
  const [status, setStatus] = useState("");

  const submit = async () => {
    setStatus(dict.common.loading);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultLanguage: defLang }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus(dict.common.save);
        setTimeout(() => setStatus(""), 2000);
      } else {
        setStatus(data.message || "Error");
      }
    } catch (e) {
      setStatus("Error");
    }
  };

  return (
    <section
      style={{
        border: "1px solid var(--line)",
        borderRadius: 12,
        background: "var(--panel)",
        padding: 12,
        marginBottom: 12,
      }}
    >
      <h2 style={{ marginTop: 0 }}>{dict.admin.globalSettings}</h2>
      <p style={{ color: "var(--muted)", marginTop: 0, fontSize: 13 }}>
        {dict.admin.defaultLanguageDesc}
      </p>
      <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          {dict.admin.defaultLanguage}
          <select
            value={defLang}
            onChange={(e) => setDefLang(e.target.value)}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "8px 10px",
              background: "transparent",
              color: "var(--fg)",
            }}
          >
            {enabledLanguages.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={submit}
          style={{
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "10px 12px",
            background: "var(--accent)",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          {dict.common.save}
        </button>
        {status ? <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{status}</p> : null}
      </div>
    </section>
  );
}
