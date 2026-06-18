"use client";

import { Bot, FileText, Settings, Wrench } from "lucide-react";
import { HekotiMascotLink } from "@/components/hekoti-mascot-link";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";
import type { AdminActivityTab } from "@/types/admin-workbench";

const items: { id: AdminActivityTab; icon: typeof FileText }[] = [
  { id: "posts", icon: FileText },
  { id: "ai", icon: Bot },
  { id: "settings", icon: Settings },
  { id: "tech", icon: Wrench },
];

export function AdminActivityBar({
  activity,
  onActivityChange,
  lang,
  dict,
}: {
  activity: AdminActivityTab;
  onActivityChange: (tab: AdminActivityTab) => void;
  lang: string;
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
  };

  return (
    <nav className="admin-activity-bar" aria-label={dict.admin.workbench.activityBarAria ?? "Admin sections"}>
      <HekotiMascotLink lang={lang} className="admin-activity-mascot" imageSize={28} />
      <div className="admin-activity-items">
        {items.map(({ id, icon: Icon }) => {
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
        })}
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
    </nav>
  );
}
