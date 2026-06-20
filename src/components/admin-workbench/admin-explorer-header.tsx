"use client";

import type { ReactNode } from "react";
import {
  FilePlus,
  FolderPlus,
  FoldVertical,
  RefreshCw,
  UnfoldVertical,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

export function ExplorerHeaderActions({
  dict,
  onNewArticle,
  onNewCategory,
  onRefresh,
  onCollapseAll,
  onExpandAll,
}: {
  dict: Dictionary;
  onNewArticle: () => void;
  onNewCategory: () => void;
  onRefresh: () => void;
  onCollapseAll: () => void;
  onExpandAll?: () => void;
}) {
  const wb = dict.admin.workbench;
  const btn = (label: string, onClick: () => void, icon: ReactNode) => (
    <button type="button" className="admin-explorer-action-btn" aria-label={label} title={label} onClick={onClick}>
      {icon}
    </button>
  );
  return (
    <div className="admin-explorer-actions">
      {btn(wb.createArticle, onNewArticle, <FilePlus size={14} strokeWidth={1.75} aria-hidden />)}
      {btn(wb.createCategory, onNewCategory, <FolderPlus size={14} strokeWidth={1.75} aria-hidden />)}
      {btn(wb.refresh, onRefresh, <RefreshCw size={14} strokeWidth={1.75} aria-hidden />)}
      {btn(wb.collapseAll, onCollapseAll, <FoldVertical size={14} strokeWidth={1.75} aria-hidden />)}
      {onExpandAll
        ? btn(wb.expandAll, onExpandAll, <UnfoldVertical size={14} strokeWidth={1.75} aria-hidden />)
        : null}
    </div>
  );
}
