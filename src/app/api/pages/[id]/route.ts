import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateSearchLangCache, invalidateWikiLangCache } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth";
import { emitOutgoingWebhook } from "@/lib/webhook-dispatch";
import { activePageWhere } from "@/lib/page-query";
import { softDeletePageCascade } from "@/lib/page-trash";
import { createPageRevision, pageToRevisionSnapshot } from "@/lib/page-revision-snapshot";
import { collectSiblingSlugs, planPageBranchMove, planPageSlugRename } from "@/lib/page-move";
import { createRedirectsForPathUpdates } from "@/lib/page-redirect";
import { validateSlugInput } from "@/lib/slug";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";
import { isWikiIconKey } from "@/lib/wiki-icon-presets";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  contentMd: z.string().optional(),
  isPublished: z.boolean().optional(),
  showToc: z.boolean().optional(),
  isCategory: z.boolean().optional(),
  icon: z.string().min(1).max(32).nullable().optional(),
  navOrder: z.number().int().optional(),
  parentPathParts: z.array(z.string()).optional(),
});

function slugErrorResponse(code: "SLUG_INVALID" | "SLUG_COLLISION") {
  return NextResponse.json({ ok: false, error: code, message: code }, { status: 400 });
}

function protectedError(code: "SYSTEM_PAGE_PROTECTED" | "NOTE_NOT_PUBLISHABLE") {
  return NextResponse.json({ ok: false, error: code, message: code }, { status: 403 });
}

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
      payload.slug === undefined &&
      payload.contentMd === undefined &&
      payload.isPublished === undefined &&
      payload.showToc === undefined &&
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

    if (existing.scope === "NOTES" && payload.isPublished === true) {
      return protectedError("NOTE_NOT_PUBLISHABLE");
    }

    if (existing.systemKey) {
      const forbidden =
        payload.slug !== undefined ||
        payload.parentPathParts !== undefined ||
        payload.isPublished !== undefined ||
        payload.isCategory !== undefined ||
        payload.navOrder !== undefined;
      if (forbidden) {
        return protectedError("SYSTEM_PAGE_PROTECTED");
      }
    }

    const scopeWhere =
      existing.scope === "NOTES" ? { scope: "NOTES" as const, deletedAt: null } : { scope: "WIKI" as const, deletedAt: null };

    let slugRenamed = false;
    if (payload.slug !== undefined) {
      const newSlug = validateSlugInput(payload.slug);
      if (!newSlug) return slugErrorResponse("SLUG_INVALID");
      if (newSlug !== existing.slug) {
        const [descendants, langPages] = await Promise.all([
          prisma.page.findMany({
            where: {
              lang: existing.lang,
              path: { startsWith: `${existing.path}/` },
              ...scopeWhere,
            },
            select: { id: true, path: true },
            take: 1000,
          }),
          prisma.page.findMany({
            where: { lang: existing.lang, ...scopeWhere },
            select: { id: true, slug: true, path: true },
          }),
        ]);

        const parentParts = pathSegmentsAfterLang(existing.path, existing.lang).slice(0, -1);
        const siblingSlugs = collectSiblingSlugs(langPages, existing.id, parentParts, existing.lang);

        let plan;
        try {
          plan = planPageSlugRename(existing, payload.slug, descendants, siblingSlugs);
        } catch (error) {
          const code = error instanceof Error ? error.message : "";
          if (code === "SLUG_INVALID") return slugErrorResponse("SLUG_INVALID");
          if (code === "SLUG_COLLISION") return slugErrorResponse("SLUG_COLLISION");
          throw error;
        }

        if (plan.pathUpdates.length > 0) {
          const movingIds = plan.pathUpdates.map((u) => u.id);
          for (const row of plan.pathUpdates) {
            const occupant = await prisma.page.findFirst({
              where: {
                lang: existing.lang,
                path: row.path,
                ...scopeWhere,
                id: { notIn: movingIds },
              },
            });
            if (occupant) {
              return NextResponse.json(
                { ok: false, error: "SLUG_COLLISION", message: `Путь занят: «${occupant.title}».` },
                { status: 400 },
              );
            }
          }

          const childUpdates = plan.pathUpdates.filter((u) => u.id !== existing.id);
          childUpdates.sort((a, b) => b.path.length - a.path.length);

          await prisma.$transaction(async (tx) => {
            const rootUpdate = plan.pathUpdates.find((u) => u.id === existing.id)!;
            await tx.page.update({
              where: { id: existing.id },
              data: {
                path: rootUpdate.path,
                slug: rootUpdate.slug!,
                ...(payload.title !== undefined ? { title: payload.title } : {}),
              },
            });
            for (const u of childUpdates) {
              await tx.page.update({
                where: { id: u.id },
                data: { path: u.path },
              });
            }
            await createRedirectsForPathUpdates(plan.redirectPairs, tx);
          });
          slugRenamed = true;
        }
      }
    }

    let nextPath: string | undefined;
    if (payload.parentPathParts) {
      const current = await prisma.page.findFirst({ where: { id, ...activePageWhere } });
      if (!current) {
        return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
      }

      const descendants = await prisma.page.findMany({
        where: {
          lang: current.lang,
          path: { startsWith: `${current.path}/` },
          ...scopeWhere,
        },
        select: { id: true, path: true },
        take: 1000,
      });

      let plan;
      try {
        plan = planPageBranchMove(
          { id: current.id, path: current.path },
          payload.parentPathParts,
          current.lang,
          current.slug,
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
              lang: current.lang,
              path: row.path,
              ...scopeWhere,
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

        const childUpdates = plan.updates.filter((u) => u.id !== current.id);
        childUpdates.sort((a, b) => {
          const aOld = descendants.find((d) => d.id === a.id)?.path ?? "";
          const bOld = descendants.find((d) => d.id === b.id)?.path ?? "";
          return bOld.length - aOld.length;
        });

        await prisma.$transaction([
          prisma.page.update({ where: { id: current.id }, data: { path: plan.newPath } }),
          ...childUpdates.map((u) => prisma.page.update({ where: { id: u.id }, data: { path: u.path } })),
        ]);
      }

      nextPath = plan.newPath;
    }

    if (payload.isPublished !== undefined && existing.scope === "NOTES") {
      return protectedError("NOTE_NOT_PUBLISHABLE");
    }

    const titleInSlugTxn = slugRenamed && payload.title !== undefined;
    const prevSnapshot = pageToRevisionSnapshot(existing);
    const updated = await prisma.page.update({
      where: { id },
      data: {
        ...(payload.title !== undefined && !titleInSlugTxn ? { title: payload.title } : {}),
        ...(payload.contentMd !== undefined ? { contentMd: payload.contentMd } : {}),
        ...(payload.isPublished !== undefined ? { isPublished: payload.isPublished } : {}),
        ...(payload.showToc !== undefined ? { showToc: payload.showToc } : {}),
        ...(payload.isCategory !== undefined ? { isCategory: payload.isCategory } : {}),
        ...(payload.icon !== undefined ? { icon: payload.icon } : {}),
        ...(payload.navOrder !== undefined ? { navOrder: payload.navOrder } : {}),
        ...(nextPath !== undefined ? { path: nextPath } : {}),
      },
    });

    await createPageRevision(prisma, updated, user.id, prevSnapshot);
    await invalidateWikiLangCache(updated.lang);
    await invalidateSearchLangCache(updated.lang);
    if (updated.scope === "WIKI") {
      await emitOutgoingWebhook("page.updated", { pageId: updated.id, path: updated.path, published: updated.isPublished });
    }
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

    const existing = await prisma.page.findFirst({ where: { id, ...activePageWhere } });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }
    if (existing.systemKey) {
      return protectedError("SYSTEM_PAGE_PROTECTED");
    }

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
    const status =
      msg === "Unauthorized."
        ? 401
        : msg === "Page not found."
          ? 404
          : msg === "SYSTEM_PAGE_PROTECTED"
            ? 403
            : 400;
    return NextResponse.json(
      { ok: false, message: msg, error: msg === "SYSTEM_PAGE_PROTECTED" ? msg : undefined },
      { status },
    );
  }
}
