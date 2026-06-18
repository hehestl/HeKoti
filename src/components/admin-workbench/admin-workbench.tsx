"use client";

import type { ReactNode } from "react";
import type { AdminActivityTab } from "@/types/admin-workbench";
import { AdminActivityBar } from "@/components/admin-workbench/admin-activity-bar";
import { AdminStatusBar } from "@/components/admin-workbench/admin-status-bar";

export function AdminWorkbench({
  activity,
  onActivityChange,
  sidebar,
  main,
  status,
  dict,
  uiLang,
  version,
  previewVisible,
  onTogglePreview,
}: {
  activity: AdminActivityTab;
  onActivityChange: (tab: AdminActivityTab) => void;
  sidebar: ReactNode;
  main: ReactNode;
  status: { text: string; tone: "neutral" | "error" };
  dict: {
    common: {
      posts: string;
      aiAgents: string;
      settings: string;
      administration: string;
      themeLight: string;
      themeDark: string;
      themeSystem: string;
      themeModeAria: string;
    };
    admin: { workbench: Record<string, string> };
  };
  uiLang: string;
  version: string;
  previewVisible: boolean;
  onTogglePreview: () => void;
}) {
  return (
    <div className="admin-workbench">
      <AdminActivityBar activity={activity} onActivityChange={onActivityChange} lang={uiLang} appVersion={version} dict={dict} />
      <aside className="admin-workbench-sidebar">{sidebar}</aside>
      <div className="admin-workbench-main">{main}</div>
      <AdminStatusBar
        status={status}
        uiLang={uiLang}
        version={version}
        previewVisible={previewVisible}
        onTogglePreview={onTogglePreview}
        dict={dict.admin.workbench}
      />
    </div>
  );
}
