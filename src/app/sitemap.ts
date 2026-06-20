import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

import { wikiPageWhere } from "@/lib/page-query";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await prisma.page
    .findMany({
      where: { isPublished: true, ...wikiPageWhere },
      select: { path: true, updatedAt: true },
      take: 5000,
    })
    .catch(() => []);
  return pages.map((item) => ({
    url: `${env.APP_URL}${item.path.replace(/^\/([a-z-]+)\//, "/$1/wiki/")}`,
    lastModified: item.updatedAt,
  }));
}
