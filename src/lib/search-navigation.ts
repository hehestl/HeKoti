const PLAIN = new Set(["login", "admin"]);
const PREFIX = new Set([">login", ">admin", "/login", "/admin", "/l", "/a"]);

export function resolveSearchNavigation(lang: string, raw: string): string | null {
  const q = raw.trim().toLowerCase();
  if (PLAIN.has(q) || PREFIX.has(q)) return `/${lang}/login`;
  return null;
}
