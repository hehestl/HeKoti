import slugify from "slugify";

export const SLUG_MAX_LENGTH = 80;

export function toSlug(value: string) {
  const slug = slugify(value, { lower: true, strict: true, locale: "en" });
  return slug || "untitled";
}

export function validateSlugInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > SLUG_MAX_LENGTH) return null;
  const slug = toSlug(trimmed);
  return slug && slug !== "untitled" ? slug : null;
}

export function normalizePath(lang: string, parts: string[]) {
  return `/${lang}/${parts.filter(Boolean).join("/")}`;
}
