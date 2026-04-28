"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminAccountSettings } from "@/components/admin-account-settings";
import { AdminAgentChat } from "@/components/admin-agent-chat";
import { AdminEditor } from "@/components/admin-editor";
import { AdminTotpSettings, type TotpStatus } from "@/components/admin-totp-settings";

import { AdminGlobalSettings } from "@/components/admin-global-settings";
import type { Dictionary } from "@/lib/i18n";

type AdminTab = "posts" | "ai" | "settings";

type PageRow = {
  id: string;
  title: string;
  path: string;
  contentMd: string;
  isPublished: boolean;
  navOrder: number;
};

type Msg = { id: string; role: string; content: string; createdAt: string };

export function AdminDashboard({
  lang,
  initialLogin,
  initialTotpStatus,
  initialPages,
  initialMessages,
  initialActiveAgentId,
  dict,
  defaultLanguage,
}: {
  lang: string;
  initialLogin: string;
  initialTotpStatus: TotpStatus;
  initialPages: PageRow[];
  initialMessages: Msg[];
  initialActiveAgentId: string | null;
  dict: Dictionary;
  defaultLanguage: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = useMemo((): AdminTab => {
    const raw = searchParams.get("tab");
    if (raw === "ai" || raw === "settings" || raw === "posts") return raw;
    return "posts";
  }, [searchParams]);

  const setTab = useCallback(
    (next: AdminTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`/${lang}/admin?${params.toString()}`, { scroll: false });
    },
    [lang, router, searchParams],
  );

  return (
    <div>
      <div
        role="tablist"
        aria-label="Разделы админки"
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
          <AdminEditor initialPages={initialPages} lang={lang} />
        ) : tab === "ai" ? (
          <AdminAgentChat initialMessages={initialMessages} initialActiveAgentId={initialActiveAgentId} />
        ) : (
          <>
            <AdminTotpSettings lang={lang} initialStatus={initialTotpStatus} />
            <AdminAccountSettings lang={lang} initialLogin={initialLogin} />
          </>
        )}
      </div>
    </div>
  );
}
