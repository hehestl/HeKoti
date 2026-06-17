import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { getEnabledLanguages, knownLanguages } from "@/lib/site-config";

/** Locales allowed in env (full pool for admin toggles). */
export { knownLanguages };

/** Sync fallback from env; prefer `getEnabledLanguages()` on the server. */
export const enabledLanguages = env.ENABLED_LANGUAGES.split(",")
  .map((item) => item.trim())
  .filter(Boolean);

export type Locale = string;

export function safeLang(input?: string, allowed: string[] = enabledLanguages) {
  if (!input) return allowed[0] ?? "en";
  return allowed.includes(input) ? input : allowed[0] ?? "en";
}

export async function safeLangAsync(input?: string) {
  const allowed = await getEnabledLanguages();
  return safeLang(input, allowed);
}

export async function getDefaultLanguage() {
  const langs = await getEnabledLanguages();
  try {
    const settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    if (settings?.defaultLanguage && langs.includes(settings.defaultLanguage)) {
      return settings.defaultLanguage;
    }
  } catch {
    // Database might not be ready or table might not exist yet
  }
  return langs[0] ?? "en";
}

export async function getGlobalSettings() {
  const langs = await getEnabledLanguages();
  const fallback = {
    defaultLanguage: langs[0] ?? "en",
    headHtml: "",
    bodyHtml: "",
    enabledLanguages: langs,
  };
  try {
    const settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    if (!settings) return fallback;
    return {
      defaultLanguage:
        settings.defaultLanguage && langs.includes(settings.defaultLanguage)
          ? settings.defaultLanguage
          : fallback.defaultLanguage,
      headHtml: (settings as { headHtml?: string }).headHtml ?? "",
      bodyHtml: (settings as { bodyHtml?: string }).bodyHtml ?? "",
      enabledLanguages: langs,
    };
  } catch {
    return fallback;
  }
}

export async function getDictionary(lang: string) {
  const l = safeLang(lang);
  try {
    if (l === "ru") return (await import("./messages/ru.json")).default;
    return (await import("./messages/en.json")).default;
  } catch {
    return (await import("./messages/en.json")).default;
  }
}

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
