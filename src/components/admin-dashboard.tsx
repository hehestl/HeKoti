"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminAccountSettings } from "@/components/admin-account-settings";
import { AdminAgentChat } from "@/components/admin-agent-chat";
import { AdminEditorExplorer, AdminEditorMain, AdminPostsEditorProvider } from "@/components/admin-editor";
import { AdminTotpSettings, type TotpStatus } from "@/components/admin-totp-settings";
import { AdminGlobalSettings } from "@/components/admin-global-settings";
import { AdminSiteConfig } from "@/components/admin-site-config";
import { AdminTrashView } from "@/components/admin-trash-view";
import { AdminArchitectureView } from "@/components/admin-architecture-view";
import { AdminPagesProvider } from "@/components/admin-workbench/admin-pages-provider";
import { AdminWorkbench } from "@/components/admin-workbench/admin-workbench";
import { AdminActivitySidebar } from "@/components/admin-workbench/admin-activity-sidebar";
import { useAdminWorkbenchUi } from "@/hooks/use-admin-workbench-ui";
import type { AdminActivityTab, AdminPagesByLang } from "@/types/admin-workbench";
import type { Dictionary } from "@/lib/i18n";

type Msg = { id: string; role: string; content: string; createdAt: string };
type TechInfo = {
  version: string;
  next: string;
  react: string;
  prisma: string;
  db: string;
};

type AgentRow = { id: string; title: string; enabled: boolean; hasApi: boolean };

function AdminWorkbenchInner({
  tab,
  setTab,
  lang,
  status,
  dict,
  tech,
  workbenchUi,
  settingsSection,
  setSettingsSection,
  enabledLanguages,
  initialActivePath,
  initialActiveAgentId,
  initialMessages,
  initialLogin,
  initialTotpStatus,
  defaultLanguage,
  headHtml,
  bodyHtml,
  wikiTreeGuideColor,
  knownLanguages,
  aiAgents,
  onStatusChange,
}: {
  tab: AdminActivityTab;
  setTab: (t: AdminActivityTab) => void;
  lang: string;
  status: { text: string; tone: "neutral" | "error" };
  dict: Dictionary;
  tech: TechInfo;
  workbenchUi: ReturnType<typeof useAdminWorkbenchUi>;
  settingsSection: string;
  setSettingsSection: (s: string) => void;
  enabledLanguages: string[];
  initialActivePath?: string;
  initialActiveAgentId: string | null;
  initialMessages: Msg[];
  initialLogin: string;
  initialTotpStatus: TotpStatus;
  defaultLanguage: string;
  headHtml: string;
  bodyHtml: string;
  wikiTreeGuideColor: string | null;
  knownLanguages: string[];
  aiAgents: AgentRow[];
  onStatusChange: (text: string, tone: "neutral" | "error") => void;
}) {
  const sidebar =
    tab === "posts" ? (
      <AdminEditorExplorer />
    ) : tab === "trash" || tab === "architecture" ? null : (
      <AdminActivitySidebar
        activity={tab}
        settingsSection={settingsSection}
        onSettingsSection={setSettingsSection}
        dict={dict.admin.workbench}
      />
    );

  const main =
    tab === "posts" ? (
      <AdminEditorMain />
    ) : tab === "trash" ? (
      <AdminTrashView enabledLanguages={enabledLanguages} dict={dict} onStatusChange={(t, tone) => onStatusChange(t, tone ?? "neutral")} />
    ) : tab === "architecture" ? (
      <AdminArchitectureView
        enabledLanguages={enabledLanguages}
        dict={dict}
        activeAgentId={initialActiveAgentId}
        onStatusChange={(t, tone) => onStatusChange(t, tone ?? "neutral")}
      />
    ) : tab === "ai" ? (
      <AdminAgentChat initialMessages={initialMessages} initialActiveAgentId={initialActiveAgentId} dict={dict} />
    ) : tab === "settings" ? (
      <div className="admin-settings-main">
        {settingsSection === "global" ? (
          <AdminGlobalSettings
            defaultLanguage={defaultLanguage}
            enabledLanguages={enabledLanguages}
            headHtml={headHtml}
            bodyHtml={bodyHtml}
            wikiTreeGuideColor={wikiTreeGuideColor}
            dict={dict}
          />
        ) : null}
        {settingsSection === "totp" ? (
          <AdminTotpSettings lang={lang} initialStatus={initialTotpStatus} dict={dict} />
        ) : null}
        {settingsSection === "account" ? (
          <AdminAccountSettings lang={lang} initialLogin={initialLogin} dict={dict} />
        ) : null}
      </div>
    ) : (
      <AdminSiteConfig
        dict={dict}
        tech={tech}
        initialKnownLanguages={knownLanguages}
        initialEnabledLanguages={enabledLanguages}
        initialAgents={aiAgents}
      />
    );

  return (
    <AdminWorkbench
      activity={tab}
      onActivityChange={setTab}
      sidebar={sidebar}
      main={main}
      status={status}
      dict={dict}
      uiLang={lang}
      version={tech.version}
      previewVisible={workbenchUi.previewVisible}
      onTogglePreview={workbenchUi.togglePreview}
    />
  );
}

export function AdminDashboard({
  lang,
  initialLogin,
  initialTotpStatus,
  initialPagesByLang,
  initialMessages,
  initialActiveAgentId,
  dict,
  defaultLanguage,
  headHtml,
  bodyHtml,
  wikiTreeGuideColor,
  enabledLanguages,
  knownLanguages,
  aiAgents,
  tech,
  initialTab,
  initialActivePath,
}: {
  lang: string;
  initialLogin: string;
  initialTotpStatus: TotpStatus;
  initialPagesByLang: AdminPagesByLang;
  initialMessages: Msg[];
  initialActiveAgentId: string | null;
  dict: Dictionary;
  defaultLanguage: string;
  headHtml: string;
  bodyHtml: string;
  wikiTreeGuideColor: string | null;
  enabledLanguages: string[];
  knownLanguages: string[];
  aiAgents: AgentRow[];
  tech: TechInfo;
  initialTab: AdminActivityTab;
  initialActivePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workbenchUi = useAdminWorkbenchUi();
  const [status, setStatus] = useState<{ text: string; tone: "neutral" | "error" }>({
    text: dict.admin.posts.idle,
    tone: "neutral",
  });
  const [settingsSection, setSettingsSection] = useState("global");

  const tab = useMemo((): AdminActivityTab => {
    const raw = searchParams.get("tab");
    if (
      raw === "ai" ||
      raw === "settings" ||
      raw === "posts" ||
      raw === "tech" ||
      raw === "architecture" ||
      raw === "trash"
    ) {
      return raw;
    }
    return initialTab;
  }, [searchParams, initialTab]);

  const setTab = useCallback(
    (next: AdminActivityTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`/${lang}/admin?${params.toString()}`, { scroll: false });
    },
    [lang, router, searchParams],
  );

  const onStatusChange = useCallback((text: string, tone: "neutral" | "error") => {
    setStatus({ text, tone });
  }, []);

  const innerProps = {
    tab,
    setTab,
    lang,
    status,
    dict,
    tech,
    workbenchUi,
    settingsSection,
    setSettingsSection,
    enabledLanguages,
    initialActivePath,
    initialActiveAgentId,
    initialMessages,
    initialLogin,
    initialTotpStatus,
    defaultLanguage,
    headHtml,
    bodyHtml,
    wikiTreeGuideColor,
    knownLanguages,
    aiAgents,
    onStatusChange,
  };

  return (
    <AdminPagesProvider initialPagesByLang={initialPagesByLang}>
      {tab === "posts" ? (
        <AdminPostsEditorProvider
          uiLang={lang}
          enabledLanguages={enabledLanguages}
          dict={dict}
          initialActivePath={initialActivePath}
          activeAgentId={initialActiveAgentId}
          onStatusChange={onStatusChange}
          previewVisible={workbenchUi.previewVisible}
          splitRatio={workbenchUi.splitRatio}
          onSplitRatioChange={workbenchUi.updateSplitRatio}
        >
          <AdminWorkbenchInner {...innerProps} />
        </AdminPostsEditorProvider>
      ) : (
        <AdminWorkbenchInner {...innerProps} />
      )}
    </AdminPagesProvider>
  );
}
