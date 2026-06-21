"use client";

import { useCallback, useMemo, useState, type DragEvent } from "react";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";
import {
  ADMIN_TREE_CHEVRON_BTN_SIZE,
  TreeChevronButton,
  TreeChevronSpacer,
  TreeIndentGuides,
  TreePageIcon,
} from "@/components/page-tree-shared";
import { WikiIconPickerPopover } from "@/components/wiki-icon-picker-popover";
import { AdminContextMenu } from "@/components/admin-workbench/admin-context-menu";
import {
  buildTreeFromCategoryDraft,
  canMoveSibling,
  type EditableHomeCategory,
  type HomeInlineEditLabels,
} from "@/components/home-inline-edit-types";
import type { DropTarget } from "@/lib/page-reorder";
import type { HomeTreePage } from "@/components/home-inline-edit-types";
import type { PathTreeNode } from "@/lib/page-tree";
import { resolveDropPositionFromEvent } from "@/lib/wiki-tree-drop";
import type { WikiIconKey } from "@/lib/wiki-icon-presets";
import { isWikiIconKey } from "@/lib/wiki-icon-presets";
import type { AdminContextMenuItem } from "@/types/admin-workbench";

type HomeDropState =
  | null
  | { kind: "slot"; pathKey: string; mode: "before" | "after" }
  | { kind: "page"; pathKey: string; mode: "before" | "after" | "inside" }
  | { kind: "folder"; pathKey: string; mode: "inside" }
  | { kind: "root" };

function HomeDropSlot({
  pathKey,
  mode,
  label,
  active,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  pathKey: string;
  mode: "before" | "after";
  label: string;
  active: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}) {
  return (
    <div
      className={`home-tree-drop-slot${active ? " home-tree-drop-slot--active" : ""}`}
      data-path-key={pathKey}
      data-mode={mode}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span className="home-tree-drop-slot-label">{label}</span>
    </div>
  );
}

export function HomeCategoryTreeEditor({
  lang,
  draft,
  labels,
  onPatch,
  onReorder,
  onMoveSibling,
  onPromote,
}: {
  lang: string;
  draft: Map<string, EditableHomeCategory>;
  labels: HomeInlineEditLabels;
  onPatch: (pathKey: string, patch: Partial<EditableHomeCategory>) => void;
  onReorder: (fromId: string, target: DropTarget) => boolean;
  onMoveSibling: (pathKey: string, direction: "up" | "down") => boolean;
  onPromote: (pathKey: string) => void;
}) {
  const tree = useMemo(() => buildTreeFromCategoryDraft(draft, lang), [draft, lang]);
  const [openBranches, setOpenBranches] = useState<Set<string>>(() => new Set());
  const [dragOver, setDragOver] = useState<HomeDropState>(null);
  const [iconPicker, setIconPicker] = useState<null | { pathKey: string; x: number; y: number }>(null);
  const [rowMenu, setRowMenu] = useState<null | { pathKey: string; x: number; y: number }>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const toggleBranch = useCallback((pathKey: string) => {
    setOpenBranches((prev) => {
      const next = new Set(prev);
      if (next.has(pathKey)) next.delete(pathKey);
      else next.add(pathKey);
      return next;
    });
  }, []);

  const openIconPicker = useCallback((pathKey: string, x: number, y: number) => {
    setRowMenu(null);
    setIconPicker({ pathKey, x, y });
  }, []);

  const handleSlotDrop = useCallback(
    (e: DragEvent, pathKey: string, mode: "before" | "after") => {
      e.preventDefault();
      e.stopPropagation();
      const fromId = e.dataTransfer.getData("text/plain");
      const cat = draft.get(pathKey);
      if (!fromId || !cat?.id) return;
      onReorder(fromId, { kind: "page", targetId: cat.id, mode });
      setDragOver(null);
      setDraggingId(null);
    },
    [draft, onReorder],
  );

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
          onMoveSibling={onMoveSibling}
          onPromote={onPromote}
          onOpenIconPicker={openIconPicker}
          onOpenRowMenu={(pathKey, x, y) => setRowMenu({ pathKey, x, y })}
          onSlotDrop={handleSlotDrop}
        />
      ))}
      <div
        className={`home-tree-root-drop${dragOver?.kind === "root" ? " home-tree-root-drop--active" : ""}`}
        onDragOver={(e) => {
          if (!draggingId) return;
          e.preventDefault();
          setDragOver({ kind: "root" });
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          if (dragOver?.kind === "root") setDragOver(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          const fromId = e.dataTransfer.getData("text/plain");
          if (!fromId) return;
          onReorder(fromId, { kind: "root" });
          setDragOver(null);
          setDraggingId(null);
        }}
      >
        {labels.dropRoot}
      </div>
      {iconPicker ? (
        <WikiIconPickerPopover
          x={iconPicker.x}
          y={iconPicker.y}
          value={
            isWikiIconKey(draft.get(iconPicker.pathKey)?.icon ?? "")
              ? (draft.get(iconPicker.pathKey)!.icon as WikiIconKey)
              : null
          }
          label={labels.changeIcon}
          clearLabel={labels.clearIcon}
          onSelect={(icon) => onPatch(iconPicker.pathKey, { icon })}
          onClose={() => setIconPicker(null)}
        />
      ) : null}
      {rowMenu ? (
        <HomeRowContextMenu
          pathKey={rowMenu.pathKey}
          x={rowMenu.x}
          y={rowMenu.y}
          draft={draft}
          labels={labels}
          onClose={() => setRowMenu(null)}
          onMoveSibling={onMoveSibling}
          onOpenIconPicker={openIconPicker}
          onPromote={onPromote}
        />
      ) : null}
    </div>
  );
}

function HomeRowContextMenu({
  pathKey,
  x,
  y,
  draft,
  labels,
  onClose,
  onMoveSibling,
  onOpenIconPicker,
  onPromote,
}: {
  pathKey: string;
  x: number;
  y: number;
  draft: Map<string, EditableHomeCategory>;
  labels: HomeInlineEditLabels;
  onClose: () => void;
  onMoveSibling: (pathKey: string, direction: "up" | "down") => boolean;
  onOpenIconPicker: (pathKey: string, px: number, py: number) => void;
  onPromote: (pathKey: string) => void;
}) {
  const cat = draft.get(pathKey);
  if (!cat?.canEdit) return null;

  const items: AdminContextMenuItem[] = [
    {
      id: "up",
      label: labels.moveUp,
      disabled: !canMoveSibling(draft, pathKey, "up"),
      onClick: () => {
        onMoveSibling(pathKey, "up");
        onClose();
      },
    },
    {
      id: "down",
      label: labels.moveDown,
      disabled: !canMoveSibling(draft, pathKey, "down"),
      onClick: () => {
        onMoveSibling(pathKey, "down");
        onClose();
      },
    },
    { id: "sep1", label: "", separator: true },
    {
      id: "icon",
      label: labels.changeIcon,
      onClick: () => {
        onOpenIconPicker(pathKey, x, y);
        onClose();
      },
    },
  ];

  if (cat.isImplicit) {
    items.push({
      id: "promote",
      label: labels.makeCategory,
      onClick: () => {
        onPromote(pathKey);
        onClose();
      },
    });
  }

  return <AdminContextMenu x={x} y={y} items={items} onClose={onClose} dismissOnScroll={false} />;
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
  onMoveSibling,
  onPromote,
  onOpenIconPicker,
  onOpenRowMenu,
  onSlotDrop,
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
  onMoveSibling: (pathKey: string, direction: "up" | "down") => boolean;
  onPromote: (pathKey: string) => void;
  onOpenIconPicker: (pathKey: string, x: number, y: number) => void;
  onOpenRowMenu: (pathKey: string, x: number, y: number) => void;
  onSlotDrop: (e: DragEvent, pathKey: string, mode: "before" | "after") => void;
}) {
  const cat = draft.get(node.pathKey);
  if (!cat) return null;

  const hasChildren = node.children.length > 0;
  const expandable = hasChildren || cat.isCategory;
  const expanded = !expandable || openBranches.has(node.pathKey);
  const isFolderOnly = !cat.id && hasChildren;
  const draggable = !!cat.id && cat.canEdit && (cat.isCategory || hasChildren);
  const showDescription = cat.canEdit && (cat.isCategory || hasChildren);

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

  const slotBeforeActive = dragOver?.kind === "slot" && dragOver.pathKey === node.pathKey && dragOver.mode === "before";
  const slotAfterActive = dragOver?.kind === "slot" && dragOver.pathKey === node.pathKey && dragOver.mode === "after";

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
    setDraggingId(null);
  };

  const clearDragLeave = (e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(null);
  };

  const rowContent = (
    <>
      {cat.isSystem ? <Lock size={12} aria-hidden className="admin-tree-system-lock" /> : null}
      {draggable ? (
        <span className="home-tree-move-btns">
          <button
            type="button"
            className="home-tree-move-btn"
            disabled={!canMoveSibling(draft, node.pathKey, "up")}
            aria-label={labels.moveUp}
            title={labels.moveUp}
            onClick={() => onMoveSibling(node.pathKey, "up")}
          >
            <ChevronUp size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="home-tree-move-btn"
            disabled={!canMoveSibling(draft, node.pathKey, "down")}
            aria-label={labels.moveDown}
            title={labels.moveDown}
            onClick={() => onMoveSibling(node.pathKey, "down")}
          >
            <ChevronDown size={14} aria-hidden />
          </button>
        </span>
      ) : (
        <span className="home-tree-move-spacer" aria-hidden />
      )}
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
      <div className="home-tree-fields">
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
        {showDescription ? (
          <textarea
            className="home-tree-desc-input"
            rows={2}
            value={cat.excerpt}
            placeholder={labels.descriptionPlaceholder}
            aria-label={labels.descriptionLabel}
            onChange={(e) => onPatch(node.pathKey, { excerpt: e.target.value })}
          />
        ) : null}
      </div>
      {cat.isImplicit && !cat.pendingCreate ? (
        <button type="button" className="home-tree-make-category-btn" onClick={() => onPromote(node.pathKey)}>
          {labels.makeCategory}
        </button>
      ) : null}
      {cat.isImplicit && cat.pendingCreate ? (
        <span className="home-tree-implicit-hint">{labels.implicitHint}</span>
      ) : null}
      {dropMode === "inside" && cat.isCategory ? (
        <span className="home-tree-nest-hint">{labels.dropNest.replace("{title}", cat.title)}</span>
      ) : null}
    </>
  );

  return (
    <div className="admin-tree-branch">
      {cat.id ? (
        <HomeDropSlot
          pathKey={node.pathKey}
          mode="before"
          label={labels.dropReorder}
          active={slotBeforeActive}
          onDragOver={(e) => {
            if (!draggingId) return;
            e.preventDefault();
            e.stopPropagation();
            setDragOver({ kind: "slot", pathKey: node.pathKey, mode: "before" });
          }}
          onDragLeave={clearDragLeave}
          onDrop={(e) => onSlotDrop(e, node.pathKey, "before")}
        />
      ) : null}
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
          onContextMenu={(e) => {
            if (!cat.canEdit) return;
            e.preventDefault();
            e.stopPropagation();
            onOpenRowMenu(node.pathKey, e.clientX, e.clientY);
          }}
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
          onDragLeave={clearDragLeave}
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
              onMoveSibling={onMoveSibling}
              onPromote={onPromote}
              onOpenIconPicker={onOpenIconPicker}
              onOpenRowMenu={onOpenRowMenu}
              onSlotDrop={onSlotDrop}
            />
          ))
        : null}
      {cat.id ? (
        <HomeDropSlot
          pathKey={node.pathKey}
          mode="after"
          label={labels.dropReorder}
          active={slotAfterActive}
          onDragOver={(e) => {
            if (!draggingId) return;
            e.preventDefault();
            e.stopPropagation();
            setDragOver({ kind: "slot", pathKey: node.pathKey, mode: "after" });
          }}
          onDragLeave={clearDragLeave}
          onDrop={(e) => onSlotDrop(e, node.pathKey, "after")}
        />
      ) : null}
    </div>
  );
}
