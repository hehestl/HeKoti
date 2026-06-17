import { getDictionary, safeLangAsync } from "@/lib/i18n";
import { getEnabledLanguages } from "@/lib/site-config";
import { languageSwitcherOptions } from "@/lib/language-labels";

export async function getWikiShellProps(inputLang: string) {
  const langs = await getEnabledLanguages();
  const lang = await safeLangAsync(inputLang);
  const dict = await getDictionary(lang);
  return {
    lang,
    langs: languageSwitcherOptions(langs),
    searchPlaceholder: dict.home.searchPlaceholder,
    languageAria: dict.common.languageAria,
  };
}
