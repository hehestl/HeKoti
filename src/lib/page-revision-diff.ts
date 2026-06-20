import type { RevisionSnapshot } from "@/lib/page-revision-snapshot";
import { contentLineStats, diffRevisionMetadata } from "@/lib/page-revision-snapshot";

export type RevisionListItem = {
  id: string;
  createdAt: Date;
};

export type DiffSideKind = "revision" | "current";

export type DiffSide = {
  kind: DiffSideKind;
  id: string | null;
  label: string;
  snapshot: RevisionSnapshot;
};

export function resolveDiffRevisionIds(
  revisions: RevisionListItem[],
  query: { from?: string; to: string },
): { fromId: string | "current" | null; toId: string | "current" } {
  const toId = query.to === "current" ? "current" : query.to;
  const sorted = [...revisions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (query.from && query.from !== "previous") {
    return {
      fromId: query.from === "current" ? "current" : query.from,
      toId,
    };
  }

  if (toId === "current") {
    const latest = sorted[0];
    return { fromId: latest?.id ?? null, toId: "current" };
  }

  const toIndex = sorted.findIndex((r) => r.id === toId);
  if (toIndex < 0) {
    return { fromId: null, toId };
  }

  const fromRevision = sorted[toIndex + 1];
  return { fromId: fromRevision?.id ?? null, toId };
}

export function buildDiffPayload(input: {
  from: DiffSide;
  to: DiffSide;
}) {
  const metadataDiff = diffRevisionMetadata(
    input.from.kind === "current" ? input.from.snapshot : input.from.snapshot,
    input.to.snapshot,
  );

  const titleChanged = input.from.snapshot.title !== input.to.snapshot.title;
  const contentChanged = input.from.snapshot.contentMd !== input.to.snapshot.contentMd;
  const lineStats = contentLineStats(input.from.snapshot.contentMd, input.to.snapshot.contentMd);

  return {
    from: input.from,
    to: input.to,
    titleChanged,
    contentChanged,
    lineStats,
    metadataDiff: metadataDiff.filter((row) => row.field !== "contentMd"),
    fromContentMd: input.from.snapshot.contentMd,
    toContentMd: input.to.snapshot.contentMd,
    fromTitle: input.from.snapshot.title,
    toTitle: input.to.snapshot.title,
  };
}

export function parseRevisionCursor(cursor: string | null): { createdAt: Date; id: string } | null {
  if (!cursor) return null;
  const sep = cursor.lastIndexOf("|");
  if (sep <= 0) return null;
  const createdAt = new Date(cursor.slice(0, sep));
  const id = cursor.slice(sep + 1);
  if (Number.isNaN(createdAt.getTime()) || !id) return null;
  return { createdAt, id };
}

export function encodeRevisionCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()}|${id}`;
}
