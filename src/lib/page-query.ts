/** Active (non-trashed) pages filter for Prisma queries. */
export const activePageWhere = { deletedAt: null } as const;

/** Public wiki pages only (excludes internal notes). */
export const wikiPageWhere = { scope: "WIKI" as const, deletedAt: null };

/** Internal admin notes only. */
export const notesPageWhere = { scope: "NOTES" as const, deletedAt: null };

export function mergeActivePageWhere<T extends Record<string, unknown>>(where: T) {
  return { ...where, deletedAt: null };
}

export function mergeWikiPageWhere<T extends Record<string, unknown>>(where: T) {
  return { ...where, scope: "WIKI" as const, deletedAt: null };
}
