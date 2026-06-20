"use client";

import { AdminContextMenu } from "@/components/admin-workbench/admin-context-menu";
import type { AdminContextMenuItem } from "@/types/admin-workbench";
import type { WikiIconKey } from "@/lib/wiki-icon-presets";
import { WIKI_ICON_PRESETS } from "@/lib/wiki-icon-presets";

export function WikiIconPickerMenu({
  x,
  y,
  clearLabel,
  onSelect,
  onClose,
}: {
  x: number;
  y: number;
  clearLabel: string;
  onSelect: (icon: WikiIconKey | null) => void;
  onClose: () => void;
}) {
  const items: AdminContextMenuItem[] = [
    ...(Object.keys(WIKI_ICON_PRESETS) as WikiIconKey[]).map((key) => ({
      id: key,
      label: key,
      onClick: () => {
        onSelect(key);
        onClose();
      },
    })),
    { id: "sep", label: "", separator: true },
    {
      id: "clear",
      label: clearLabel,
      onClick: () => {
        onSelect(null);
        onClose();
      },
    },
  ];

  return (
    <AdminContextMenu
      x={x || 120}
      y={y || 120}
      items={items}
      onClose={onClose}
    />
  );
}
