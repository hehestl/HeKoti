"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import { resolvePageIcon } from "@/lib/page-icon";

export const TREE_INDENT_PX = 12;
export const TREE_CHEVRON_BTN_SIZE = 28;

const chevronBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: TREE_CHEVRON_BTN_SIZE,
  minWidth: TREE_CHEVRON_BTN_SIZE,
  height: TREE_CHEVRON_BTN_SIZE,
  padding: 0,
  border: "none",
  borderRadius: 6,
  background: "transparent",
  color: "var(--muted)",
  cursor: "pointer",
  flexShrink: 0,
};

/** @deprecated Use TreeIndentGuides for VS Code-style guides. */
export function TreeDepthSpacer({ depth }: { depth: number }) {
  if (depth <= 0) return null;
  return <span style={{ width: depth * TREE_INDENT_PX, flexShrink: 0 }} aria-hidden />;
}

export function TreeIndentGuides({ depth, isLast }: { depth: number; isLast: boolean }) {
  if (depth <= 0) return null;
  return (
    <div className="tree-indent-guides" aria-hidden>
      {Array.from({ length: depth }).map((_, index) => {
        const isCurrentLevel = index === depth - 1;
        let colClass = "tree-indent-col tree-indent-col-ancestor";
        if (isCurrentLevel) colClass = isLast ? "tree-indent-col tree-indent-col-last" : "tree-indent-col tree-indent-col-mid";
        return <div key={index} className={colClass} />;
      })}
    </div>
  );
}

export function TreeChevronButton({
  expanded,
  onToggle,
  ariaLabel,
}: {
  expanded: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      style={chevronBtn}
      aria-expanded={expanded}
      aria-label={ariaLabel}
      draggable={false}
      onClick={(e) => {
        e.preventDefault();
        onToggle();
      }}
    >
      {expanded ? <ChevronDown size={16} strokeWidth={2} aria-hidden /> : <ChevronRight size={16} strokeWidth={2} aria-hidden />}
    </button>
  );
}

export function TreeChevronSpacer() {
  return (
    <span
      style={{ width: TREE_CHEVRON_BTN_SIZE, minWidth: TREE_CHEVRON_BTN_SIZE, flexShrink: 0 }}
      aria-hidden
    />
  );
}

export function TreePageIcon({ icon, isCategory, size = 14 }: { icon: string | null; isCategory: boolean; size?: number }) {
  const Icon = resolvePageIcon({ icon, isCategory });
  return <Icon size={size} aria-hidden />;
}
