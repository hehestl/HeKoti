"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminAccountSettings } from "@/components/admin-account-settings";
import { AdminAgentChat } from "@/components/admin-agent-chat";
import { AdminEditor } from "@/components/admin-editor";
import { AdminTotpSettings, type TotpStatus } from "@/components/admin-totp-settings";

import { AdminGlobalSettings } from "@/components/admin-global-settings";
import type { Dictionary } from "@/lib/i18n";

type AdminTab = "posts" | "ai" | "settings" | "tech";

type PageRow = {
  id: string;
  title: string;
  path: string;
  contentMd: string;
  isPublished: boolean;
  navOrder: number;
};

type Msg = { id: string; role: string; content: string; createdAt: string };
type TechInfo = {
  version: string;
  next: string;
  react: string;
  prisma: string;
  db: string;
  enabledAgents: string[];
};

export function AdminDashboard({
  lang,
  initialLogin,
  initialTotpStatus,
  initialPages,
  initialMessages,
  initialActiveAgentId,
  dict,
  defaultLanguage,
  enabledLanguages,
  tech,
  initialTab,
}: {
  lang: string;
  initialLogin: string;
  initialTotpStatus: TotpStatus;
  initialPages: PageRow[];
  initialMessages: Msg[];
  initialActiveAgentId: string | null;
  dict: Dictionary;
  defaultLanguage: string;
  enabledLanguages: string[];
  tech: TechInfo;
  initialTab: AdminTab;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTabState] = useState<AdminTab>(initialTab);

  useEffect(() => {
    const raw = searchParams.get("tab");
    const next = raw === "ai" || raw === "settings" || raw === "posts" || raw === "tech" ? raw : "posts";
    setTabState(next);
  }, [searchParams]);

  const setTab = useCallback(
    (next: AdminTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      setTabState(next);
      router.replace(`/${lang}/admin?${params.toString()}`, { scroll: false });
    },
    [lang, router, searchParams],
  );

  return (
    <div>
      <div
        role="tablist"
        aria-label={dict.common.sectionsAria}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 16,
          borderBottom: "1px solid var(--line)",
          paddingBottom: 10,
        }}
      >
        {(
          [
            ["posts", dict.common.posts] as const,
            ["ai", dict.common.aiAgents] as const,
            ["settings", dict.common.settings] as const,
            ["tech", dict.common.tech] as const,
          ] as const
        ).map(([id, label]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              id={`admin-tab-${id}`}
              onClick={() => setTab(id)}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "10px 14px",
                background: active ? "color-mix(in srgb, var(--accent) 14%, var(--panel))" : "var(--panel)",
                color: active ? "var(--accent)" : "var(--fg)",
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-labelledby={`admin-tab-${tab}`} style={{ minHeight: 320 }}>
        {tab === "posts" ? (
          <AdminEditor initialPages={initialPages} lang={lang} enabledLanguages={enabledLanguages} dict={dict} />
        ) : tab === "ai" ? (
          <AdminAgentChat
            initialMessages={initialMessages}
            initialActiveAgentId={initialActiveAgentId}
            dict={dict}
          />
        ) : tab === "settings" ? (
          <>
            <AdminGlobalSettings lang={lang} defaultLanguage={defaultLanguage} enabledLanguages={enabledLanguages} dict={dict} />
            <AdminTotpSettings lang={lang} initialStatus={initialTotpStatus} dict={dict} />
            <AdminAccountSettings lang={lang} initialLogin={initialLogin} dict={dict} />
          </>
        ) : (
          <AdminTechInfo tech={tech} enabledLanguages={enabledLanguages} dict={dict} />
        )}
      </div>
    </div>
  );
}

function AdminTechInfo({
  tech,
  enabledLanguages,
  dict,
}: {
  tech: TechInfo;
  enabledLanguages: string[];
  dict: Dictionary;
}) {
  const badge: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid var(--line)",
    borderRadius: 999,
    padding: "6px 10px",
    background: "color-mix(in srgb, var(--fg) 3%, var(--panel))",
    color: "var(--fg)",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  const panel: React.CSSProperties = {
    border: "1px solid var(--line)",
    borderRadius: 12,
    background: "var(--panel)",
    padding: 12,
    marginBottom: 12,
  };

  return (
    <section style={panel}>
      <h2 style={{ marginTop: 0 }}>{dict.admin.tech.title}</h2>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={badge}>
            {dict.admin.tech.version}: {tech.version}
          </span>
          <span style={badge}>
            Next.js {tech.next}
          </span>
          <span style={badge}>
            React {tech.react}
          </span>
          <span style={badge}>
            Prisma {tech.prisma}
          </span>
          <span style={badge}>{tech.db}</span>
          <span style={badge}>{dict.admin.tech.apiRoutes}</span>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{dict.admin.tech.aiAgents}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(tech.enabledAgents.length > 0 ? tech.enabledAgents : [dict.admin.tech.noAiAgents]).map((t) => (
              <span key={t} style={badge}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{dict.admin.tech.enabledLanguages}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {enabledLanguages.map((l) => (
              <span key={l} style={badge}>
                {l.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
