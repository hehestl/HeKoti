"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { InlineEditToolbar } from "@/components/inline-edit-toolbar";
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

  const autosaveTimerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    registerPage(page);
    return unregisterPage;
  }, [page, registerPage, unregisterPage]);

  useEffect(() => {
    if (!isEditing || !draft) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void saveNow({ silent: true });
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [draft?.title, draft?.contentMd, isEditing, saveNow]);

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
      <InlineEditToolbar
        saveLabel={labels.save}
        cancelLabel={labels.cancel}
        statusText={statusText}
        statusTone={statusTone}
        onSave={() => void saveNow()}
        onCancel={cancelEdit}
      >
        {!draft.systemKey ? (
          <button type="button" className="wiki-inline-edit-btn wiki-inline-edit-btn-muted" onClick={() => void togglePublish()}>
            {draft.isPublished ? labels.unpublish : labels.publish}
          </button>
        ) : null}
      </InlineEditToolbar>
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
