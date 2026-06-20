"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import type { MetadataDiffRow } from "@/lib/page-revision-snapshot";

export type RevisionListItem = {
  id: string;
  createdAt: string;
  summary: string | null;
  sizeBytes: number | null;
  editor: { email: string };
};

export type RevisionDiffPayload = {
  fromTitle: string;
  toTitle: string;
  fromContentMd: string;
  toContentMd: string;
  titleChanged: boolean;
  contentChanged: boolean;
  lineStats: { added: number; removed: number };
  metadataDiff: MetadataDiffRow[];
};

export function usePageRevisions(pageId: string | null) {
  const [items, setItems] = useState<RevisionListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareWithCurrent, setCompareWithCurrent] = useState(false);
  const [diff, setDiff] = useState<RevisionDiffPayload | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const loadList = useCallback(async (cursor?: string | null) => {
    if (!pageId) return;
    const isMore = !!cursor;
    if (isMore) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ limit: "30" });
      if (cursor) qs.set("cursor", cursor);
      const res = await apiFetch(`/api/pages/${pageId}/revisions?${qs.toString()}`);
      const body = (await res.json()) as {
        items?: RevisionListItem[];
        nextCursor?: string | null;
        message?: string;
      };
      if (!res.ok) throw new Error(body.message ?? "Failed to load revisions.");
      setItems((prev) => (isMore ? [...prev, ...(body.items ?? [])] : (body.items ?? [])));
      setNextCursor(body.nextCursor ?? null);
      if (!isMore && body.items?.[0]) setSelectedId(body.items[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load revisions.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pageId]);

  useEffect(() => {
    if (!pageId) return;
    setItems([]);
    setNextCursor(null);
    setSelectedId(null);
    setDiff(null);
    setCompareWithCurrent(false);
    void loadList();
  }, [loadList, pageId]);

  const loadDiff = useCallback(async () => {
    if (!pageId || !selectedId) return;
    setDiffLoading(true);
    try {
      const qs = new URLSearchParams({
        to: compareWithCurrent ? "current" : selectedId,
        from: "previous",
      });
      const res = await apiFetch(`/api/pages/${pageId}/revisions/diff?${qs.toString()}`);
      const body = (await res.json()) as RevisionDiffPayload & { message?: string };
      if (!res.ok) throw new Error(body.message ?? "Failed to load diff.");
      setDiff(body);
    } catch {
      setDiff(null);
    } finally {
      setDiffLoading(false);
    }
  }, [compareWithCurrent, pageId, selectedId]);

  useEffect(() => {
    void loadDiff();
  }, [loadDiff]);

  return {
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
    loadMore: () => (nextCursor ? loadList(nextCursor) : undefined),
  };
}

export function formatRevisionRelativeTime(iso: string, locale: string): string {
  const date = new Date(iso);
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 48) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
  const diffMonth = Math.round(diffDay / 30);
  return rtf.format(diffMonth, "month");
}

export function parseRevisionSummaryParts(summary: string | null): { lines?: string; fields: string[] } {
  if (!summary || summary === "created") return { fields: [] };
  const parts = summary.split(",").map((p) => p.trim()).filter(Boolean);
  const linePart = parts.find((p) => p.includes("lines"));
  const fields = parts.filter((p) => p !== linePart);
  return { lines: linePart, fields };
}
