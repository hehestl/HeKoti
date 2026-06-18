"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, FileText, Folder, GripVertical } from "lucide-react";
import { AdminContextMenu } from "@/components/admin-workbench/admin-context-menu";
import {
  TREE_CHEVRON_BTN_SIZE,
  TreeChevronButton,
  TreeChevronSpacer,
  TreeDepthSpacer,
} from "@/components/page-tree-shared";
import { buildPathTree, pathKeysWithChildren, type PathTreeNode } from "@/lib/page-tree";
import type { Dictionary } from "@/lib/i18n";
import type { AdminContextMenuItem, AdminPageRow, AdminPagesByLang } from "@/types/admin-workbench";
import { wikiPublicHref } from "@/lib/wiki-path";

const EXPLORER_LANGS_KEY = "admin-explorer-langs";

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

export type AdminExplorerActions = {
  onSelectPage: (page: AdminPageRow) => void;
  onRename: (id: string, lang: string) => void;
  onDelete: (id: string, lang: string) => void;
  onTogglePublish: (id: string, lang: string) => void;
  onMoveByDrop: (fromId: string, targetId: string, lang: string, mode: "before" | "after" | "inside") => void;
  onAddChild: (id: string, lang: string) => void;
  onAddSibling: (id: string, lang: string) => void;
  onCreateAtRoot: (lang: string) => void;
  onLiftUp: (id: string, lang: string) => void;
  onLocalizeBranch: (id: string, lang: string) => void;
  onLocalizeAll: (id: string, lang: string) => void;
  onOpenPublic: (page: AdminPageRow) => void;
  activePageId?: string;
  activePageLang?: string;
};

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
  const [dragOver, setDragOver] = useState<null | { targetId: string; lang: string; mode: "before" | "after" | "inside" }>(
    null,
  );
  const [rowMenu, setRowMenu] = useState<null | { id: string; lang: string; x: number; y: number }>(null);
  const [sectionMenu, setSectionMenu] = useState<null | { lang: string; x: number; y: number }>(null);

  const toggleLang = (lang: string) => {
    setExpandedLangs((prev) => {
      const next = new Set(prev);
      if (next.has(lang)) next.delete(lang);
      else next.add(lang);
      localStorage.setItem(EXPLORER_LANGS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const buildRowMenuItems = useCallback(
    (page: AdminPageRow): AdminContextMenuItem[] => [
      { id: "open", label: wb.openPage, onClick: () => actions.onSelectPage(page) },
      { id: "sep0", label: "", separator: true },
      { id: "sibling", label: wb.createArticle, onClick: () => actions.onAddSibling(page.id, page.lang) },
      { id: "child", label: dict.admin.posts.addChild, onClick: () => actions.onAddChild(page.id, page.lang) },
      { id: "rename", label: dict.admin.posts.rename, onClick: () => actions.onRename(page.id, page.lang) },
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
      { id: "delete", label: dict.admin.posts.delete, danger: true, onClick: () => actions.onDelete(page.id, page.lang) },
    ],
    [actions, dict.admin.posts, wb],
  );

  const activeId = actions.activePageId ?? "";

  return (
    <div className="admin-explorer">
      <div className="admin-explorer-title">{wb.explorerTitle}</div>
      {enabledLanguages.map((lang) => {
        const pages = pagesByLang[lang] ?? [];
        const expanded = expandedLangs.has(lang);
        const tree = buildPathTree(pages, lang);
        return (
          <section key={lang} className="admin-explorer-lang-section">
            <button
              type="button"
              className="admin-explorer-lang-header"
              onClick={() => toggleLang(lang)}
              onContextMenu={(e) => {
                e.preventDefault();
                setSectionMenu({ lang, x: e.clientX, y: e.clientY });
              }}
            >
              <ChevronRight size={14} className={expanded ? "admin-explorer-chevron admin-explorer-chevron-open" : "admin-explorer-chevron"} aria-hidden />
              <span>{lang.toUpperCase()}</span>
              <span className="admin-explorer-lang-count">({pages.length})</span>
            </button>
            {expanded ? (
              <div
                className="admin-explorer-lang-body admin-path-tree-scroll"
                onContextMenu={(e) => {
                  if ((e.target as HTMLElement).closest(".admin-tree-row")) return;
                  e.preventDefault();
                  setSectionMenu({ lang, x: e.clientX, y: e.clientY });
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
                    dict={dict}
                    onSelect={(id) => {
                      const page = pages.find((p) => p.id === id);
                      if (page) actions.onSelectPage(page);
                    }}
                    onContextMenu={(page, x, y) => setRowMenu({ id: page.id, lang, x, y })}
                    onMoveByDrop={(fromId, targetId, mode) => actions.onMoveByDrop(fromId, targetId, lang, mode)}
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
            items={buildRowMenuItems(page)}
            onClose={() => setRowMenu(null)}
          />
        );
      })() : null}
      {sectionMenu ? (
        <AdminContextMenu
          x={sectionMenu.x}
          y={sectionMenu.y}
          items={[
            { id: "root", label: wb.createAtRoot, onClick: () => actions.onCreateAtRoot(sectionMenu.lang) },
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
  dict,
  onSelect,
  onContextMenu,
  onMoveByDrop,
}: {
  nodes: PathTreeNode<AdminPageRow>[];
  lang: string;
  activeId: string;
  dragOver: null | { targetId: string; lang: string; mode: "before" | "after" | "inside" };
  setDragOver: (v: null | { targetId: string; lang: string; mode: "before" | "after" | "inside" }) => void;
  dict: Dictionary;
  onSelect: (id: string) => void;
  onContextMenu: (page: AdminPageRow, x: number, y: number) => void;
  onMoveByDrop: (fromId: string, targetId: string, mode: "before" | "after" | "inside") => void;
}) {
  const [openBranches, setOpenBranches] = useState(() => pathKeysWithChildren(nodes));

  const toggleBranch = useCallback((pathKey: string) => {
    setOpenBranches((prev) => {
      const n = new Set(prev);
      if (n.has(pathKey)) n.delete(pathKey);
      else n.add(pathKey);
      return n;
    });
  }, []);

  return (
    <div className="admin-path-tree">
      {nodes.map((node) => (
        <AdminTreeBranch
          key={node.pathKey}
          node={node}
          lang={lang}
          depth={0}
          activeId={activeId}
          dragOver={dragOver}
          setDragOver={setDragOver}
          dict={dict}
          openBranches={openBranches}
          toggleBranch={toggleBranch}
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
  activeId,
  dragOver,
  setDragOver,
  dict,
  openBranches,
  toggleBranch,
  onSelect,
  onContextMenu,
  onMoveByDrop,
}: {
  node: PathTreeNode<AdminPageRow>;
  lang: string;
  depth: number;
  activeId: string;
  dragOver: null | { targetId: string; lang: string; mode: "before" | "after" | "inside" };
  setDragOver: (v: null | { targetId: string; lang: string; mode: "before" | "after" | "inside" }) => void;
  dict: Dictionary;
  openBranches: Set<string>;
  toggleBranch: (pathKey: string) => void;
  onSelect: (id: string) => void;
  onContextMenu: (page: AdminPageRow, x: number, y: number) => void;
  onMoveByDrop: (fromId: string, targetId: string, mode: "before" | "after" | "inside") => void;
}) {
  const hasChildren = node.children.length > 0;
  const expanded = !hasChildren || openBranches.has(node.pathKey);
  const page = node.page;

  const rowClass =
    page && page.id === activeId
      ? "admin-tree-row admin-tree-row-active"
      : dragOver?.targetId === page?.id
        ? "admin-tree-row admin-tree-row-drag"
        : "admin-tree-row";

  const labelRow: ReactNode =
    page ? (
      <div
        className={`admin-tree-row-inner ${rowClass}`}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(page, e.clientX, e.clientY);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          const fromId = e.dataTransfer.getData("text/plain");
          if (!fromId || fromId === page.id) return;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const y = e.clientY - rect.top;
          const mode = e.shiftKey ? "inside" : y < rect.height / 2 ? "before" : "after";
          setDragOver({ targetId: page.id, lang, mode });
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => {
          e.preventDefault();
          const fromId = e.dataTransfer.getData("text/plain");
          if (!fromId) return;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const y = e.clientY - rect.top;
          const mode = e.shiftKey ? "inside" : y < rect.height / 2 ? "before" : "after";
          onMoveByDrop(fromId, page.id, mode);
          setDragOver(null);
        }}
      >
        <button type="button" className="admin-tree-label-btn" onClick={() => onSelect(page.id)} title={page.path}>
          {!page.isPublished ? <span className="admin-tree-draft-dot" aria-hidden /> : null}
          {hasChildren ? <Folder size={14} aria-hidden /> : <FileText size={14} aria-hidden />}
          <span className="admin-tree-title">{page.title}</span>
        </button>
        <span
          draggable
          className="admin-tree-drag"
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", page.id);
          }}
          onDragEnd={() => setDragOver(null)}
          title={dict.admin.posts.dragHint}
          aria-label={dict.admin.posts.dragHint}
        >
          <GripVertical size={14} aria-hidden />
        </span>
      </div>
    ) : (
      <div className="admin-tree-row-inner admin-tree-row-folder-only" title={dict.admin.posts.hasChildrenNoArticle}>
        <Folder size={14} aria-hidden />
        <span>{node.segment}/</span>
      </div>
    );

  return (
    <div className="admin-tree-branch">
      <div className="admin-tree-branch-line" style={{ minHeight: TREE_CHEVRON_BTN_SIZE }}>
        <TreeDepthSpacer depth={depth} />
        {hasChildren ? (
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
      {hasChildren && expanded ? (
        <div>
          {node.children.map((child) => (
            <AdminTreeBranch
              key={child.pathKey}
              node={child}
              lang={lang}
              depth={depth + 1}
              activeId={activeId}
              dragOver={dragOver}
              setDragOver={setDragOver}
              dict={dict}
              openBranches={openBranches}
              toggleBranch={toggleBranch}
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
