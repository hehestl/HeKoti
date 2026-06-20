import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const REDIRECT_TTL_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function redirectExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + REDIRECT_TTL_DAYS * MS_PER_DAY);
}

export type PathRedirectPair = {
  lang: string;
  oldPath: string;
  newPath: string;
};

export async function createRedirectsForPathUpdates(
  updates: PathRedirectPair[],
  tx: Prisma.TransactionClient,
) {
  const expiresAt = redirectExpiresAt();
  for (const update of updates) {
    if (update.oldPath === update.newPath) continue;
    await tx.pageRedirect.upsert({
      where: {
        lang_fromPath: { lang: update.lang, fromPath: update.oldPath },
      },
      update: {
        toPath: update.newPath,
        expiresAt,
      },
      create: {
        lang: update.lang,
        fromPath: update.oldPath,
        toPath: update.newPath,
        expiresAt,
      },
    });
  }
}

export function maybePurgeExpiredRedirects() {
  if (Math.random() >= 0.05) return;
  void purgeExpiredRedirects();
}

export async function purgeExpiredRedirects() {
  try {
    await prisma.pageRedirect.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch (error) {
    console.error("Failed to purge expired redirects:", error);
  }
}

export async function findActiveRedirect(lang: string, fromPath: string) {
  const row = await prisma.pageRedirect.findUnique({
    where: { lang_fromPath: { lang, fromPath } },
  });
  if (!row || row.expiresAt.getTime() <= Date.now()) return null;
  return row;
}
