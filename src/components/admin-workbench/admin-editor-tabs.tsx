"use client";

import { useCallback, useState } from "react";
import { AdminContextMenu } from "@/components/admin-workbench/admin-context-menu";
import type { AdminContextMenuItem, AdminOpenTab } from "@/types/admin-workbench";
import { tabKey } from "@/hooks/use-admin-open-tabs";

export function AdminEditorTabs({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onSave,
  dict,
}: {
  tabs: AdminOpenTab[];
  activeTabId: string;
  onSelect: (key: string) => void;
  onClose: (pageId: string, lang: string) => void;
  onSave?: (pageId: string, lang: string) => void;
  dict: Record<string, string>;
}) {
  const [menu, setMenu] = useState<null | { key: string; x: number; y: number }>(null);

  const buildMenuItems = useCallback(
    (t: AdminOpenTab): AdminContextMenuItem[] => {
      const items: AdminContextMenuItem[] = [
        {
          id: "close",
          label: dict.closeTab,
          onClick: () => onClose(t.pageId, t.lang),
        },
        {
          id: "close-others",
          label: dict.closeOthers,
          onClick: () => {
            for (const other of tabs) {
              if (other.pageId === t.pageId && other.lang === t.lang) continue;
              onClose(other.pageId, other.lang);
            }
          },
        },
        {
          id: "close-all",
          label: dict.closeAll,
          onClick: () => {
            for (const other of [...tabs]) {
              onClose(other.pageId, other.lang);
            }
          },
        },
      ];
      if (t.dirty && onSave) {
        items.unshift({
          id: "save",
          label: dict.saveTab,
          shortcut: "Ctrl+S",
          onClick: () => onSave(t.pageId, t.lang),
        });
        items.splice(1, 0, { id: "sep1", label: "", separator: true });
      }
      return items;
    },
    [dict, onClose, onSave, tabs],
  );

  if (tabs.length === 0) {
    return <div className="admin-editor-tabs admin-editor-tabs-empty">{dict.noOpenTabs}</div>;
  }

  return (
    <>
      <div className="admin-editor-tabs" role="tablist">
        {tabs.map((t) => {
          const key = tabKey(t.pageId, t.lang);
          const active = key === activeTabId;
          return (
            <div
              key={key}
              role="tab"
              aria-selected={active}
              className={active ? "admin-editor-tab admin-editor-tab-active" : "admin-editor-tab"}
              onClick={() => onSelect(key)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  onClose(t.pageId, t.lang);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ key, x: e.clientX, y: e.clientY });
              }}
            >
              <span className={t.dirty ? "admin-editor-tab-label admin-editor-tab-dirty" : "admin-editor-tab-label"}>
                [{t.lang.toUpperCase()}] {t.title}
                {t.dirty ? " *" : ""}
              </span>
              <button
                type="button"
                className="admin-editor-tab-close"
                aria-label={dict.closeTab}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(t.pageId, t.lang);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      {menu ? (
        <AdminContextMenu
          x={menu.x}
          y={menu.y}
          items={buildMenuItems(tabs.find((t) => tabKey(t.pageId, t.lang) === menu.key) ?? tabs[0]!)}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </>
  );
}
