import { Suspense } from "react";
import { LanguageSwitch, LanguageSwitchFallback } from "@/components/language-switch";

type LangOption = { code: string; label: string };

/** Suspense must wrap useSearchParams in a Server Component (not inside client header). */
export function WikiPublicLanguageSwitch({
  lang,
  langs,
  groupAria,
}: {
  lang: string;
  langs: LangOption[];
  groupAria: string;
}) {
  return (
    <Suspense fallback={<LanguageSwitchFallback lang={lang} langs={langs} />}>
      <LanguageSwitch lang={lang} langs={langs} groupAria={groupAria} />
    </Suspense>
  );
}
