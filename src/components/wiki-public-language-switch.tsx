import { LanguageSwitch } from "@/components/language-switch";

type LangOption = { code: string; label: string };

export function WikiPublicLanguageSwitch({
  lang,
  langs,
  groupAria,
  pathSuffix = "",
  queryString = "",
}: {
  lang: string;
  langs: LangOption[];
  groupAria: string;
  pathSuffix?: string;
  queryString?: string;
}) {
  return (
    <LanguageSwitch
      lang={lang}
      langs={langs}
      groupAria={groupAria}
      pathSuffix={pathSuffix}
      queryString={queryString}
    />
  );
}
