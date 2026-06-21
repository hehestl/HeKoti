import { prisma } from "@/lib/db";
import { buildPageSearchText } from "@/lib/page-search-index";

const BATCH_SIZE = 100;

async function main() {
  const started = Date.now();
  let processed = 0;
  let cursor: string | undefined;

  for (;;) {
    const batch = await prisma.page.findMany({
      where: {
        scope: "WIKI",
        deletedAt: null,
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: { id: true, title: true, contentMd: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) break;

    await prisma.$transaction(
      batch.map((page) =>
        prisma.page.update({
          where: { id: page.id },
          data: { searchText: buildPageSearchText(page.title, page.contentMd) },
        }),
      ),
    );

    processed += batch.length;
    cursor = batch[batch.length - 1]?.id;
    console.log(`[search:reindex] processed ${processed}`);
  }

  await prisma.$executeRawUnsafe('ANALYZE "Page"');
  console.log(`[search:reindex] done ${processed} pages in ${Date.now() - started}ms`);
}

main()
  .catch((error) => {
    console.error("[search:reindex] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
