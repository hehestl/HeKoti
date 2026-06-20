import fs from "fs";
import path from "path";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { getEnabledLanguages, knownLanguages } from "@/lib/site-config";
import type enMessages from "./messages/en.json";

/** Locales allowed in env (full pool for admin toggles). */
export { knownLanguages };

/** Fallback when fs scan of message files fails (serverless-safe). */
export const MESSAGE_LOCALES_FALLBACK = ["en", "ru"] as const;

export type Dictionary = typeof enMessages;

/** Sync fallback from env; prefer `getEnabledLanguages()` on the server. */
export const enabledLanguages = env.ENABLED_LANGUAGES.split(",")
  .map((item) => item.trim())
  .filter(Boolean);

export type Locale = string;

const dictionaryCache = new Map<string, Dictionary>();

export function safeLang(input?: string, allowed: string[] = enabledLanguages) {
  if (!input) return allowed[0] ?? "en";
  return allowed.includes(input) ? input : allowed[0] ?? "en";
}

export async function safeLangAsync(input?: string) {
  const allowed = await getEnabledLanguages();
  return safeLang(input, allowed);
}

export function getAvailableMessageLocales(): string[] {
  try {
    const messagesDir = path.join(process.cwd(), "src/lib/messages");
    return fs
      .readdirSync(messagesDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(".json", ""));
  } catch {
    return [...MESSAGE_LOCALES_FALLBACK];
  }
}

function resolveDictionaryLocale(lang: string): string {
  const available = getAvailableMessageLocales();
  return available.includes(lang) ? lang : "en";
}

export async function getDictionary(lang: string) {
  const target = resolveDictionaryLocale(lang);
  const cached = dictionaryCache.get(target);
  if (cached) return cached;
  try {
    const dict = (await import(`./messages/${target}.json`)).default as Dictionary;
    dictionaryCache.set(target, dict);
    return dict;
  } catch {
    const en = (await import("./messages/en.json")).default as Dictionary;
    dictionaryCache.set("en", en);
    return en;
  }
}

export async function getAdminLanguage() {
  const settings = await getGlobalSettings();
  return settings.adminLanguage;
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
    adminLanguage: langs[0] ?? "en",
    headHtml: "",
    bodyHtml: "",
    enabledLanguages: langs,
    wikiTreeGuideColor: null as string | null,
  };
  try {
    const settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    if (!settings) return fallback;
    const adminLanguage =
      settings.adminLanguage && knownLanguages.includes(settings.adminLanguage)
        ? settings.adminLanguage
        : fallback.adminLanguage;
    return {
      defaultLanguage:
        settings.defaultLanguage && langs.includes(settings.defaultLanguage)
          ? settings.defaultLanguage
          : fallback.defaultLanguage,
      adminLanguage,
      headHtml: settings.headHtml ?? "",
      bodyHtml: settings.bodyHtml ?? "",
      enabledLanguages: langs,
      wikiTreeGuideColor: settings.wikiTreeGuideColor ?? null,
    };
  } catch {
    return fallback;
  }
}
