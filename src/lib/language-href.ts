/** Build locale URL preserving path suffix and query (server-provided, no useSearchParams). */
export function buildLanguageHref(langCode: string, pathSuffix: string, queryString = ""): string {
  const normalizedSuffix = pathSuffix.startsWith("/") ? pathSuffix : pathSuffix ? `/${pathSuffix}` : "";
  const q = queryString.trim();
  const query = q ? (q.startsWith("?") ? q : `?${q}`) : "";
  return `/${langCode}${normalizedSuffix}${query}`;
}
