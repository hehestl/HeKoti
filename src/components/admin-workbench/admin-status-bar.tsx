"use client";

import { Eye, EyeOff, FileDown, FileText, List, ListX, Table } from "lucide-react";
import type { AdminPageRow } from "@/types/admin-workbench";

export type AdminStatusBarExtras = {
  showTocControls: boolean;
  showToc: boolean;
  onToggleShowToc: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
  onExportMarkdown: () => void;
};

export function AdminStatusBar({
  status,
  uiLang,
  version,
  previewVisible,
  onTogglePreview,
  dict,
  pageExtras,
}: {
  status: { text: string; tone: "neutral" | "error" };
  uiLang: string;
  version: string;
  previewVisible: boolean;
  onTogglePreview: () => void;
  dict: Record<string, string>;
  pageExtras?: AdminStatusBarExtras | null;
}) {
  return (
    <footer className="admin-status-bar">
      <span className={status.tone === "error" ? "admin-status-text admin-status-text-error" : "admin-status-text"}>
        {status.text}
      </span>
      <div className="admin-status-bar-right">
        {pageExtras ? (
          <div className="admin-status-bar-tools">
            {pageExtras.showTocControls ? (
              <button
                type="button"
                className="admin-status-btn"
                onClick={pageExtras.onToggleShowToc}
                title={pageExtras.showToc ? dict.tocNavOn : dict.tocNavOff}
                aria-label={pageExtras.showToc ? dict.tocNavOn : dict.tocNavOff}
                aria-pressed={pageExtras.showToc}
              >
                {pageExtras.showToc ? <List size={14} aria-hidden /> : <ListX size={14} aria-hidden />}
                <span>{dict.tocNav}</span>
              </button>
            ) : null}
            <button
              type="button"
              className="admin-status-btn"
              onClick={pageExtras.onExportPdf}
              title={dict.exportPdf}
              aria-label={dict.exportPdf}
            >
              <FileDown size={14} aria-hidden />
              <span>PDF</span>
            </button>
            <button
              type="button"
              className="admin-status-btn"
              onClick={pageExtras.onExportCsv}
              title={dict.exportCsv}
              aria-label={dict.exportCsv}
            >
              <Table size={14} aria-hidden />
              <span>CSV</span>
            </button>
            <button
              type="button"
              className="admin-status-btn"
              onClick={pageExtras.onExportMarkdown}
              title={dict.exportMarkdown}
              aria-label={dict.exportMarkdown}
            >
              <FileText size={14} aria-hidden />
              <span>MD</span>
            </button>
          </div>
        ) : null}
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

export function buildStatusBarExtras(
  active: AdminPageRow | undefined,
  handlers: {
    patchShowToc: (value: boolean) => void;
    onExportPdf: () => void;
    onExportCsv: () => void;
    onExportMarkdown: () => void;
  },
  isNotes: boolean,
): AdminStatusBarExtras | null {
  if (!active || isNotes) return null;
  return {
    showTocControls: active.scope === "WIKI" && !active.isCategory,
    showToc: active.showToc,
    onToggleShowToc: () => handlers.patchShowToc(!active.showToc),
    onExportPdf: handlers.onExportPdf,
    onExportCsv: handlers.onExportCsv,
    onExportMarkdown: handlers.onExportMarkdown,
  };
}
