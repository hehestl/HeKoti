"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";

export function AdminGlobalSettings({
  lang,
  defaultLanguage,
  enabledLanguages,
  headHtml,
  bodyHtml,
  dict,
}: {
  lang: string;
  defaultLanguage: string;
  enabledLanguages: string[];
  headHtml: string;
  bodyHtml: string;
  dict: Dictionary;
}) {
  const [defLang, setDefLang] = useState(defaultLanguage);
  const [head, setHead] = useState(headHtml);
  const [body, setBody] = useState(bodyHtml);
  const [status, setStatus] = useState("");

  const submit = async () => {
    setStatus(dict.common.loading);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultLanguage: defLang, headHtml: head, bodyHtml: body }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus(dict.admin.posts.saved);
        setTimeout(() => setStatus(""), 2000);
      } else {
        setStatus(data.message || dict.admin.posts.failed);
      }
    } catch (e) {
      setStatus(dict.admin.posts.failed);
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
      <div style={{ display: "grid", gap: 8, maxWidth: 720 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          {dict.admin.defaultLanguage}
          <select
            value={defLang}
            onChange={(e) => setDefLang(e.target.value)}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "8px 10px",
              background: "var(--panel)",
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

        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          <div style={{ fontWeight: 700 }}>{dict.admin.telemetry.title}</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{dict.admin.telemetry.desc}</div>
        </div>

        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          {dict.admin.telemetry.headLabel}
          <textarea
            value={head}
            onChange={(e) => setHead(e.target.value)}
            spellCheck={false}
            rows={6}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "10px 10px",
              background: "var(--panel)",
              color: "var(--fg)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              lineHeight: 1.4,
              resize: "vertical",
            }}
            placeholder={dict.admin.telemetry.headPlaceholder}
          />
        </label>

        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          {dict.admin.telemetry.bodyLabel}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            rows={6}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "10px 10px",
              background: "var(--panel)",
              color: "var(--fg)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              lineHeight: 1.4,
              resize: "vertical",
            }}
            placeholder={dict.admin.telemetry.bodyPlaceholder}
          />
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
