import { prisma } from "@/lib/db";
import { invalidateSearchLangCache, invalidateWikiLangCache } from "@/lib/cache";
import { wikiPageWhere } from "@/lib/page-query";
import { counterpartPath, findPageCounterpart } from "@/lib/page-counterparts";
import { softDeletePageCascade } from "@/lib/page-trash";
import { getEnabledLanguages } from "@/lib/site-config";
import { getSiblingGroupPaths } from "@/lib/wiki-path";
import {
  diffArchitecture,
  parseArchitectureMarkdown,
  serializeArchitectureTree,
  sortOpsForApply,
  type ArchOp,
  type ArchPageRef,
} from "@/lib/wiki-architecture-md";
import { emitOutgoingWebhook } from "@/lib/webhook-dispatch";
import { createPageRevision, pageToRevisionSnapshot } from "@/lib/page-revision-snapshot";

async function loadActivePages(lang: string): Promise<ArchPageRef[]> {
  return prisma.page.findMany({
    where: { lang, ...wikiPageWhere },
    select: {
      id: true,
      path: true,
      title: true,
      isCategory: true,
      lang: true,
      slug: true,
      navOrder: true,
    },
  });
}

async function applyCreate(
  op: Extract<ArchOp, { type: "create" }>,
  editorId: string,
  mirrorStructure: boolean,
  enabledLangs: string[],
) {
  const langsToCreate = mirrorStructure ? enabledLangs : [op.lang];

  for (const targetLang of langsToCreate) {
    const path = targetLang === op.lang ? op.path : counterpartPath(op.path, op.lang, targetLang);
    const existing = await prisma.page.findFirst({
      where: { lang: targetLang, path, ...wikiPageWhere },
    });
    if (existing) continue;

    await prisma.$transaction(async (tx) => {
      const existingSameLang = await tx.page.findMany({
        where: { lang: targetLang, ...wikiPageWhere },
        select: { path: true, navOrder: true },
      });
      const siblingPaths = new Set(getSiblingGroupPaths(existingSameLang, path, targetLang));
      const maxNav = existingSameLang
        .filter((p) => siblingPaths.has(p.path))
        .reduce((m, p) => Math.max(m, p.navOrder), 0);

      const sourcePage =
        targetLang === op.lang
          ? null
          : await tx.page.findFirst({
              where: { lang: op.lang, path: op.path, ...wikiPageWhere },
            });

      const row = await tx.page.create({
        data: {
          title: op.title,
          slug: op.slug,
          lang: targetLang,
          path,
          contentMd: "",
          isPublished: false,
          isCategory: op.isCategory,
          icon: op.isCategory ? "folder" : null,
          navOrder: maxNav + 10,
          originalId: sourcePage?.id ?? null,
        },
      });
      await createPageRevision(tx, row, editorId, null, { created: true });
      await emitOutgoingWebhook("page.created", {
        pageId: row.id,
        path: row.path,
        published: row.isPublished,
      });
    });

    await invalidateWikiLangCache(targetLang);
    await invalidateSearchLangCache(targetLang);
  }
}

export async function applyArchitectureOps(
  ops: ArchOp[],
  editorId: string,
  mirrorStructure: boolean,
) {
  const enabledLangs = await getEnabledLanguages();
  const sorted = sortOpsForApply(ops);
  let applied = 0;

  for (const op of sorted) {
    if (op.type === "create") {
      await applyCreate(op, editorId, mirrorStructure, enabledLangs);
      applied += 1;
    } else if (op.type === "update") {
      const existing = await prisma.page.findUnique({ where: { id: op.id } });
      if (!existing) continue;
      const prevSnapshot = pageToRevisionSnapshot(existing);
      const updated = await prisma.page.update({
        where: { id: op.id },
        data: { title: op.title, isCategory: op.isCategory },
      });
      await createPageRevision(prisma, updated, editorId, prevSnapshot);
      await invalidateWikiLangCache(updated.lang);
      await invalidateSearchLangCache(updated.lang);
      applied += 1;

      if (mirrorStructure) {
        for (const targetLang of enabledLangs) {
          if (targetLang === updated.lang) continue;
          const counterpart = await findPageCounterpart(updated, targetLang);
          if (!counterpart) continue;
          await prisma.page.update({
            where: { id: counterpart.id },
            data: { isCategory: op.isCategory },
          });
        }
      }
    } else if (op.type === "softDelete") {
      await softDeletePageCascade(op.id);
      applied += 1;
    }
  }

  return { applied };
}

export async function syncArchitectureMarkdown(input: {
  lang: string;
  markdown: string;
  editorId: string;
  mirrorStructure?: boolean;
}) {
  const parsed = parseArchitectureMarkdown(input.markdown);
  if (parsed.length === 0) {
    throw new Error("No architecture tree found in markdown.");
  }

  const current = await loadActivePages(input.lang);
  const ops = diffArchitecture(current, parsed, input.lang);
  const { applied } = await applyArchitectureOps(ops, input.editorId, input.mirrorStructure === true);
  const pages = await loadActivePages(input.lang);

  return { opsApplied: applied, ops, pages };
}

export async function serializeArchitectureForLang(lang: string) {
  const pages = await loadActivePages(lang);
  return serializeArchitectureTree(pages, lang);
}
