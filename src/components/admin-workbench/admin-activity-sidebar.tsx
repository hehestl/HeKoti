"use client";

import type { AdminActivityTab } from "@/types/admin-workbench";

export function AdminActivitySidebar({
  activity,
  settingsSection,
  onSettingsSection,
  dict,
}: {
  activity: AdminActivityTab;
  settingsSection: string;
  onSettingsSection: (id: string) => void;
  dict: Record<string, string>;
}) {
  if (activity === "posts") {
    return null;
  }

  if (activity === "ai") {
    return (
      <div className="admin-sidebar-panel">
        <div className="admin-sidebar-panel-title">{dict.aiSidebarTitle}</div>
        <p className="admin-sidebar-hint">{dict.aiSidebarHint}</p>
      </div>
    );
  }

  if (activity === "settings") {
    const sections = [
      { id: "global", label: dict.settingsGlobal },
      { id: "totp", label: dict.settingsTotp },
      { id: "account", label: dict.settingsAccount },
    ];
    return (
      <div className="admin-sidebar-panel">
        <div className="admin-sidebar-panel-title">{dict.settingsSidebarTitle}</div>
        <ul className="admin-sidebar-nav">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={settingsSection === s.id ? "admin-sidebar-nav-btn admin-sidebar-nav-btn-active" : "admin-sidebar-nav-btn"}
                onClick={() => onSettingsSection(s.id)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="admin-sidebar-panel">
      <div className="admin-sidebar-panel-title">{dict.techSidebarTitle}</div>
    </div>
  );
}
