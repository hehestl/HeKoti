"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";

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

export function TreeDepthSpacer({ depth }: { depth: number }) {
  if (depth <= 0) return null;
  return <span style={{ width: depth * TREE_INDENT_PX, flexShrink: 0 }} aria-hidden />;
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
      onClick={(e) => {
        e.preventDefault();
        onToggle();
      }}
    >
      {expanded ? <ChevronDown size={16} strokeWidth={2} /> : <ChevronRight size={16} strokeWidth={2} />}
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
