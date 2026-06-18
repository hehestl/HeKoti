"use client";

import { Eye, EyeOff } from "lucide-react";

export function AdminStatusBar({
  status,
  uiLang,
  version,
  previewVisible,
  onTogglePreview,
  dict,
}: {
  status: { text: string; tone: "neutral" | "error" };
  uiLang: string;
  version: string;
  previewVisible: boolean;
  onTogglePreview: () => void;
  dict: Record<string, string>;
}) {
  return (
    <footer className="admin-status-bar">
      <span className={status.tone === "error" ? "admin-status-text admin-status-text-error" : "admin-status-text"}>
        {status.text}
      </span>
      <div className="admin-status-bar-right">
        <button
          type="button"
          className="admin-status-btn"
          onClick={onTogglePreview}
          title={previewVisible ? dict.previewHide : dict.previewShow}
          aria-label={previewVisible ? dict.previewHide : dict.previewShow}
          aria-pressed={previewVisible}
        >
          {previewVisible ? <Eye size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />}
          <span>{dict.preview}</span>
        </button>
        <span className="admin-status-meta">{uiLang.toUpperCase()}</span>
        <span className="admin-status-meta">v{version}</span>
      </div>
    </footer>
  );
}
