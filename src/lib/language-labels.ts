/** Short labels for language switcher buttons in the top bar. */
const LANG_LABELS: Record<string, string> = {
  en: "EN",
  ru: "RU",
  de: "DE",
  fr: "FR",
  es: "ES",
  "pt-BR": "PT-BR",
  "pt-PT": "PT-PT",
  it: "IT",
  ja: "JA",
  ko: "KO",
  "zh-CN": "ZH",
};

export function languageSwitcherOptions(codes: string[]) {
  return codes.map((code) => ({
    code,
    label: LANG_LABELS[code] ?? code.toUpperCase(),
  }));
}
