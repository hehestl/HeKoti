import { headers } from "next/headers";
import type { Metadata } from "next";
import { WikiErrorView } from "@/components/wiki-error-view";
import { WikiPublicShell } from "@/components/wiki-public-shell";
import { safeLang, getDictionary } from "@/lib/i18n";
import { getSamplePageTitles } from "@/lib/wiki-collection";
import { getWikiShellProps } from "@/lib/wiki-shell-props";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function langFromPathname(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment ?? "en";
}

export default async function LangNotFound() {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const lang = safeLang(langFromPathname(pathname));
  const dict = await getDictionary(lang);
  const shell = await getWikiShellProps(lang);
  const sampleTitles = await getSamplePageTitles(lang);

  return (
    <WikiPublicShell {...shell} variant="compact" searchSampleTitles={sampleTitles}>
      <WikiErrorView
        lang={lang}
        title={dict.errors.notFoundTitle}
        description={dict.errors.notFoundDesc}
        backHomeLabel={dict.errors.backHome}
        backHomeHref={`/${lang}`}
      />
    </WikiPublicShell>
  );
}
