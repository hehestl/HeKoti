"use client";

import { useEffect, useRef } from "react";
import { WikiIconPickerGrid } from "@/components/wiki-icon-picker-grid";
import type { WikiIconKey } from "@/lib/wiki-icon-presets";

export function WikiIconPickerPopover({
  x,
  y,
  value,
  label,
  clearLabel,
  onSelect,
  onClose,
}: {
  x: number;
  y: number;
  value: WikiIconKey | null;
  label: string;
  clearLabel: string;
  onSelect: (icon: WikiIconKey | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="wiki-icon-picker-popover"
      style={{ top: y, left: x }}
      role="dialog"
      aria-label={label}
    >
      <WikiIconPickerGrid
        value={value}
        onChange={(icon) => {
          onSelect(icon);
          onClose();
        }}
        label={label}
        clearLabel={clearLabel}
      />
    </div>
  );
}
