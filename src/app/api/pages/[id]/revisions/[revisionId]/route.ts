import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activePageWhere } from "@/lib/page-query";
import { revisionRowToSnapshot } from "@/lib/page-revision-snapshot";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; revisionId: string }> },
) {
  try {
    await requireAdminUser();
    const { id, revisionId } = await params;
    const page = await prisma.page.findFirst({ where: { id, ...activePageWhere } });
    if (!page) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }

    const revision = await prisma.pageRevision.findFirst({
      where: { id: revisionId, pageId: id },
      include: { editor: { select: { email: true } } },
    });
    if (!revision) {
      return NextResponse.json({ ok: false, message: "Revision not found." }, { status: 404 });
    }

    return NextResponse.json({
      id: revision.id,
      createdAt: revision.createdAt.toISOString(),
      summary: revision.summary,
      sizeBytes: revision.sizeBytes,
      editor: { email: revision.editor.email },
      snapshot: revisionRowToSnapshot(revision),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to load revision." },
      { status: 400 },
    );
  }
}
