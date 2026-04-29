import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateWikiLangCache } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth";
import { emitOutgoingWebhook } from "@/lib/webhook-dispatch";
import { normalizePath } from "@/lib/slug";
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  contentMd: z.string().optional(),
  isPublished: z.boolean().optional(),
  navOrder: z.number().int().optional(),
  parentPathParts: z.array(z.string()).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireAdminUser();
    const payload = updateSchema.parse(await request.json());
    if (
      payload.title === undefined &&
      payload.contentMd === undefined &&
      payload.isPublished === undefined &&
      payload.navOrder === undefined &&
      payload.parentPathParts === undefined
    ) {
      return NextResponse.json({ ok: false, message: "Nothing to update." }, { status: 400 });
    }

    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }

    let nextPath: string | undefined;
    if (payload.parentPathParts) {
      const childCount = await prisma.page.count({
        where: { lang: existing.lang, path: { startsWith: `${existing.path}/` } },
      });
      if (childCount > 0) {
        return NextResponse.json({ ok: false, message: "Сначала переместите вложенные страницы." }, { status: 400 });
      }
      nextPath = normalizePath(existing.lang, [...payload.parentPathParts, existing.slug]);
    }

    const updated = await prisma.page.update({
      where: { id },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.contentMd !== undefined ? { contentMd: payload.contentMd } : {}),
        ...(payload.isPublished !== undefined ? { isPublished: payload.isPublished } : {}),
        ...(payload.navOrder !== undefined ? { navOrder: payload.navOrder } : {}),
        ...(nextPath !== undefined ? { path: nextPath } : {}),
      },
    });

    if (payload.title !== undefined || payload.contentMd !== undefined) {
      await prisma.pageRevision.create({
        data: {
          pageId: id,
          editorId: user.id,
          title: updated.title,
          contentMd: updated.contentMd,
        },
      });
    }
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
