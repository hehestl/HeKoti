"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";

const TEMPLATE_YANDEX = `<!-- Яндекс.Метрика: замените COUNTER_ID на номер счётчика -->
<script type="text/javascript">
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
   ym(COUNTER_ID, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true
   });
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/COUNTER_ID" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
`;

const TEMPLATE_GA = `<!-- Google Analytics (gtag.js): замените G-XXXXXXXX -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXX');
</script>
`;

const textareaStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "10px 10px",
  background: "var(--panel)",
  color: "var(--fg)",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 12,
  lineHeight: 1.45,
  resize: "vertical",
  width: "100%",
  minHeight: 160,
};

const tplBtn: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  background: "color-mix(in srgb, var(--accent) 10%, var(--panel))",
  color: "var(--fg)",
  cursor: "pointer",
};

export function AdminGlobalSettings({
  defaultLanguage,
  enabledLanguages,
  headHtml,
  bodyHtml,
  dict,
}: {
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
    } catch {
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
      <div style={{ display: "grid", gap: 8, maxWidth: 960 }}>
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
              maxWidth: 320,
            }}
          >
            {enabledLanguages.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{dict.admin.telemetry.title}</div>
          <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>{dict.admin.telemetry.desc}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <button type="button" style={tplBtn} onClick={() => setHead((h) => (h ? `${h}\n\n` : "") + TEMPLATE_YANDEX)}>
              {dict.admin.telemetry.insertYandex}
            </button>
            <button type="button" style={tplBtn} onClick={() => setHead((h) => (h ? `${h}\n\n` : "") + TEMPLATE_GA)}>
              {dict.admin.telemetry.insertGA}
            </button>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{dict.admin.telemetry.appendHint}</span>
          </div>
        </div>

        <label style={{ display: "grid", gap: 6, fontSize: 13, marginTop: 8 }}>
          {dict.admin.telemetry.headLabel}
          <textarea
            value={head}
            onChange={(e) => setHead(e.target.value)}
            spellCheck={false}
            rows={12}
            style={textareaStyle}
            placeholder={dict.admin.telemetry.headPlaceholder}
          />
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          {dict.admin.telemetry.bodyLabel}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            rows={10}
            style={textareaStyle}
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
            justifySelf: "start",
          }}
        >
          {dict.common.save}
        </button>
        {status ? <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{status}</p> : null}
      </div>
    </section>
  );
}
