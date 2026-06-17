import { enabledLanguages, getDictionary, safeLang } from "@/lib/i18n";
import { languageSwitcherOptions } from "@/lib/language-labels";

export async function getWikiShellProps(inputLang: string) {
  const lang = safeLang(inputLang);
  const dict = await getDictionary(lang);
  return {
    lang,
    langs: languageSwitcherOptions(enabledLanguages),
    searchPlaceholder: dict.home.searchPlaceholder,
    languageAria: dict.common.languageAria,
  };
}
