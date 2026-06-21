"use client";

import { AdminContextMenu } from "@/components/admin-workbench/admin-context-menu";
import type { AdminExplorerActions } from "@/components/admin-workbench/admin-explorer-types";
import type { Dictionary } from "@/lib/i18n";
import { buildAdminExplorerBulkMenuItems, buildAdminExplorerRowMenuItems } from "@/lib/admin-explorer-row-menu";
import type { AdminPageRow, AdminPagesByLang } from "@/types/admin-workbench";

export function AdminExplorerRowMenu({
  rowMenu,
  pagesByLang,
  dict,
  isNotes,
  actions,
  selected,
  onClose,
  onExpandSelected,
  onCollapseSelected,
}: {
  rowMenu: { id: string; lang: string; x: number; y: number };
  pagesByLang: AdminPagesByLang;
  dict: Dictionary;
  isNotes: boolean;
  actions: AdminExplorerActions;
  selected: Set<string>;
  onClose: () => void;
  onExpandSelected: (pages: AdminPageRow[]) => void;
  onCollapseSelected: (pages: AdminPageRow[]) => void;
}) {
  const page = (pagesByLang[rowMenu.lang] ?? []).find((p) => p.id === rowMenu.id);
  if (!page) return null;

  const bulk = buildAdminExplorerBulkMenuItems(selected, pagesByLang, {
    dict,
    isNotes,
    actions,
    onExpandSelected,
    onCollapseSelected,
  });
  const rowItems = buildAdminExplorerRowMenuItems(page, {
    dict,
    isNotes,
    pagesByLang,
    actions,
  });
  const items = bulk.length > 0 ? [...bulk, { id: "bulk-sep2", label: "", separator: true }, ...rowItems] : rowItems;

  return (
    <AdminContextMenu
      x={rowMenu.x}
      y={rowMenu.y}
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
