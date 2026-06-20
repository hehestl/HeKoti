"use client";

import { Lock } from "lucide-react";
import {
  ADMIN_TREE_CHEVRON_BTN_SIZE,
  TreeChevronButton,
  TreeChevronSpacer,
  TreeIndentGuides,
  TreePageIcon,
} from "@/components/page-tree-shared";
import type { Dictionary } from "@/lib/i18n";
import type { PathTreeNode } from "@/lib/page-tree";
import { resolveDropPositionFromEvent } from "@/lib/wiki-tree-drop";
import type { AdminPageRow } from "@/types/admin-workbench";

export type ExplorerMoveByDrop = (
  fromId: string,
  lang: string,
  target:
    | { kind: "page"; targetId: string; mode: "before" | "after" | "inside" }
    | { kind: "folder"; pathKey: string; mode: "inside" }
    | { kind: "root" },
) => void;

export type ExplorerDropState =
  | null
  | { kind: "page"; targetId: string; lang: string; mode: "before" | "after" | "inside" }
  | { kind: "folder"; pathKey: string; lang: string; mode: "inside" }
  | { kind: "root"; lang: string };

export function AdminPathTree({
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
  variant = "posts",
}: {
  nodes: PathTreeNode<AdminPageRow>[];
  lang: string;
  activeId: string;
  dragOver: ExplorerDropState;
  setDragOver: (v: ExplorerDropState) => void;
  openBranches: Set<string>;
  toggleBranch: (pathKey: string) => void;
  dict: Dictionary;
  onSelect: (id: string) => void;
  onContextMenu: (page: AdminPageRow, x: number, y: number) => void;
  onMoveByDrop: ExplorerMoveByDrop;
  variant?: "posts" | "notes";
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
          variant={variant}
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
  variant = "posts",
}: {
  node: PathTreeNode<AdminPageRow>;
  lang: string;
  depth: number;
  isLast: boolean;
  activeId: string;
  dragOver: ExplorerDropState;
  setDragOver: (v: ExplorerDropState) => void;
  openBranches: Set<string>;
  toggleBranch: (pathKey: string) => void;
  dict: Dictionary;
  onSelect: (id: string) => void;
  onContextMenu: (page: AdminPageRow, x: number, y: number) => void;
  onMoveByDrop: ExplorerMoveByDrop;
  variant?: "posts" | "notes";
}) {
  const isNotes = variant === "notes";
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
      const mode = resolveDropPositionFromEvent({ clientY: e.clientY, currentTarget: el }, dropTargetKind);
      setDragOver({ kind: "page", targetId: page.id, lang, mode });
      return;
    }

    if (isFolderOnly) {
      setDragOver({ kind: "folder", pathKey: node.pathKey, lang, mode: "inside" });
    }
  };

  const labelRow = page ? (
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
        const mode = resolveDropPositionFromEvent({ clientY: e.clientY, currentTarget: e.currentTarget }, dropTargetKind);
        onMoveByDrop(fromId, lang, { kind: "page", targetId: page.id, mode });
        setDragOver(null);
      }}
    >
      <button type="button" className="admin-tree-label-btn" draggable={false} onClick={() => onSelect(page.id)} title={page.path}>
        {!isNotes && !page.isPublished ? <span className="admin-tree-draft-dot" aria-hidden /> : null}
        {page.systemKey ? <Lock size={12} aria-hidden className="admin-tree-system-lock" /> : null}
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
      <div className="admin-tree-branch-line">
        <TreeIndentGuides depth={depth} isLast={isLast} />
        <span style={{ width: depth * 12, flexShrink: 0 }} aria-hidden />
        {expandable ? (
          <TreeChevronButton
            expanded={expanded}
            size={ADMIN_TREE_CHEVRON_BTN_SIZE}
            onToggle={() => toggleBranch(node.pathKey)}
            ariaLabel={expanded ? dict.admin.wiki.treeCollapseBranch : dict.admin.wiki.treeExpandBranch}
          />
        ) : (
          <TreeChevronSpacer size={ADMIN_TREE_CHEVRON_BTN_SIZE} />
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
              variant={variant}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
