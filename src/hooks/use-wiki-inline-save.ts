"use client";

import { useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api-fetch";
import type { EditableWikiPage, WikiInlineEditLabels } from "@/components/wiki-inline-edit-types";

export function pageDraftEquals(a: EditableWikiPage, b: EditableWikiPage): boolean {
  return a.title === b.title && a.contentMd === b.contentMd && a.isPublished === b.isPublished;
}

/** After PATCH: apply server body only if the user did not change draft during the request. */
export function mergeDraftAfterSave(
  current: EditableWikiPage,
  snapshot: EditableWikiPage,
  saved: EditableWikiPage,
): EditableWikiPage {
  return pageDraftEquals(current, snapshot) ? saved : current;
}

/** unregisterPage must read live isEditing via ref — stale closure would wipe draft in edit mode. */
export function shouldClearDraftOnUnregister(isEditing: boolean): boolean {
  return !isEditing;
}

export function useWikiInlineSave({
  labels,
  setStatus,
}: {
  labels: WikiInlineEditLabels;
  setStatus: (text: string, tone?: "neutral" | "error") => void;
}) {
  const savingRef = useRef(false);

  const patchPage = useCallback(
    async (page: EditableWikiPage, patch: { title?: string; contentMd?: string; isPublished?: boolean }) => {
      const res = await apiFetch(`/api/pages/${page.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = (await res.json()) as EditableWikiPage & { message?: string };
      if (!res.ok) {
        throw new Error(body.message ?? labels.failed);
      }
      return {
        ...page,
        title: body.title ?? page.title,
        contentMd: body.contentMd ?? page.contentMd,
        isPublished: body.isPublished ?? page.isPublished,
      };
    },
    [labels.failed],
  );

  const saveDraft = useCallback(
    async (draft: EditableWikiPage, baseline: EditableWikiPage, opts?: { silent?: boolean }) => {
      if (pageDraftEquals(draft, baseline)) return baseline;
      if (savingRef.current) return null;
      savingRef.current = true;
      if (!opts?.silent) setStatus(labels.saving);
      try {
        const saved = await patchPage(draft, {
          title: draft.title,
          contentMd: draft.contentMd,
        });
        setStatus(labels.saved);
        return saved;
      } catch (e) {
        setStatus(e instanceof Error ? e.message : labels.failed, "error");
        return null;
      } finally {
        savingRef.current = false;
      }
    },
    [labels.failed, labels.saved, labels.saving, patchPage, setStatus],
  );

  const togglePublish = useCallback(
    async (page: EditableWikiPage) => {
      if (savingRef.current) return null;
      savingRef.current = true;
      setStatus(labels.saving);
      try {
        const next = !page.isPublished;
        const saved = await patchPage(page, { isPublished: next });
        setStatus(labels.saved);
        return saved;
      } catch (e) {
        setStatus(e instanceof Error ? e.message : labels.failed, "error");
        return null;
      } finally {
        savingRef.current = false;
      }
    },
    [labels.failed, labels.saved, labels.saving, patchPage, setStatus],
  );

  return { saveDraft, togglePublish };
}
