/** Active (non-trashed) pages filter for Prisma queries. */
export const activePageWhere = { deletedAt: null } as const;

export function mergeActivePageWhere<T extends Record<string, unknown>>(where: T) {
  return { ...where, deletedAt: null };
}
