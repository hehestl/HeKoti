import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";

export type RevisionSnapshot = {
  title: string;
  contentMd: string;
  slug: string | null;
  path: string | null;
  icon: string | null;
  isPublished: boolean | null;
  showToc: boolean | null;
  isCategory: boolean | null;
  navOrder: number | null;
};

export type MetadataDiffRow = {
  field: keyof RevisionSnapshot;
  before: string;
  after: string;
  changed: boolean;
};

export type PageRevisionSource = {
  title: string;
  contentMd: string;
  slug: string;
  path: string;
  icon: string | null;
  isPublished: boolean;
  showToc: boolean;
  isCategory: boolean;
  navOrder: number;
};

const METADATA_FIELDS: (keyof RevisionSnapshot)[] = [
  "title",
  "slug",
  "path",
  "icon",
  "isPublished",
  "showToc",
  "isCategory",
  "navOrder",
];

export function contentHash(contentMd: string): string {
  return createHash("sha256").update(contentMd).digest("hex");
}

export function contentSizeBytes(contentMd: string): number {
  return Buffer.byteLength(contentMd, "utf8");
}

export function pageToRevisionSnapshot(page: PageRevisionSource): RevisionSnapshot {
  return {
    title: page.title,
    contentMd: page.contentMd,
    slug: page.slug,
    path: page.path,
    icon: page.icon,
    isPublished: page.isPublished,
    showToc: page.showToc,
    isCategory: page.isCategory,
    navOrder: page.navOrder,
  };
}

export function revisionRowToSnapshot(row: {
  title: string;
  contentMd: string;
  slug: string | null;
  path: string | null;
  icon: string | null;
  isPublished: boolean | null;
  showToc: boolean | null;
  isCategory: boolean | null;
  navOrder: number | null;
}): RevisionSnapshot {
  return {
    title: row.title,
    contentMd: row.contentMd,
    slug: row.slug,
    path: row.path,
    icon: row.icon,
    isPublished: row.isPublished,
    showToc: row.showToc,
    isCategory: row.isCategory,
    navOrder: row.navOrder,
  };
}

function formatFieldValue(field: keyof RevisionSnapshot, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function contentLineStats(prev: string, next: string): { added: number; removed: number } {
  const prevCounts = lineMultiset(prev);
  const nextCounts = lineMultiset(next);
  let removed = 0;
  let added = 0;

  for (const [line, count] of prevCounts) {
    const nextCount = nextCounts.get(line) ?? 0;
    if (count > nextCount) removed += count - nextCount;
  }
  for (const [line, count] of nextCounts) {
    const prevCount = prevCounts.get(line) ?? 0;
    if (count > prevCount) added += count - prevCount;
  }

  return { added, removed };
}

function lineMultiset(text: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of text.split("\n")) {
    const key = line.trimEnd();
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function diffRevisionMetadata(
  prev: RevisionSnapshot | null,
  next: RevisionSnapshot,
): MetadataDiffRow[] {
  const rows: MetadataDiffRow[] = [];
  for (const field of METADATA_FIELDS) {
    const before = prev ? formatFieldValue(field, prev[field]) : "—";
    const after = formatFieldValue(field, next[field]);
    rows.push({
      field,
      before,
      after,
      changed: prev ? prev[field] !== next[field] : true,
    });
  }

  const contentChanged = !prev || prev.contentMd !== next.contentMd;
  rows.push({
    field: "contentMd",
    before: prev?.contentMd ?? "",
    after: next.contentMd,
    changed: contentChanged,
  });

  return rows;
}

export function isSignificantChange(prev: RevisionSnapshot | null, next: RevisionSnapshot): boolean {
  if (!prev) return true;
  const significantFields: (keyof RevisionSnapshot)[] = [
    "title",
    "slug",
    "path",
    "icon",
    "isPublished",
    "showToc",
    "isCategory",
    "contentMd",
  ];
  for (const field of significantFields) {
    if (prev[field] !== next[field]) return true;
  }
  return false;
}

export function generateRevisionSummary(prev: RevisionSnapshot | null, next: RevisionSnapshot): string {
  if (!prev) return "created";

  const parts: string[] = [];
  const stats = contentLineStats(prev.contentMd, next.contentMd);
  if (stats.added > 0 || stats.removed > 0) {
    parts.push(`+${stats.added} -${stats.removed} lines`);
  }

  for (const row of diffRevisionMetadata(prev, next)) {
    if (!row.changed || row.field === "contentMd") continue;
    parts.push(row.field);
  }

  return parts.length > 0 ? parts.join(", ") : "updated";
}

export function snapshotToRevisionCreate(
  pageId: string,
  editorId: string,
  snapshot: RevisionSnapshot,
  summary: string,
): Prisma.PageRevisionCreateInput {
  return {
    page: { connect: { id: pageId } },
    editor: { connect: { id: editorId } },
    title: snapshot.title,
    contentMd: snapshot.contentMd,
    slug: snapshot.slug,
    path: snapshot.path,
    icon: snapshot.icon,
    isPublished: snapshot.isPublished,
    showToc: snapshot.showToc,
    isCategory: snapshot.isCategory,
    navOrder: snapshot.navOrder,
    contentHash: contentHash(snapshot.contentMd),
    sizeBytes: contentSizeBytes(snapshot.contentMd),
    summary,
  };
}

type DbClient = Prisma.TransactionClient | {
  pageRevision: Prisma.TransactionClient["pageRevision"];
};

export async function createPageRevision(
  db: DbClient,
  page: PageRevisionSource & { id: string },
  editorId: string,
  prevSnapshot: RevisionSnapshot | null,
  opts?: { created?: boolean; force?: boolean },
) {
  const next = pageToRevisionSnapshot(page);
  if (!opts?.force && !opts?.created && prevSnapshot && !isSignificantChange(prevSnapshot, next)) {
    return null;
  }

  const summary = opts?.created ? "created" : generateRevisionSummary(prevSnapshot, next);
  return db.pageRevision.create({
    data: snapshotToRevisionCreate(page.id, editorId, next, summary),
  });
}
