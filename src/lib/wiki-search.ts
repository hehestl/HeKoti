import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export function parseSearchTerms(q: string): string[] {
  return q.trim().split(/\s+/).filter(Boolean).slice(0, 6);
}

export function buildSearchWhere(terms: string[]): Prisma.PageWhereInput {
  if (terms.length === 0) return {};
  return {
    AND: terms.map((t) => ({
      OR: [
        { title: { contains: t, mode: "insensitive" as const } },
        { contentMd: { contains: t, mode: "insensitive" as const } },
      ],
    })),
  };
}

export async function searchPublishedPages(
  lang: string,
  q: string,
  take = 80,
): Promise<
  {
    id: string;
    title: string;
    path: string;
    excerpt: string | null;
    updatedAt: Date;
  }[]
> {
  const terms = parseSearchTerms(q);
  if (terms.length === 0) return [];

  return prisma.page.findMany({
    where: {
      lang,
      isPublished: true,
      ...buildSearchWhere(terms),
    },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      path: true,
      excerpt: true,
      updatedAt: true,
    },
  });
}
