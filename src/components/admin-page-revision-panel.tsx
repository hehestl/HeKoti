"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AdminRevisionDiff } from "@/components/admin-revision-diff";
import {
  formatRevisionRelativeTime,
  parseRevisionSummaryParts,
  usePageRevisions,
} from "@/hooks/use-page-revisions";
import type { Dictionary } from "@/lib/i18n";

export function AdminPageRevisionPanel({
  pageId,
  pageTitle,
  uiLang,
  dict,
  onClose,
}: {
  pageId: string;
  pageTitle: string;
  uiLang: string;
  dict: Dictionary;
  onClose: () => void;
}) {
  const wb = dict.admin.workbench;
  const {
    items,
    nextCursor,
    loading,
    loadingMore,
    error,
    selectedId,
    setSelectedId,
    compareWithCurrent,
    setCompareWithCurrent,
    diff,
    diffLoading,
    loadMore,
  } = usePageRevisions(pageId);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="admin-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-revision-panel admin-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-revision-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-revision-panel-header">
          <div>
            <h2 id="admin-revision-panel-title">{wb.revisionHistory}</h2>
            <p className="admin-revision-panel-subtitle">{pageTitle}</p>
          </div>
          <button type="button" className="admin-revision-close" onClick={onClose} aria-label={wb.revisionClose}>
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="admin-revision-panel-body">
          <aside className="admin-revision-timeline">
            {loading ? <p className="admin-sidebar-hint">{dict.common.loading}</p> : null}
            {error ? <p className="admin-revision-error">{error}</p> : null}
            <ul className="admin-revision-list">
              {items.map((item, index) => {
                const isOldest = index === items.length - 1 && !nextCursor;
                const isCreated = item.summary === "created" || isOldest;
                const parts = parseRevisionSummaryParts(item.summary);
                const rel = formatRevisionRelativeTime(item.createdAt, uiLang);
                const fullDate = new Date(item.createdAt).toLocaleString(uiLang);

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`admin-revision-item${selectedId === item.id ? " admin-revision-item-active" : ""}`}
                      onClick={() => setSelectedId(item.id)}
                      title={fullDate}
                    >
                      <span className="admin-revision-item-time">{rel}</span>
                      <span className="admin-revision-item-editor">{item.editor.email}</span>
                      <span className="admin-revision-item-summary">
                        {isCreated ? wb.revisionCreated : null}
                        {parts.lines ? (
                          <span className="admin-revision-summary-lines">{parts.lines}</span>
                        ) : null}
                        {parts.fields.length > 0 ? (
                          <span className="admin-revision-summary-fields">{parts.fields.join(", ")}</span>
                        ) : null}
                        {!isCreated && !parts.lines && !parts.fields.length && item.summary ? (
                          <span>{item.summary}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {nextCursor ? (
              <button type="button" className="wiki-inline-edit-btn wiki-inline-edit-btn-muted" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? dict.common.loading : wb.revisionLoadMore}
              </button>
            ) : null}
          </aside>

          <section className="admin-revision-diff-pane">
            <label className="admin-revision-compare-toggle">
              <input
                type="checkbox"
                checked={compareWithCurrent}
                onChange={(e) => setCompareWithCurrent(e.target.checked)}
              />
              {wb.revisionCompareCurrent}
            </label>
            {diffLoading ? <p className="admin-sidebar-hint">{dict.common.loading}</p> : null}
            {diff && !diffLoading ? (
              <AdminRevisionDiff
                diff={diff}
                dict={dict}
                onCopyMarkdown={() => void navigator.clipboard.writeText(diff.toContentMd)}
              />
            ) : null}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
