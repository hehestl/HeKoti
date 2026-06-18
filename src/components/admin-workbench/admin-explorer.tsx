"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  FilePlus,
  FolderPlus,
  FoldVertical,
  RefreshCw,
  UnfoldVertical,
} from "lucide-react";
import { AdminContextMenu } from "@/components/admin-workbench/admin-context-menu";
import {
  TREE_CHEVRON_BTN_SIZE,
  TreeChevronButton,
  TreeChevronSpacer,
  TreeIndentGuides,
  TreePageIcon,
} from "@/components/page-tree-shared";
import {
  buildPathTree,
  collectPathKeys,
  pathKeysWithChildren,
  type PathTreeNode,
} from "@/lib/page-tree";
import type { Dictionary } from "@/lib/i18n";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";
import { resolveDropPositionFromEvent } from "@/lib/wiki-tree-drop";
import type { AdminContextMenuItem, AdminPageRow, AdminPagesByLang } from "@/types/admin-workbench";
import type { WikiIconKey } from "@/lib/wiki-icon-presets";
import { WIKI_ICON_PRESETS } from "@/lib/wiki-icon-presets";
import { wikiPublicHref } from "@/lib/wiki-path";

const EXPLORER_LANGS_KEY = "admin-explorer-langs";
const EXPLORER_BRANCHES_KEY = "admin-explorer-branches";

type DropState =
  | null
  | { kind: "page"; targetId: string; lang: string; mode: "before" | "after" | "inside" }
  | { kind: "folder"; pathKey: string; lang: string; mode: "inside" }
  | { kind: "root"; lang: string };

function loadExpandedLangs(enabled: string[]): Set<string> {
  if (typeof window === "undefined") return new Set(enabled);
  try {
    const raw = localStorage.getItem(EXPLORER_LANGS_KEY);
    if (!raw) return new Set(enabled);
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : enabled);
  } catch {
    return new Set(enabled);
  }
}

function loadOpenBranches(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(EXPLORER_BRANCHES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    return {};
  }
}

function persistOpenBranches(state: Record<string, Set<string>>) {
  const serializable = Object.fromEntries(Object.entries(state).map(([k, v]) => [k, [...v]]));
  localStorage.setItem(EXPLORER_BRANCHES_KEY, JSON.stringify(serializable));
}

export type AdminExplorerActions = {
  onSelectPage: (page: AdminPageRow) => void;
  onRename: (id: string, lang: string) => void;
  onDelete: (id: string, lang: string) => void;
  onTogglePublish: (id: string, lang: string) => void;
  onMoveByDrop: (
    fromId: string,
    lang: string,
    target:
      | { kind: "page"; targetId: string; mode: "before" | "after" | "inside" }
      | { kind: "folder"; pathKey: string; mode: "inside" }
      | { kind: "root" },
  ) => void;
  onAddChild: (id: string, lang: string) => void;
  onAddSibling: (id: string, lang: string) => void;
  onCreateAtRoot: (lang: string) => void;
  onCreateCategory: (lang: string, parentParts: string[]) => void;
  onRefresh: (lang: string | "all") => void;
  onChangeIcon: (id: string, lang: string, icon: WikiIconKey | null) => void;
  onLiftUp: (id: string, lang: string) => void;
  onLocalizeBranch: (id: string, lang: string) => void;
  onLocalizeAll: (id: string, lang: string) => void;
  onOpenPublic: (page: AdminPageRow) => void;
  activePageId?: string;
  activePageLang?: string;
};

function ExplorerHeaderActions({
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
      {btn(wb.createArticle, onNewArticle, <FilePlus size={16} strokeWidth={1.75} aria-hidden />)}
      {btn(wb.createCategory, onNewCategory, <FolderPlus size={16} strokeWidth={1.75} aria-hidden />)}
      {btn(wb.refresh, onRefresh, <RefreshCw size={16} strokeWidth={1.75} aria-hidden />)}
      {btn(wb.collapseAll, onCollapseAll, <FoldVertical size={16} strokeWidth={1.75} aria-hidden />)}
      {onExpandAll
        ? btn(wb.expandAll, onExpandAll, <UnfoldVertical size={16} strokeWidth={1.75} aria-hidden />)
        : null}
    </div>
  );
}

export function AdminExplorer({
  pagesByLang,
  enabledLanguages,
  dict,
  actions,
}: {
  pagesByLang: AdminPagesByLang;
  enabledLanguages: string[];
  dict: Dictionary;
  actions: AdminExplorerActions;
}) {
  const wb = dict.admin.workbench;
  const [expandedLangs, setExpandedLangs] = useState(() => loadExpandedLangs(enabledLanguages));
  const [openBranchesByLang, setOpenBranchesByLang] = useState<Record<string, Set<string>>>(() => {
    const stored = loadOpenBranches();
    const initial: Record<string, Set<string>> = {};
    for (const lang of enabledLanguages) {
      const pages = pagesByLang[lang] ?? [];
      const tree = buildPathTree(pages, lang);
      initial[lang] = new Set(stored[lang] ?? [...pathKeysWithChildren(tree)]);
    }
    return initial;
  });
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
    for (const lang of enabledLanguages) {
      pruneBranches(lang, pagesByLang[lang] ?? []);
    }
  }, [enabledLanguages, pagesByLang, pruneBranches]);

  const toggleLang = (lang: string) => {
    setExpandedLangs((prev) => {
      const next = new Set(prev);
      if (next.has(lang)) next.delete(lang);
      else next.add(lang);
      localStorage.setItem(EXPLORER_LANGS_KEY, JSON.stringify([...next]));
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

  const buildRowMenuItems = useCallback(
    (page: AdminPageRow, menuX: number, menuY: number): AdminContextMenuItem[] => {
      const childCount = (pagesByLang[page.lang] ?? []).filter(
        (p) => p.path !== page.path && p.path.startsWith(`${page.path}/`),
      ).length;
      const deleteLabel =
        childCount > 0
          ? dict.admin.posts.deleteWithChildren.replace("{count}", String(childCount))
          : dict.admin.posts.delete;

      return [
      { id: "open", label: wb.openPage, onClick: () => actions.onSelectPage(page) },
      { id: "sep0", label: "", separator: true },
      { id: "sibling", label: wb.createArticle, onClick: () => actions.onAddSibling(page.id, page.lang) },
      { id: "child", label: dict.admin.posts.addChild, onClick: () => actions.onAddChild(page.id, page.lang) },
      { id: "cat", label: wb.createCategory, onClick: () => actions.onCreateCategory(page.lang, pathSegmentsAfterLang(page.path, page.lang)) },
      { id: "rename", label: dict.admin.posts.rename, onClick: () => actions.onRename(page.id, page.lang) },
      {
        id: "icon",
        label: dict.admin.posts.changeIcon,
        onClick: () => {
          setRowMenu(null);
          setIconPicker({ id: page.id, lang: page.lang, x: menuX, y: menuY });
        },
      },
      {
        id: "publish",
        label: page.isPublished ? wb.unpublish : wb.publish,
        onClick: () => actions.onTogglePublish(page.id, page.lang),
      },
      { id: "public", label: wb.openOnSite, onClick: () => actions.onOpenPublic(page) },
      { id: "lift", label: dict.admin.posts.upLevel, onClick: () => actions.onLiftUp(page.id, page.lang) },
      { id: "sep1", label: "", separator: true },
      { id: "loc-branch", label: dict.admin.posts.aiLocalizeBranch, onClick: () => actions.onLocalizeBranch(page.id, page.lang) },
      { id: "loc-all", label: dict.admin.posts.aiLocalizeAll, onClick: () => actions.onLocalizeAll(page.id, page.lang) },
      { id: "sep2", label: "", separator: true },
      { id: "delete", label: deleteLabel, danger: true, onClick: () => actions.onDelete(page.id, page.lang) },
    ];
    },
    [actions, dict.admin.posts, pagesByLang, wb],
  );

  const activeId = actions.activePageId ?? "";

  return (
    <div className="admin-explorer">
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
                className="admin-explorer-lang-body admin-path-tree-scroll"
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
                  />
                )}
              </div>
            ) : null}
          </section>
        );
      })}
      {rowMenu ? (() => {
        const page = (pagesByLang[rowMenu.lang] ?? []).find((p) => p.id === rowMenu.id);
        if (!page) return null;
        return (
          <AdminContextMenu
            x={rowMenu.x}
            y={rowMenu.y}
            items={buildRowMenuItems(page, rowMenu.x, rowMenu.y)}
            onClose={() => setRowMenu(null)}
          />
        );
      })() : null}
      {iconPicker ? (
        <AdminContextMenu
          x={iconPicker.x || 120}
          y={iconPicker.y || 120}
          items={[
            ...(Object.keys(WIKI_ICON_PRESETS) as WikiIconKey[]).map((key) => ({
              id: key,
              label: key,
              onClick: () => {
                actions.onChangeIcon(iconPicker.id, iconPicker.lang, key);
                setIconPicker(null);
              },
            })),
            { id: "sep", label: "", separator: true },
            {
              id: "clear",
              label: dict.admin.posts.clearIcon,
              onClick: () => {
                actions.onChangeIcon(iconPicker.id, iconPicker.lang, null);
                setIconPicker(null);
              },
            },
          ]}
          onClose={() => setIconPicker(null)}
        />
      ) : null}
      {sectionMenu ? (
        <AdminContextMenu
          x={sectionMenu.x}
          y={sectionMenu.y}
          items={[
            { id: "root", label: wb.createAtRoot, onClick: () => actions.onCreateAtRoot(sectionMenu.lang) },
            { id: "cat", label: wb.createCategory, onClick: () => actions.onCreateCategory(sectionMenu.lang, []) },
            {
              id: "collapse",
              label: wb.collapseSection,
              onClick: () => {
                setExpandedLangs((prev) => {
                  const next = new Set(prev);
                  next.delete(sectionMenu.lang);
                  localStorage.setItem(EXPLORER_LANGS_KEY, JSON.stringify([...next]));
                  return next;
                });
              },
            },
            {
              id: "expand",
              label: wb.expandSection,
              onClick: () => {
                setExpandedLangs((prev) => {
                  const next = new Set(prev);
                  next.add(sectionMenu.lang);
                  localStorage.setItem(EXPLORER_LANGS_KEY, JSON.stringify([...next]));
                  return next;
                });
              },
            },
          ]}
          onClose={() => setSectionMenu(null)}
        />
      ) : null}
    </div>
  );
}

function AdminPathTree({
  nodes,
  lang,
  activeId,
  dragOver,
  setDragOver,
  openBranches,
  toggleBranch,
  dict,
  onSelect,
  onContextMenu,
  onMoveByDrop,
}: {
  nodes: PathTreeNode<AdminPageRow>[];
  lang: string;
  activeId: string;
  dragOver: DropState;
  setDragOver: (v: DropState) => void;
  openBranches: Set<string>;
  toggleBranch: (pathKey: string) => void;
  dict: Dictionary;
  onSelect: (id: string) => void;
  onContextMenu: (page: AdminPageRow, x: number, y: number) => void;
  onMoveByDrop: AdminExplorerActions["onMoveByDrop"];
}) {
  return (
    <div className="admin-path-tree">
      {nodes.map((node, index) => (
        <AdminTreeBranch
          key={node.pathKey}
          node={node}
          lang={lang}
          depth={0}
          isLast={index === nodes.length - 1}
          activeId={activeId}
          dragOver={dragOver}
          setDragOver={setDragOver}
          openBranches={openBranches}
          toggleBranch={toggleBranch}
          dict={dict}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onMoveByDrop={onMoveByDrop}
        />
      ))}
    </div>
  );
}

function AdminTreeBranch({
  node,
  lang,
  depth,
  isLast,
  activeId,
  dragOver,
  setDragOver,
  openBranches,
  toggleBranch,
  dict,
  onSelect,
  onContextMenu,
  onMoveByDrop,
}: {
  node: PathTreeNode<AdminPageRow>;
  lang: string;
  depth: number;
  isLast: boolean;
  activeId: string;
  dragOver: DropState;
  setDragOver: (v: DropState) => void;
  openBranches: Set<string>;
  toggleBranch: (pathKey: string) => void;
  dict: Dictionary;
  onSelect: (id: string) => void;
  onContextMenu: (page: AdminPageRow, x: number, y: number) => void;
  onMoveByDrop: AdminExplorerActions["onMoveByDrop"];
}) {
  const hasChildren = node.children.length > 0;
  const page = node.page;
  const isCategory = page?.isCategory === true;
  const isFolderOnly = !page && hasChildren;
  const expandable = hasChildren || isCategory;
  const expanded = !expandable || openBranches.has(node.pathKey);

  const dropTargetKind = {
    isCategory: isCategory || isFolderOnly,
    hasChildren,
    isFolderOnly,
  };

  const dropMode =
    dragOver?.lang === lang &&
    ((dragOver.kind === "page" && page && dragOver.targetId === page.id) ||
      (dragOver.kind === "folder" && dragOver.pathKey === node.pathKey))
      ? dragOver.kind === "page"
        ? dragOver.mode
        : "inside"
      : null;

  const rowDropClass =
    dropMode === "before"
      ? "admin-tree-drop-before"
      : dropMode === "after"
        ? "admin-tree-drop-after"
        : dropMode === "inside"
          ? "admin-tree-drop-inside"
          : "";

  const handleDragOver = (e: React.DragEvent, el: HTMLElement) => {
    e.preventDefault();
    e.stopPropagation();
    const fromId = e.dataTransfer.getData("text/plain");
    if (!fromId) return;

    if (page) {
      const mode = resolveDropPositionFromEvent(
        { clientY: e.clientY, currentTarget: el },
        dropTargetKind,
      );
      setDragOver({ kind: "page", targetId: page.id, lang, mode });
      return;
    }

    if (isFolderOnly) {
      setDragOver({ kind: "folder", pathKey: node.pathKey, lang, mode: "inside" });
    }
  };

  const labelRow =
    page ? (
      <div
        className={`admin-tree-row-container admin-tree-row-inner ${page.id === activeId ? "admin-tree-row-active" : ""} ${rowDropClass}`}
        draggable
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(page, e.clientX, e.clientY);
        }}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", page.id);
        }}
        onDragEnd={() => setDragOver(null)}
        onDragOver={(e) => handleDragOver(e, e.currentTarget)}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const fromId = e.dataTransfer.getData("text/plain");
          if (!fromId || fromId === page.id) return;
          const mode = resolveDropPositionFromEvent(
            { clientY: e.clientY, currentTarget: e.currentTarget },
            dropTargetKind,
          );
          onMoveByDrop(fromId, lang, { kind: "page", targetId: page.id, mode });
          setDragOver(null);
        }}
      >
        <button type="button" className="admin-tree-label-btn" draggable={false} onClick={() => onSelect(page.id)} title={page.path}>
          {!page.isPublished ? <span className="admin-tree-draft-dot" aria-hidden /> : null}
          <TreePageIcon icon={page.icon} isCategory={page.isCategory} />
          <span className="admin-tree-title">{page.title}</span>
        </button>
      </div>
    ) : (
      <div
        className={`admin-tree-row-container admin-tree-row-inner admin-tree-row-folder-only ${rowDropClass}`}
        title={dict.admin.posts.hasChildrenNoArticle}
        onDragOver={(e) => handleDragOver(e, e.currentTarget)}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const fromId = e.dataTransfer.getData("text/plain");
          if (!fromId) return;
          onMoveByDrop(fromId, lang, { kind: "folder", pathKey: node.pathKey, mode: "inside" });
          setDragOver(null);
        }}
      >
        <TreePageIcon icon={null} isCategory />
        <span>{node.segment}/</span>
      </div>
    );

  return (
    <div className="admin-tree-branch">
      <div className="admin-tree-branch-line" style={{ minHeight: TREE_CHEVRON_BTN_SIZE, position: "relative" }}>
        <TreeIndentGuides depth={depth} isLast={isLast} />
        <span style={{ width: depth * 12, flexShrink: 0 }} aria-hidden />
        {expandable ? (
          <TreeChevronButton
            expanded={expanded}
            onToggle={() => toggleBranch(node.pathKey)}
            ariaLabel={expanded ? dict.admin.wiki.treeCollapseBranch : dict.admin.wiki.treeExpandBranch}
          />
        ) : (
          <TreeChevronSpacer />
        )}
        {labelRow}
      </div>
      {expandable && expanded ? (
        <div>
          {node.children.map((child, index) => (
            <AdminTreeBranch
              key={child.pathKey}
              node={child}
              lang={lang}
              depth={depth + 1}
              isLast={index === node.children.length - 1}
              activeId={activeId}
              dragOver={dragOver}
              setDragOver={setDragOver}
              openBranches={openBranches}
              toggleBranch={toggleBranch}
              dict={dict}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onMoveByDrop={onMoveByDrop}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
