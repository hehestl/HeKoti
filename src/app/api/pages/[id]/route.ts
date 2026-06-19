import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateSearchLangCache, invalidateWikiLangCache } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth";
import { emitOutgoingWebhook } from "@/lib/webhook-dispatch";
import { activePageWhere } from "@/lib/page-query";
import { softDeletePageCascade } from "@/lib/page-trash";
import { planPageBranchMove } from "@/lib/page-move";
import { isWikiIconKey } from "@/lib/wiki-icon-presets";
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  contentMd: z.string().optional(),
  isPublished: z.boolean().optional(),
  isCategory: z.boolean().optional(),
  icon: z.string().min(1).max(32).nullable().optional(),
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
    if (payload.icon != null && payload.icon !== "" && !isWikiIconKey(payload.icon)) {
      return NextResponse.json({ ok: false, message: "Invalid icon key." }, { status: 400 });
    }
    if (
      payload.title === undefined &&
      payload.contentMd === undefined &&
      payload.isPublished === undefined &&
      payload.isCategory === undefined &&
      payload.icon === undefined &&
      payload.navOrder === undefined &&
      payload.parentPathParts === undefined
    ) {
      return NextResponse.json({ ok: false, message: "Nothing to update." }, { status: 400 });
    }

    const existing = await prisma.page.findFirst({ where: { id, ...activePageWhere } });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }

    let nextPath: string | undefined;
    if (payload.parentPathParts) {
      const descendants = await prisma.page.findMany({
        where: {
          lang: existing.lang,
          path: { startsWith: `${existing.path}/` },
          ...activePageWhere,
        },
        select: { id: true, path: true },
      });

      let plan;
      try {
        plan = planPageBranchMove(
          { id: existing.id, path: existing.path },
          payload.parentPathParts,
          existing.lang,
          existing.slug,
          descendants,
        );
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "MOVE_INTO_DESCENDANT") {
          return NextResponse.json(
            { ok: false, message: "Нельзя переместить страницу во вложенную." },
            { status: 400 },
          );
        }
        if (code === "MOVE_PATH_COLLISION") {
          return NextResponse.json({ ok: false, message: "Конфликт путей при перемещении." }, { status: 400 });
        }
        throw error;
      }

      if (plan.newPath !== plan.oldPath) {
        const movingIds = plan.updates.map((u) => u.id);
        for (const row of plan.updates) {
          const occupant = await prisma.page.findFirst({
            where: {
              lang: existing.lang,
              path: row.path,
              ...activePageWhere,
              id: { notIn: movingIds },
            },
          });
          if (occupant) {
            return NextResponse.json(
              { ok: false, message: `Путь занят: «${occupant.title}».` },
              { status: 400 },
            );
          }
        }

        const childUpdates = plan.updates.filter((u) => u.id !== existing.id);
        childUpdates.sort((a, b) => {
          const aOld = descendants.find((d) => d.id === a.id)?.path ?? "";
          const bOld = descendants.find((d) => d.id === b.id)?.path ?? "";
          return bOld.length - aOld.length;
        });

        await prisma.$transaction([
          prisma.page.update({ where: { id: existing.id }, data: { path: plan.newPath } }),
          ...childUpdates.map((u) => prisma.page.update({ where: { id: u.id }, data: { path: u.path } })),
        ]);
      }

      nextPath = plan.newPath;
    }

    const updated = await prisma.page.update({
      where: { id },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.contentMd !== undefined ? { contentMd: payload.contentMd } : {}),
        ...(payload.isPublished !== undefined ? { isPublished: payload.isPublished } : {}),
        ...(payload.isCategory !== undefined ? { isCategory: payload.isCategory } : {}),
        ...(payload.icon !== undefined ? { icon: payload.icon } : {}),
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
    await invalidateSearchLangCache(updated.lang);
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

    const result = await softDeletePageCascade(id);
    await emitOutgoingWebhook("page.deleted", {
      pageId: id,
      path: result.page.path,
      soft: true,
      deletedIds: result.deletedIds,
      deletedAt: result.deletedAt.toISOString(),
    });
    return NextResponse.json({
      ok: true,
      path: result.page.path,
      deletedIds: result.deletedIds,
      deletedAt: result.deletedAt.toISOString(),
      purgeAt: result.purgeAt.toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Delete failed";
    const status = msg === "Unauthorized." ? 401 : msg === "Page not found." ? 404 : 400;
    return NextResponse.json({ ok: false, message: msg }, { status });
  }
}
