import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activePageWhere } from "@/lib/page-query";
import { encodeRevisionCursor, parseRevisionCursor } from "@/lib/page-revision-diff";

const DEFAULT_LIMIT = 30;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const page = await prisma.page.findFirst({ where: { id, ...activePageWhere } });
    if (!page) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));
    const cursor = parseRevisionCursor(searchParams.get("cursor"));

    const rows = await prisma.pageRevision.findMany({
      where: {
        pageId: id,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        createdAt: true,
        summary: true,
        sizeBytes: true,
        editor: { select: { email: true } },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];

    return NextResponse.json({
      items: items.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        summary: r.summary,
        sizeBytes: r.sizeBytes,
        editor: { email: r.editor.email },
      })),
      nextCursor: hasMore && last ? encodeRevisionCursor(last.createdAt, last.id) : null,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to load revisions." },
      { status: 400 },
    );
  }
}
