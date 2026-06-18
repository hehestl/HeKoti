/** Segments of path after language: /en/h1/h2 → ['h1','h2'] */
export function pathSegmentsAfterLang(path: string, lang: string): string[] {
  const prefix = `/${lang}/`;
  if (!path.startsWith(prefix)) return [];
  return path.slice(prefix.length).split("/").filter(Boolean);
}

/** Paths in DB for pages that are direct children of the same parent as `targetPath`. */
export function getSiblingGroupPaths(allPaths: { path: string }[], targetPath: string, lang: string): string[] {
  const targetSegs = pathSegmentsAfterLang(targetPath, lang);
  if (targetSegs.length === 0) return [];

  const parentSegCount = targetSegs.length - 1;
  const langPrefix = `/${lang}/`;
  const prefix = parentSegCount === 0 ? langPrefix : `/${lang}/${targetSegs.slice(0, parentSegCount).join("/")}/`;

  return allPaths
    .map((p) => p.path)
    .filter((p) => {
      if (!p.startsWith(prefix)) return false;
      if (parentSegCount === 0) {
        const rest = p.slice(langPrefix.length);
        return rest.length > 0 && !rest.includes("/");
      }
      const rest = p.slice(prefix.length);
      return rest.length > 0 && !rest.includes("/");
    });
}

export function wikiCacheKey(path: string, lang: string): string {
  const segs = pathSegmentsAfterLang(path, lang);
  return `wiki:${lang}:${segs.join("/")}`;
}

/** Public wiki URL from DB path /{lang}/segment/... */
export function wikiPublicHref(lang: string, dbPath: string): string {
  const prefix = `/${lang}/`;
  if (!dbPath.startsWith(prefix)) return `/${lang}`;
  return `/${lang}/wiki/${dbPath.slice(prefix.length)}`;
}
