import slugify from "slugify";

export function toSlug(value: string) {
  const slug = slugify(value, { lower: true, strict: true, locale: "en" });
  return slug || "untitled";
}

export function normalizePath(lang: string, parts: string[]) {
  return `/${lang}/${parts.filter(Boolean).join("/")}`;
}
