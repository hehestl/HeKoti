"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { AdminPathTree, type ExplorerDropState } from "@/components/admin-workbench/admin-explorer-tree";
import { ExplorerHeaderActions } from "@/components/admin-workbench/admin-explorer-header";
import {
  AdminExplorerIconPicker,
  AdminExplorerRowMenu,
  AdminExplorerSectionMenu,
} from "@/components/admin-workbench/admin-explorer-overlays";
import type { AdminExplorerActions } from "@/components/admin-workbench/admin-explorer-types";
export type { AdminExplorerActions } from "@/components/admin-workbench/admin-explorer-types";
import {
  buildDefaultOpenBranches,
  loadExpandedLangs,
  loadOpenBranches,
  persistExpandedLangs,
  persistOpenBranches,
} from "@/lib/admin-explorer-storage";
import {
  buildPathTree,
  collectPathKeys,
  pathKeysWithChildren,
} from "@/lib/page-tree";
import type { Dictionary } from "@/lib/i18n";
import type { AdminPageRow, AdminPagesByLang } from "@/types/admin-workbench";

type DropState = ExplorerDropState;

export function AdminExplorer({
  pagesByLang,
  enabledLanguages,
  dict,
  actions,
  variant = "posts",
}: {
  pagesByLang: AdminPagesByLang;
  enabledLanguages: string[];
  dict: Dictionary;
  actions: AdminExplorerActions;
  variant?: "posts" | "notes";
}) {
  const isNotes = variant === "notes";
  const [expandedLangs, setExpandedLangs] = useState(() => new Set(enabledLanguages));
  const [openBranchesByLang, setOpenBranchesByLang] = useState<Record<string, Set<string>>>(() =>
    buildDefaultOpenBranches(enabledLanguages, pagesByLang),
  );
  const [dragOver, setDragOver] = useState<DropState>(null);
  const [rowMenu, setRowMenu] = useState<null | { id: string; lang: string; x: number; y: number }>(null);
  const [sectionMenu, setSectionMenu] = useState<null | { lang: string; x: number; y: number }>(null);
  const [iconPicker, setIconPicker] = useState<null | { id: string; lang: string; x: number; y: number }>(null);

  const pruneBranches = useCallback((lang: string, pages: AdminPageRow[]) => {
    const tree = buildPathTree(pages, lang);
    const valid = collectPathKeys(tree);
    setOpenBranchesByLang((prev) => {
      const current = prev[lang] ?? new Set<string>();
      const next = new Set([...current].filter((k) => valid.has(k)));
      const merged = { ...prev, [lang]: next };
      persistOpenBranches(merged);
      return merged;
    });
  }, []);

  useEffect(() => {
    setExpandedLangs(loadExpandedLangs(enabledLanguages));
    const stored = loadOpenBranches();
    setOpenBranchesByLang(() => {
      const next: Record<string, Set<string>> = {};
      for (const lang of enabledLanguages) {
        const pages = pagesByLang[lang] ?? [];
        const tree = buildPathTree(pages, lang);
        next[lang] = new Set(stored[lang] ?? [...pathKeysWithChildren(tree)]);
      }
      return next;
    });
  }, [enabledLanguages, pagesByLang]);

  useEffect(() => {
    for (const lang of enabledLanguages) {
      pruneBranches(lang, pagesByLang[lang] ?? []);
    }
  }, [enabledLanguages, pagesByLang, pruneBranches]);

  const toggleLang = (lang: string) => {
    setExpandedLangs((prev) => {
      const next = new Set(prev);
      if (next.has(lang)) next.delete(lang);
      else next.add(lang);
      persistExpandedLangs(next);
      return next;
    });
  };

  const setBranchesForLang = (lang: string, next: Set<string>) => {
    setOpenBranchesByLang((prev) => {
      const merged = { ...prev, [lang]: next };
      persistOpenBranches(merged);
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
      persistExpandedLangs(next);
      return next;
    });
  };

  const expandSection = (lang: string) => {
    setExpandedLangs((prev) => {
      const next = new Set(prev);
      next.add(lang);
      persistExpandedLangs(next);
      return next;
    });
  };

  const activeId = actions.activePageId ?? "";
  const wb = dict.admin.workbench;

  return (
    <div className={`admin-explorer${isNotes ? " admin-notes-mode" : ""}`}>
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
          const openBranches = openBranchesByLang[lang] ?? pathKeysWithChildren(tree);
          return (
            <section key={lang} className="admin-explorer-lang-section">
              <div className="admin-explorer-header-row admin-explorer-lang-header-row">
                <button
                  type="button"
                  className="admin-explorer-lang-header"
                  onClick={() => toggleLang(lang)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSectionMenu({ lang, x: e.clientX, y: e.clientY });
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
                  onContextMenu={(e) => {
                    if ((e.target as HTMLElement).closest(".admin-tree-row")) return;
                    e.preventDefault();
                    setSectionMenu({ lang, x: e.clientX, y: e.clientY });
                  }}
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
                      onSelect={(id) => {
                        const page = pages.find((p) => p.id === id);
                        if (page) actions.onSelectPage(page);
                      }}
                      onContextMenu={(page, x, y) => setRowMenu({ id: page.id, lang, x, y })}
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
          onClose={() => setRowMenu(null)}
          onOpenIconPicker={(id, lang, x, y) => {
            setRowMenu(null);
            setIconPicker({ id, lang, x, y });
          }}
        />
      ) : null}
      {iconPicker ? (
        <AdminExplorerIconPicker
          iconPicker={iconPicker}
          dict={dict}
          actions={actions}
          onClose={() => setIconPicker(null)}
        />
      ) : null}
      {sectionMenu ? (
        <AdminExplorerSectionMenu
          sectionMenu={sectionMenu}
          dict={dict}
          actions={actions}
          onCollapseSection={collapseSection}
          onExpandSection={expandSection}
          onClose={() => setSectionMenu(null)}
        />
      ) : null}
    </div>
  );
}
