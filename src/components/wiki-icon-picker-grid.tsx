"use client";

import { WIKI_ICON_PRESETS, type WikiIconKey } from "@/lib/wiki-icon-presets";

export function WikiIconPickerGrid({
  value,
  onChange,
  label,
  clearLabel,
}: {
  value: WikiIconKey | null;
  onChange: (icon: WikiIconKey | null) => void;
  label: string;
  clearLabel: string;
}) {
  const keys = Object.keys(WIKI_ICON_PRESETS) as WikiIconKey[];

  return (
    <div className="wiki-icon-picker-grid-wrap">
      <span className="wiki-icon-picker-grid-label">{label}</span>
      <div className="wiki-icon-picker-grid" role="listbox" aria-label={label}>
        {keys.map((key) => {
          const Icon = WIKI_ICON_PRESETS[key];
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={selected}
              className={`wiki-icon-picker-grid-btn${selected ? " is-selected" : ""}`}
              title={key}
              onClick={() => onChange(key)}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden />
            </button>
          );
        })}
      </div>
      <button type="button" className="wiki-icon-picker-grid-clear" onClick={() => onChange(null)}>
        {clearLabel}
      </button>
    </div>
  );
}
