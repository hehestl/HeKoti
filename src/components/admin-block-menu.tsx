"use client";

import { useMemo, useState } from "react";
import { AdminContextMenu } from "@/components/admin-workbench/admin-context-menu";
import type { AdminContextMenuItem } from "@/types/admin-workbench";

export type BlockMenuType = "text" | "h1" | "h2" | "h3" | "h4" | "bullet" | "numbered" | "todo";

type BlockMenuItemDef = {
  id: BlockMenuType | "close" | string;
  label: string;
  shortcut?: string;
  separator?: boolean;
};

const BLOCK_ITEMS: BlockMenuItemDef[] = [
  { id: "h2", label: "Heading 2", shortcut: "##" },
  { id: "bullet", label: "Bulleted list", shortcut: "-" },
  { id: "todo", label: "To-do list", shortcut: "- [ ]" },
  { id: "sep1", label: "", separator: true },
  { id: "text", label: "Text" },
  { id: "h1", label: "Heading 1", shortcut: "#" },
  { id: "h3", label: "Heading 3", shortcut: "###" },
  { id: "h4", label: "Heading 4", shortcut: "####" },
  { id: "numbered", label: "Numbered list", shortcut: "1." },
  { id: "sep2", label: "", separator: true },
  { id: "close", label: "Close menu", shortcut: "esc" },
];

export function AdminBlockMenu({
  x,
  y,
  labels,
  onPick,
  onClose,
}: {
  x: number;
  y: number;
  labels: { filterPlaceholder: string; close: string };
  onPick: (type: BlockMenuType) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("");

  const items = useMemo((): AdminContextMenuItem[] => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? BLOCK_ITEMS.filter((item) => item.separator || item.label.toLowerCase().includes(q))
      : BLOCK_ITEMS;

    return filtered.map((item) => {
      if (item.separator) {
        return { id: item.id, label: "", separator: true };
      }
      if (item.id === "close") {
        return {
          id: "close",
          label: labels.close,
          shortcut: item.shortcut,
          onClick: onClose,
        };
      }
      return {
        id: item.id,
        label: item.label,
        shortcut: item.shortcut,
        onClick: () => onPick(item.id as BlockMenuType),
      };
    });
  }, [filter, labels.close, onClose, onPick]);

  return (
    <AdminContextMenu
      x={x}
      y={y}
      items={items}
      onClose={onClose}
      dismissOnScroll={false}
      header={
        <div className="admin-block-menu-filter">
          <input
            type="text"
            value={filter}
            placeholder={labels.filterPlaceholder}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            autoFocus
          />
        </div>
      }
    />
  );
}
