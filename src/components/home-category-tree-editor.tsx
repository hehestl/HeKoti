"use client";

import { useCallback, useMemo, useState, type DragEvent } from "react";
import { Lock } from "lucide-react";
import {
  ADMIN_TREE_CHEVRON_BTN_SIZE,
  TreeChevronButton,
  TreeChevronSpacer,
  TreeIndentGuides,
  TreePageIcon,
} from "@/components/page-tree-shared";
import { WikiIconPickerMenu } from "@/components/wiki-icon-picker-menu";
import {
  buildTreeFromCategoryDraft,
  type EditableHomeCategory,
  type HomeInlineEditLabels,
} from "@/components/home-inline-edit-types";
import type { DropTarget } from "@/lib/page-reorder";
import type { HomeTreePage } from "@/components/home-inline-edit-types";
import type { PathTreeNode } from "@/lib/page-tree";
import { resolveDropPositionFromEvent } from "@/lib/wiki-tree-drop";

type HomeDropState =
  | null
  | { kind: "page"; pathKey: string; mode: "before" | "after" | "inside" }
  | { kind: "folder"; pathKey: string; mode: "inside" };

export function HomeCategoryTreeEditor({
  lang,
  draft,
  labels,
  onPatch,
  onReorder,
  onPromote,
}: {
  lang: string;
  draft: Map<string, EditableHomeCategory>;
  labels: HomeInlineEditLabels;
  onPatch: (pathKey: string, patch: Partial<EditableHomeCategory>) => void;
  onReorder: (fromId: string, target: DropTarget) => boolean;
  onPromote: (pathKey: string) => void;
}) {
  const tree = useMemo(() => buildTreeFromCategoryDraft(draft, lang), [draft, lang]);
  const [openBranches, setOpenBranches] = useState<Set<string>>(() => new Set());
  const [dragOver, setDragOver] = useState<HomeDropState>(null);
  const [iconPicker, setIconPicker] = useState<null | { pathKey: string; x: number; y: number }>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const toggleBranch = useCallback((pathKey: string) => {
    setOpenBranches((prev) => {
      const next = new Set(prev);
      if (next.has(pathKey)) next.delete(pathKey);
      else next.add(pathKey);
      return next;
    });
  }, []);

  return (
    <div className="home-category-tree-editor admin-path-tree">
      <p className="home-category-tree-hint">{labels.dragHint}</p>
      {tree.map((node, index) => (
        <HomeTreeBranch
          key={node.pathKey}
          node={node}
          draft={draft}
          lang={lang}
          depth={0}
          isLast={index === tree.length - 1}
          openBranches={openBranches}
          toggleBranch={toggleBranch}
          dragOver={dragOver}
          setDragOver={setDragOver}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
          labels={labels}
          onPatch={onPatch}
          onReorder={onReorder}
          onPromote={onPromote}
          onOpenIconPicker={(pathKey, x, y) => setIconPicker({ pathKey, x, y })}
        />
      ))}
      {iconPicker ? (
        <WikiIconPickerMenu
          x={iconPicker.x}
          y={iconPicker.y}
          clearLabel={labels.clearIcon}
          onSelect={(icon) => onPatch(iconPicker.pathKey, { icon })}
          onClose={() => setIconPicker(null)}
        />
      ) : null}
    </div>
  );
}

function HomeTreeBranch({
  node,
  draft,
  lang,
  depth,
  isLast,
  openBranches,
  toggleBranch,
  dragOver,
  setDragOver,
  draggingId,
  setDraggingId,
  labels,
  onPatch,
  onReorder,
  onPromote,
  onOpenIconPicker,
}: {
  node: PathTreeNode<HomeTreePage>;
  draft: Map<string, EditableHomeCategory>;
  lang: string;
  depth: number;
  isLast: boolean;
  openBranches: Set<string>;
  toggleBranch: (pathKey: string) => void;
  dragOver: HomeDropState;
  setDragOver: (v: HomeDropState) => void;
  draggingId: string | null;
  setDraggingId: (v: string | null) => void;
  labels: HomeInlineEditLabels;
  onPatch: (pathKey: string, patch: Partial<EditableHomeCategory>) => void;
  onReorder: (fromId: string, target: DropTarget) => boolean;
  onPromote: (pathKey: string) => void;
  onOpenIconPicker: (pathKey: string, x: number, y: number) => void;
}) {
  const cat = draft.get(node.pathKey);
  if (!cat) return null;

  const hasChildren = node.children.length > 0;
  const expandable = hasChildren || cat.isCategory;
  const expanded = !expandable || openBranches.has(node.pathKey);
  const isFolderOnly = !cat.id && hasChildren;
  const draggable = !!cat.id && cat.canEdit && (cat.isCategory || hasChildren);

  const dropTargetKind = {
    isCategory: cat.isCategory || isFolderOnly,
    hasChildren,
    isFolderOnly,
  };

  const dropMode =
    dragOver &&
    ((dragOver.kind === "page" && dragOver.pathKey === node.pathKey) ||
      (dragOver.kind === "folder" && dragOver.pathKey === node.pathKey))
      ? dragOver.mode
      : null;

  const rowDropClass =
    dropMode === "before"
      ? "admin-tree-drop-before"
      : dropMode === "after"
        ? "admin-tree-drop-after"
        : dropMode === "inside"
          ? "admin-tree-drop-inside"
          : "";

  const handleDragOver = (e: DragEvent, el: HTMLElement) => {
    e.preventDefault();
    e.stopPropagation();
    const fromId = e.dataTransfer.getData("text/plain");
    if (!fromId || fromId === cat.id) return;

    if (cat.id) {
      const mode = resolveDropPositionFromEvent({ clientY: e.clientY, currentTarget: el }, dropTargetKind);
      setDragOver({ kind: "page", pathKey: node.pathKey, mode });
      return;
    }

    if (isFolderOnly) {
      setDragOver({ kind: "folder", pathKey: node.pathKey, mode: "inside" });
    }
  };

  const handleDrop = (e: DragEvent, el: HTMLElement, mode: "before" | "after" | "inside") => {
    e.preventDefault();
    e.stopPropagation();
    const fromId = e.dataTransfer.getData("text/plain");
    if (!fromId || fromId === cat.id) return;

    if (cat.id) {
      onReorder(fromId, { kind: "page", targetId: cat.id, mode });
    } else if (isFolderOnly) {
      onReorder(fromId, { kind: "folder", pathKey: node.pathKey });
    }
    setDragOver(null);
  };

  const rowContent = (
    <>
      {cat.isSystem ? <Lock size={12} aria-hidden className="admin-tree-system-lock" /> : null}
      <button
        type="button"
        className="home-tree-icon-btn"
        disabled={!cat.canEdit}
        aria-label={cat.title}
        onClick={(e) => {
          if (!cat.canEdit) return;
          onOpenIconPicker(node.pathKey, e.clientX, e.clientY);
        }}
      >
        <TreePageIcon icon={cat.icon} isCategory={cat.isCategory || hasChildren} />
      </button>
      {cat.canEdit ? (
        <input
          className="home-tree-title-input"
          value={cat.title}
          onChange={(e) => onPatch(node.pathKey, { title: e.target.value })}
        />
      ) : (
        <span className="home-tree-title-readonly" aria-disabled>
          {cat.title}
          {cat.isSystem ? (
            <span className="home-tree-readonly-hint"> — {labels.systemReadOnly}</span>
          ) : !cat.isCategory && !hasChildren ? (
            <span className="home-tree-readonly-hint"> — {labels.leafReadOnly}</span>
          ) : null}
        </span>
      )}
      {cat.isImplicit && !cat.pendingCreate ? (
        <button type="button" className="home-tree-make-category-btn" onClick={() => onPromote(node.pathKey)}>
          {labels.makeCategory}
        </button>
      ) : null}
      {cat.isImplicit && cat.pendingCreate ? (
        <span className="home-tree-implicit-hint">{labels.implicitHint}</span>
      ) : null}
    </>
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
            ariaLabel={expanded ? "Collapse" : "Expand"}
          />
        ) : (
          <TreeChevronSpacer size={ADMIN_TREE_CHEVRON_BTN_SIZE} />
        )}
        <div
          className={`admin-tree-row-container admin-tree-row-inner home-tree-row ${rowDropClass}`}
          draggable={draggable}
          aria-grabbed={draggable && draggingId === cat.id ? true : undefined}
          onDragStart={(e) => {
            if (!draggable || !cat.id) return;
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", cat.id);
            setDraggingId(cat.id);
          }}
          onDragEnd={() => {
            setDraggingId(null);
            setDragOver(null);
          }}
          onDragOver={(e) => handleDragOver(e, e.currentTarget)}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            const mode = cat.id
              ? resolveDropPositionFromEvent({ clientY: e.clientY, currentTarget: e.currentTarget }, dropTargetKind)
              : "inside";
            handleDrop(e, e.currentTarget, mode);
          }}
        >
          {draggable ? (
            <span className="home-tree-drag-handle" aria-label={labels.dragHint} title={labels.dragHint}>
              ⋮⋮
            </span>
          ) : (
            <span className="home-tree-drag-spacer" aria-hidden />
          )}
          {rowContent}
        </div>
      </div>
      {expandable && expanded
        ? node.children.map((child, index) => (
            <HomeTreeBranch
              key={child.pathKey}
              node={child}
              draft={draft}
              lang={lang}
              depth={depth + 1}
              isLast={index === node.children.length - 1}
              openBranches={openBranches}
              toggleBranch={toggleBranch}
              dragOver={dragOver}
              setDragOver={setDragOver}
              draggingId={draggingId}
              setDraggingId={setDraggingId}
              labels={labels}
              onPatch={onPatch}
              onReorder={onReorder}
              onPromote={onPromote}
              onOpenIconPicker={onOpenIconPicker}
            />
          ))
        : null}
    </div>
  );
}
