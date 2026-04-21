import { NextResponse } from "next/server";
import { z } from "zod";
import { delCached } from "@/lib/cache";
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
    await delCached(`wiki:${updated.lang}:${updated.path.split("/").slice(2).join("/")}`);
    await emitOutgoingWebhook("page.updated", { pageId: updated.id, path: updated.path, published: updated.isPublished });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Update failed" },
      { status: 400 },
    );
  }
}
