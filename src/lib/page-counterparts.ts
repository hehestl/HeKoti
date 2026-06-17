import { prisma } from "@/lib/db";
import { normalizePath } from "@/lib/slug";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";

export type PageCounterpart = {
  id: string;
  path: string;
  title: string;
  lang: string;
};

export function canonicalPageId(page: { id: string; originalId: string | null }): string {
  return page.originalId ?? page.id;
}

export function pathTailForLang(path: string, lang: string): string[] {
  return pathSegmentsAfterLang(path, lang);
}

export function counterpartPath(sourcePath: string, sourceLang: string, targetLang: string): string {
  const tail = pathTailForLang(sourcePath, sourceLang);
  return normalizePath(targetLang, tail);
}

export async function findPageCounterpart(
  source: { id: string; originalId: string | null; path: string; lang: string },
  targetLang: string,
): Promise<PageCounterpart | null> {
  const canonical = canonicalPageId(source);

  const byLink = await prisma.page.findFirst({
    where: {
      lang: targetLang,
      OR: [{ originalId: canonical }, { id: canonical }, { originalId: source.id }],
    },
    select: { id: true, path: true, title: true, lang: true },
  });
  if (byLink) return byLink;

  const targetPath = counterpartPath(source.path, source.lang, targetLang);
  const byPath = await prisma.page.findUnique({
    where: { path: targetPath },
    select: { id: true, path: true, title: true, lang: true },
  });
  return byPath;
}

export async function listPageCounterparts(
  source: { id: string; originalId: string | null; path: string; lang: string; title: string },
  langs: string[],
): Promise<Record<string, PageCounterpart | null>> {
  const out: Record<string, PageCounterpart | null> = {};
  await Promise.all(
    langs.map(async (targetLang) => {
      if (targetLang === source.lang) {
        out[targetLang] = {
          id: source.id,
          path: source.path,
          title: source.title,
          lang: source.lang,
        };
        return;
      }
      out[targetLang] = await findPageCounterpart(source, targetLang);
    }),
  );
  return out;
}