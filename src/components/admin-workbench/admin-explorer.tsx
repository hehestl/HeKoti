"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { AdminPathTree, type ExplorerDropState } from "@/components/admin-workbench/admin-explorer-tree";
import { ExplorerHeaderActions } from "@/components/admin-workbench/admin-explorer-header";
import {
  AdminExplorerRowMenu,
  AdminExplorerSectionMenu,
} from "@/components/admin-workbench/admin-explorer-overlays";
import type { AdminExplorerActions } from "@/components/admin-workbench/admin-explorer-types";
export type { AdminExplorerActions } from "@/components/admin-workbench/admin-explorer-types";
import {
  loadExpandedLangs,
  loadOpenBranchesState,
  persistExpandedLangs,
  persistOpenBranches,
} from "@/lib/admin-explorer-storage";
import {
  collectVisibleTreePages,
  expandablePathKeysForPages,
  resolveSelectedPages,
} from "@/lib/admin-explorer-selection";
import {
  buildPathTree,
  collectPathKeys,
  pathKeysBranchingToTarget,
  pathKeysWithChildren,
} from "@/lib/page-tree";
import { useAdminExplorerSelection } from "@/hooks/use-admin-explorer-selection";
import type { Dictionary } from "@/lib/i18n";
import type { AdminPageRow, AdminPagesByLang } from "@/types/admin-workbench";

type DropState = ExplorerDropState;

export function AdminExplorer({
  pagesByLang,
  enabledLanguages,
  dict,
  actions,
  variant = "posts",
  revealPagePath = null,
  onRevealPageDone,
}: {
  pagesByLang: AdminPagesByLang;
  enabledLanguages: string[];
  dict: Dictionary;
  actions: AdminExplorerActions;
  variant?: "posts" | "notes";
  revealPagePath?: { lang: string; path: string } | null;
  onRevealPageDone?: () => void;
}) {
  const isNotes = variant === "notes";
  const storageVariant = isNotes ? "notes" : "posts";

  const [expandedLangs, setExpandedLangs] = useState(() => loadExpandedLangs(enabledLanguages, storageVariant));
  const [openBranchesByLang, setOpenBranchesByLang] = useState<Record<string, Set<string>>>(() =>
    loadOpenBranchesState(enabledLanguages, pagesByLang, storageVariant),
  );
  const [dragOver, setDragOver] = useState<DropState>(null);
  const [rowMenu, setRowMenu] = useState<null | { id: string; lang: string; x: number; y: number }>(null);
  const [sectionMenu, setSectionMenu] = useState<null | { lang: string; x: number; y: number }>(null);
  const selection = useAdminExplorerSelection();

  const closeAllMenus = useCallback(() => {
    setRowMenu(null);
    setSectionMenu(null);
  }, []);

  const openRowMenu = useCallback((id: string, lang: string, x: number, y: number) => {
    setSectionMenu(null);
    setRowMenu({ id, lang, x, y });
  }, []);

  const openSectionMenu = useCallback((lang: string, x: number, y: number) => {
    setRowMenu(null);
    setSectionMenu({ lang, x, y });
  }, []);

  const pruneBranches = useCallback(
    (lang: string, pages: AdminPageRow[]) => {
      const tree = buildPathTree(pages, lang);
      const valid = collectPathKeys(tree);
      setOpenBranchesByLang((prev) => {
        const current = prev[lang] ?? new Set<string>();
        const next = new Set([...current].filter((k) => valid.has(k)));
        if (next.size === current.size && [...next].every((k) => current.has(k))) return prev;
        const merged = { ...prev, [lang]: next };
        persistOpenBranches(merged, storageVariant);
        return merged;
      });
    },
    [storageVariant],
  );

  useEffect(() => {
    setExpandedLangs(loadExpandedLangs(enabledLanguages, storageVariant));
    setOpenBranchesByLang(loadOpenBranchesState(enabledLanguages, pagesByLang, storageVariant));
  }, [enabledLanguages, storageVariant]);

  useEffect(() => {
    for (const lang of enabledLanguages) {
      pruneBranches(lang, pagesByLang[lang] ?? []);
    }
  }, [enabledLanguages, pagesByLang, pruneBranches]);

  useEffect(() => {
    if (!revealPagePath) return;
    const { lang, path } = revealPagePath;
    const tree = buildPathTree(pagesByLang[lang] ?? [], lang);
    const keys = pathKeysBranchingToTarget(tree, path);
    if (keys.size === 0) {
      onRevealPageDone?.();
      return;
    }
    setOpenBranchesByLang((prev) => {
      const current = prev[lang] ?? new Set<string>();
      const next = new Set([...current, ...keys]);
      const merged = { ...prev, [lang]: next };
      persistOpenBranches(merged, storageVariant);
      return merged;
    });
    onRevealPageDone?.();
  }, [revealPagePath, pagesByLang, storageVariant, onRevealPageDone]);

  const toggleLang = (lang: string) => {
    setExpandedLangs((prev) => {
      const next = new Set(prev);
      if (next.has(lang)) next.delete(lang);
      else next.add(lang);
      persistExpandedLangs(next, storageVariant);
      return next;
    });
  };

  const setBranchesForLang = (lang: string, next: Set<string>) => {
    setOpenBranchesByLang((prev) => {
      const merged = { ...prev, [lang]: next };
      persistOpenBranches(merged, storageVariant);
      return merged;
    });
  };

  const collapseAllBranches = (lang: string) => setBranchesForLang(lang, new Set());
  const expandAllBranches = (lang: string) => {
    const tree = buildPathTree(pagesByLang[lang] ?? [], lang);
    setBranchesForLang(lang, pathKeysWithChildren(tree));
  };

  const collapseSection = (lang: string) => {
    setExpandedLangs((prev) => {
      const next = new Set(prev);
      next.delete(lang);
      persistExpandedLangs(next, storageVariant);
      return next;
    });
  };

  const expandSection = (lang: string) => {
    setExpandedLangs((prev) => {
      const next = new Set(prev);
      next.add(lang);
      persistExpandedLangs(next, storageVariant);
      return next;
    });
  };

  const activeId = actions.activePageId ?? "";
  const wb = dict.admin.workbench;
  const selectedPages = resolveSelectedPages(selection.selected, pagesByLang);

  const expandBranchesForPages = (pages: AdminPageRow[]) => {
    const byLang = new Map<string, AdminPageRow[]>();
    for (const p of pages) {
      const list = byLang.get(p.lang) ?? [];
      list.push(p);
      byLang.set(p.lang, list);
    }
    for (const [lang, langPages] of byLang) {
      const all = pagesByLang[lang] ?? [];
      const keys = expandablePathKeysForPages(langPages, all);
      const next = new Set(openBranchesByLang[lang] ?? []);
      for (const k of keys) next.add(k);
      setBranchesForLang(lang, next);
    }
  };

  const collapseBranchesForPages = (pages: AdminPageRow[]) => {
    const byLang = new Map<string, AdminPageRow[]>();
    for (const p of pages) {
      const list = byLang.get(p.lang) ?? [];
      list.push(p);
      byLang.set(p.lang, list);
    }
    for (const [lang, langPages] of byLang) {
      const all = pagesByLang[lang] ?? [];
      const keys = expandablePathKeysForPages(langPages, all);
      const next = new Set(openBranchesByLang[lang] ?? []);
      for (const k of keys) next.delete(k);
      setBranchesForLang(lang, next);
    }
  };

  return (
    <div className={`admin-explorer${isNotes ? " admin-notes-mode" : ""}`}>
      {selection.selectedCount >= 2 ? (
        <div className="admin-explorer-selection-bar">
          <span className="admin-explorer-selection-count">
            {wb.selectionCount.replace("{count}", String(selection.selectedCount))}
          </span>
          <div className="admin-explorer-selection-actions">
            {!isNotes && actions.onBulkSetPublished ? (
              <>
                <button type="button" className="admin-explorer-selection-btn" onClick={() => void actions.onBulkSetPublished?.(selectedPages, true)}>
                  {wb.bulkPublish}
                </button>
                <button type="button" className="admin-explorer-selection-btn" onClick={() => void actions.onBulkSetPublished?.(selectedPages, false)}>
                  {wb.bulkUnpublish}
                </button>
              </>
            ) : null}
            <button type="button" className="admin-explorer-selection-btn" onClick={() => expandBranchesForPages(selectedPages)}>
              {wb.bulkExpand}
            </button>
            <button type="button" className="admin-explorer-selection-btn" onClick={() => collapseBranchesForPages(selectedPages)}>
              {wb.bulkCollapse}
            </button>
            <button type="button" className="admin-explorer-selection-btn admin-explorer-selection-btn-muted" onClick={selection.clearSelection}>
              {wb.selectionClear}
            </button>
          </div>
        </div>
      ) : null}
      <div className="admin-explorer-header-row">
        <div className="admin-explorer-title">{wb.explorerTitle}</div>
        <ExplorerHeaderActions
          dict={dict}
          onNewArticle={() => actions.onCreateAtRoot(enabledLanguages[0] ?? "en")}
          onNewCategory={() => actions.onCreateCategory(enabledLanguages[0] ?? "en", [])}
          onRefresh={() => actions.onRefresh("all")}
          onCollapseAll={() => {
            for (const lang of enabledLanguages) collapseAllBranches(lang);
          }}
          onExpandAll={() => {
            for (const lang of enabledLanguages) expandAllBranches(lang);
          }}
        />
      </div>
      <div className="admin-explorer-scroll repo-sidebar-scroll-subtle">
        {enabledLanguages.map((lang) => {
          const pages = pagesByLang[lang] ?? [];
          const expanded = expandedLangs.has(lang);
          const tree = buildPathTree(pages, lang);
          const openBranches = openBranchesByLang[lang] ?? new Set<string>();
          return (
            <section key={lang} className="admin-explorer-lang-section">
              <div className="admin-explorer-header-row admin-explorer-lang-header-row">
                <button
                  type="button"
                  className="admin-explorer-lang-header"
                  onClick={() => toggleLang(lang)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openSectionMenu(lang, e.clientX, e.clientY);
                  }}
                >
                  <ChevronRight
                    size={14}
                    className={expanded ? "admin-explorer-chevron admin-explorer-chevron-open" : "admin-explorer-chevron"}
                    aria-hidden
                  />
                  <span>{lang.toUpperCase()}</span>
                  <span className="admin-explorer-lang-count">({pages.length})</span>
                </button>
                <ExplorerHeaderActions
                  dict={dict}
                  onNewArticle={() => actions.onCreateAtRoot(lang)}
                  onNewCategory={() => actions.onCreateCategory(lang, [])}
                  onRefresh={() => actions.onRefresh(lang)}
                  onCollapseAll={() => collapseAllBranches(lang)}
                  onExpandAll={() => expandAllBranches(lang)}
                />
              </div>
              {expanded ? (
                <div
                  className="admin-explorer-lang-body"
                  onDragOver={(e) => {
                    if (!e.dataTransfer.types.includes("text/plain")) return;
                    e.preventDefault();
                    setDragOver({ kind: "root", lang });
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setDragOver(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromId = e.dataTransfer.getData("text/plain");
                    if (!fromId) return;
                    actions.onMoveByDrop(fromId, lang, { kind: "root" });
                    setDragOver(null);
                  }}
                >
                  {tree.length === 0 ? (
                    <p className="admin-sidebar-hint">{dict.admin.posts.noPages}</p>
                  ) : (
                    <AdminPathTree
                      nodes={tree}
                      lang={lang}
                      activeId={actions.activePageLang === lang ? activeId : ""}
                      selectedIds={selection.selected}
                      dragOver={dragOver}
                      setDragOver={setDragOver}
                      openBranches={openBranches}
                      toggleBranch={(pathKey) => {
                        const next = new Set(openBranches);
                        if (next.has(pathKey)) next.delete(pathKey);
                        else next.add(pathKey);
                        setBranchesForLang(lang, next);
                      }}
                      dict={dict}
                      onSelect={(page, e) => {
                        const visible = collectVisibleTreePages(tree, openBranches);
                        const { openTab } = selection.handleRowClick(page, e, visible);
                        if (openTab) actions.onSelectPage(page);
                      }}
                      onContextMenu={(page, x, y) => {
                        if (!selection.isSelected(lang, page.id)) selection.selectSingle(page);
                        openRowMenu(page.id, lang, x, y);
                      }}
                      onMoveByDrop={actions.onMoveByDrop}
                      variant={variant}
                    />
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
      {rowMenu ? (
        <AdminExplorerRowMenu
          rowMenu={rowMenu}
          pagesByLang={pagesByLang}
          dict={dict}
          isNotes={isNotes}
          actions={actions}
          selected={selection.selected}
          onClose={closeAllMenus}
          onExpandSelected={expandBranchesForPages}
          onCollapseSelected={collapseBranchesForPages}
        />
      ) : sectionMenu ? (
        <AdminExplorerSectionMenu
          sectionMenu={sectionMenu}
          pagesByLang={pagesByLang}
          dict={dict}
          isNotes={isNotes}
          actions={actions}
          onCollapseSection={collapseSection}
          onExpandSection={expandSection}
          onClose={closeAllMenus}
        />
      ) : null}
    </div>
  );
}
