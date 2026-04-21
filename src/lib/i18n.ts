import { env } from "@/lib/env";

export const enabledLanguages = env.ENABLED_LANGUAGES.split(",")
  .map((item) => item.trim())
  .filter(Boolean);

export function safeLang(input?: string) {
  if (!input) return enabledLanguages[0] ?? "en";
  return enabledLanguages.includes(input) ? input : enabledLanguages[0] ?? "en";
}
