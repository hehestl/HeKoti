import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

export const enabledLanguages = env.ENABLED_LANGUAGES.split(",")
  .map((item) => item.trim())
  .filter(Boolean);

export type Locale = string;

export function safeLang(input?: string) {
  if (!input) return enabledLanguages[0] ?? "en";
  return enabledLanguages.includes(input) ? input : enabledLanguages[0] ?? "en";
}

export async function getDefaultLanguage() {
  try {
    const settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    if (settings?.defaultLanguage && enabledLanguages.includes(settings.defaultLanguage)) {
      return settings.defaultLanguage;
    }
  } catch (e) {
    // Database might not be ready or table might not exist yet
  }
  return enabledLanguages[0] ?? "en";
}

export async function getDictionary(lang: string) {
  const l = safeLang(lang);
  try {
    if (l === "ru") return (await import("./messages/ru.json")).default;
    return (await import("./messages/en.json")).default;
  } catch (e) {
    return (await import("./messages/en.json")).default;
  }
}

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
