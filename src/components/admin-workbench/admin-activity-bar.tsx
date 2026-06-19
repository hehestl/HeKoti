"use client";

import { Bot, FileText, Layers, Settings, Trash2, Wrench } from "lucide-react";
import { HekotiMascotMenu } from "@/components/hekoti-mascot-menu";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";
import type { AdminActivityTab } from "@/types/admin-workbench";

const mainItems: { id: AdminActivityTab; icon: typeof FileText }[] = [
  { id: "posts", icon: FileText },
  { id: "ai", icon: Bot },
  { id: "settings", icon: Settings },
  { id: "tech", icon: Wrench },
];

const bottomItems: { id: AdminActivityTab; icon: typeof Layers }[] = [
  { id: "architecture", icon: Layers },
  { id: "trash", icon: Trash2 },
];

export function AdminActivityBar({
  activity,
  onActivityChange,
  lang,
  appVersion,
  dict,
}: {
  activity: AdminActivityTab;
  onActivityChange: (tab: AdminActivityTab) => void;
  lang: string;
  appVersion: string;
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
}) {
  const labels: Record<AdminActivityTab, string> = {
    posts: dict.admin.workbench.activityPosts ?? dict.common.posts,
    ai: dict.admin.workbench.activityAi ?? dict.common.aiAgents,
    settings: dict.admin.workbench.activitySettings ?? dict.common.settings,
    tech: dict.admin.workbench.activityTech ?? dict.common.administration,
    architecture: dict.admin.workbench.activityArchitecture ?? "Architecture",
    trash: dict.admin.workbench.activityTrash ?? "Trash",
  };

  const renderBtn = (id: AdminActivityTab, Icon: typeof FileText) => {
    const active = activity === id;
    return (
      <button
        key={id}
        type="button"
        className={active ? "admin-activity-btn admin-activity-btn-active" : "admin-activity-btn"}
        aria-label={labels[id]}
        title={labels[id]}
        aria-current={active ? "page" : undefined}
        onClick={() => onActivityChange(id)}
      >
        <Icon size={22} strokeWidth={1.75} aria-hidden />
      </button>
    );
  };

  return (
    <nav className="admin-activity-bar" aria-label={dict.admin.workbench.activityBarAria ?? "Admin sections"}>
      <HekotiMascotMenu
        lang={lang}
        isAdmin
        appVersion={appVersion}
        className="admin-activity-mascot"
        imageSize={28}
        showOpenSite
        openSiteLabel={dict.admin.workbench.openOnSite}
        adminLabel={dict.admin.workbench.mascotAdmin ?? dict.common.administration}
        versionLabel={dict.admin.workbench.mascotVersion ?? "Version"}
      />
      <div className="admin-activity-items">
        {mainItems.map(({ id, icon }) => renderBtn(id, icon))}
      </div>
      <div className="admin-activity-footer">
        <div className="admin-activity-bottom-items">
          {bottomItems.map(({ id, icon }) => renderBtn(id, icon))}
        </div>
        <ThemeModeToggle
          layout="vertical"
          className="admin-activity-theme"
          labels={{
            light: dict.common.themeLight,
            dark: dict.common.themeDark,
            system: dict.common.themeSystem,
            groupAria: dict.common.themeModeAria,
          }}
        />
      </div>
    </nav>
  );
}
