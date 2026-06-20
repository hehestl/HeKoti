"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { AdminMarkdownEditor } from "@/components/admin-markdown-editor";
import { WikiArticleToc } from "@/components/wiki-article-toc";
import type { EditableWikiPage } from "@/components/wiki-inline-edit-types";
import { useWikiInlineEdit } from "@/components/wiki-inline-edit-context";
import type { Dictionary } from "@/lib/i18n";
import { extractWikiHeadingsCached, shouldShowWikiToc } from "@/lib/wiki-headings";

export function WikiEditableArticle({
  variant,
  page,
  lang,
  html,
  dateLabel,
  updatedAt,
  dict,
  footer,
  showTitle = true,
}: {
  variant: "article" | "catalog-body";
  page: EditableWikiPage;
  lang: string;
  html: string;
  dateLabel?: string;
  updatedAt?: string;
  dict: Dictionary;
  footer?: ReactNode;
  showTitle?: boolean;
}) {
  const {
    isEditing,
    isAdmin,
    draft,
    wikiPages,
    labels,
    statusText,
    statusTone,
    registerPage,
    unregisterPage,
    patchDraft,
    saveNow,
    cancelEdit,
    togglePublish,
    editablePage,
  } = useWikiInlineEdit();

  useEffect(() => {
    registerPage(page);
    return unregisterPage;
  }, [page, registerPage, unregisterPage]);

  useEffect(() => {
    if (!isEditing || !draft) return;
    const timer = window.setTimeout(() => {
      void saveNow({ silent: true });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [draft?.title, draft?.contentMd, isEditing, saveNow, draft]);

  useEffect(() => {
    if (!isEditing) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      void saveNow();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEditing, saveNow]);

  const displayPage = editablePage ?? page;
  const title = isEditing && draft ? draft.title : displayPage.title;
  const showDraftBadge = isAdmin && !displayPage.isPublished;
  const contentForToc = isEditing && draft ? draft.contentMd : displayPage.contentMd;
  const headings = useMemo(() => extractWikiHeadingsCached(contentForToc), [contentForToc]);
  const tocVisible = shouldShowWikiToc(displayPage.showToc, headings);

  const articleBody = (bodyHtml: string) => (
    <div className="wiki-article-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  );

  const articleShell = (bodyHtml: string, extra?: ReactNode) => {
    const main = (
      <>
        {showTitle ? (
          <h1 className="wiki-article-title">
            {title}
            {showDraftBadge ? <span className="wiki-article-draft-badge">{labels.draftBadge}</span> : null}
          </h1>
        ) : null}
        {dateLabel && updatedAt ? (
          <time className="wiki-article-date" dateTime={updatedAt}>
            {dateLabel}
          </time>
        ) : null}
        {articleBody(bodyHtml)}
        {extra}
      </>
    );

    if (!tocVisible) {
      return <article className="wiki-article">{main}</article>;
    }

    return (
      <div className="wiki-article-with-toc">
        <article className="wiki-article wiki-article-main">{main}</article>
        <WikiArticleToc
          headings={headings}
          ariaLabel={dict.article.tocNav}
          toggleLabel={dict.article.tocNavToggle}
        />
      </div>
    );
  };

  if (!isEditing || !draft) {
    if (variant === "catalog-body") {
      return (
        <div
          className="wiki-collection-body wiki-article-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    return articleShell(html, footer);
  }

  const body = (
    <>
      <div className="wiki-inline-edit-toolbar">
        <div className="wiki-inline-edit-toolbar-actions">
          <button type="button" className="wiki-inline-edit-btn" onClick={() => void saveNow()}>
            {labels.save}
          </button>
          <button type="button" className="wiki-inline-edit-btn wiki-inline-edit-btn-muted" onClick={cancelEdit}>
            {labels.cancel}
          </button>
          {!draft.systemKey ? (
            <button type="button" className="wiki-inline-edit-btn wiki-inline-edit-btn-muted" onClick={() => void togglePublish()}>
              {draft.isPublished ? labels.unpublish : labels.publish}
            </button>
          ) : null}
        </div>
        {statusText ? (
          <span className={`wiki-inline-edit-status${statusTone === "error" ? " wiki-inline-edit-status-error" : ""}`}>
            {statusText}
          </span>
        ) : null}
      </div>
      {showTitle ? (
        <input
          className="wiki-inline-edit-title-input"
          value={draft.title}
          onChange={(e) => patchDraft({ title: e.target.value })}
        />
      ) : null}
      <div className="wiki-inline-edit-editor">
        <AdminMarkdownEditor
          key={`${draft.id}:${draft.lang}`}
          value={draft.contentMd}
          onChange={(v) => patchDraft({ contentMd: v })}
          lang={lang}
          wikiPages={wikiPages}
          dict={dict}
          height="min(60vh, 720px)"
        />
      </div>
    </>
  );

  if (variant === "catalog-body") {
    return <div className="wiki-collection-body wiki-inline-edit-wrap">{body}</div>;
  }

  return (
    <article className="wiki-article wiki-inline-edit-wrap">
      {body}
      {footer}
    </article>
  );
}
