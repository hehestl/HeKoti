"use client";

import { AdminContextMenu } from "@/components/admin-workbench/admin-context-menu";
import type { AdminExplorerActions } from "@/components/admin-workbench/admin-explorer-types";
import type { Dictionary } from "@/lib/i18n";
import { buildAdminExplorerRowMenuItems } from "@/lib/admin-explorer-row-menu";
import type { AdminContextMenuItem, AdminPagesByLang } from "@/types/admin-workbench";
import type { WikiIconKey } from "@/lib/wiki-icon-presets";
import { WIKI_ICON_PRESETS } from "@/lib/wiki-icon-presets";

export function AdminExplorerRowMenu({
  rowMenu,
  pagesByLang,
  dict,
  isNotes,
  actions,
  onClose,
  onOpenIconPicker,
}: {
  rowMenu: { id: string; lang: string; x: number; y: number };
  pagesByLang: AdminPagesByLang;
  dict: Dictionary;
  isNotes: boolean;
  actions: AdminExplorerActions;
  onClose: () => void;
  onOpenIconPicker: (id: string, lang: string, x: number, y: number) => void;
}) {
  const page = (pagesByLang[rowMenu.lang] ?? []).find((p) => p.id === rowMenu.id);
  if (!page) return null;
  return (
    <AdminContextMenu
      x={rowMenu.x}
      y={rowMenu.y}
      items={buildAdminExplorerRowMenuItems(page, rowMenu.x, rowMenu.y, {
        dict,
        isNotes,
        pagesByLang,
        actions,
        onOpenIconPicker,
      })}
      onClose={onClose}
    />
  );
}

export function AdminExplorerIconPicker({
  iconPicker,
  dict,
  actions,
  onClose,
}: {
  iconPicker: { id: string; lang: string; x: number; y: number };
  dict: Dictionary;
  actions: AdminExplorerActions;
  onClose: () => void;
}) {
  const items: AdminContextMenuItem[] = [
    ...(Object.keys(WIKI_ICON_PRESETS) as WikiIconKey[]).map((key) => ({
      id: key,
      label: key,
      onClick: () => {
        actions.onChangeIcon(iconPicker.id, iconPicker.lang, key);
        onClose();
      },
    })),
    { id: "sep", label: "", separator: true },
    {
      id: "clear",
      label: dict.admin.posts.clearIcon,
      onClick: () => {
        actions.onChangeIcon(iconPicker.id, iconPicker.lang, null);
        onClose();
      },
    },
  ];
  return (
    <AdminContextMenu
      x={iconPicker.x || 120}
      y={iconPicker.y || 120}
      items={items}
      onClose={onClose}
    />
  );
}

export function AdminExplorerSectionMenu({
  sectionMenu,
  dict,
  actions,
  onCollapseSection,
  onExpandSection,
  onClose,
}: {
  sectionMenu: { lang: string; x: number; y: number };
  dict: Dictionary;
  actions: AdminExplorerActions;
  onCollapseSection: (lang: string) => void;
  onExpandSection: (lang: string) => void;
  onClose: () => void;
}) {
  const wb = dict.admin.workbench;
  return (
    <AdminContextMenu
      x={sectionMenu.x}
      y={sectionMenu.y}
      items={[
        { id: "root", label: wb.createAtRoot, onClick: () => actions.onCreateAtRoot(sectionMenu.lang) },
        { id: "cat", label: wb.createCategory, onClick: () => actions.onCreateCategory(sectionMenu.lang, []) },
        {
          id: "collapse",
          label: wb.collapseSection,
          onClick: () => onCollapseSection(sectionMenu.lang),
        },
        {
          id: "expand",
          label: wb.expandSection,
          onClick: () => onExpandSection(sectionMenu.lang),
        },
      ]}
      onClose={onClose}
    />
  );
}
