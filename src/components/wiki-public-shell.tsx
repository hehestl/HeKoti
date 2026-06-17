import { WikiPublicHeader, type WikiPublicHeaderVariant } from "@/components/wiki-public-header";

type LangOption = { code: string; label: string };

export function WikiPublicShell({
  lang,
  langs,
  searchPlaceholder,
  languageAria,
  variant,
  initialSearchQuery,
  children,
}: {
  lang: string;
  langs: LangOption[];
  searchPlaceholder: string;
  languageAria: string;
  variant: WikiPublicHeaderVariant;
  initialSearchQuery?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <WikiPublicHeader
        lang={lang}
        langs={langs}
        searchPlaceholder={searchPlaceholder}
        languageAria={languageAria}
        variant={variant}
        initialSearchQuery={initialSearchQuery}
      />
      <div className="wiki-public-content">{children}</div>
    </>
  );
}
