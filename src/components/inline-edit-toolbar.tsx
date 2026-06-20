"use client";

import type { ReactNode } from "react";

export function InlineEditToolbar({
  saveLabel,
  cancelLabel,
  statusText,
  statusTone = "neutral",
  onSave,
  onCancel,
  children,
}: {
  saveLabel: string;
  cancelLabel: string;
  statusText?: string;
  statusTone?: "neutral" | "error";
  onSave: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="wiki-inline-edit-toolbar">
      <div className="wiki-inline-edit-toolbar-actions">
        <button type="button" className="wiki-inline-edit-btn" onClick={onSave}>
          {saveLabel}
        </button>
        <button type="button" className="wiki-inline-edit-btn wiki-inline-edit-btn-muted" onClick={onCancel}>
          {cancelLabel}
        </button>
        {children}
      </div>
      {statusText ? (
        <span className={`wiki-inline-edit-status${statusTone === "error" ? " wiki-inline-edit-status-error" : ""}`}>
          {statusText}
        </span>
      ) : null}
    </div>
  );
}
