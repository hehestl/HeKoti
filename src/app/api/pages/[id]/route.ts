import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateWikiLangCache } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth";
import { emitOutgoingWebhook } from "@/lib/webhook-dispatch";
const updateSchema = z.object({
  title: z.string().min(1),
  contentMd: z.string(),
  isPublished: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireAdminUser();
    const payload = updateSchema.parse(await request.json());
    const updated = await prisma.page.update({
      where: { id },
      data: {
        title: payload.title,
        contentMd: payload.contentMd,
        isPublished: payload.isPublished,
      },
    });
    await prisma.pageRevision.create({
      data: {
        pageId: id,
        editorId: user.id,
        title: payload.title,
        contentMd: payload.contentMd,
      },
    });
    await invalidateWikiLangCache(updated.lang);
    await emitOutgoingWebhook("page.updated", { pageId: updated.id, path: updated.path, published: updated.isPublished });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Update failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;

    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }

    const childCount = await prisma.page.count({
      where: { path: { startsWith: `${page.path}/` } },
    });
    if (childCount > 0) {
      return NextResponse.json(
        { ok: false, message: "Сначала удалите вложенные страницы." },
        { status: 400 },
      );
    }

    await prisma.page.delete({ where: { id } });
    await invalidateWikiLangCache(page.lang);
    await emitOutgoingWebhook("page.deleted", { pageId: id, path: page.path });
    return NextResponse.json({ ok: true, path: page.path });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Delete failed";
    const status = msg === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message: msg }, { status });
  }
}
