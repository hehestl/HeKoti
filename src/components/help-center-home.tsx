import Image from "next/image";
import Link from "next/link";
import { HelpCenterSearchForm } from "@/components/help-center-search-form";
import { ThemeCard } from "@/components/theme-card";
import type { PathTreeNode } from "@/lib/page-tree";
import type { WikiTreePage } from "@/lib/wiki-collection";

type HomeDict = {
  helpTitle: string;
  searchPlaceholder: string;
  articlesCount: string;
  noThemes: string;
  noThemesHint: string;
};

export function HelpCenterHome({
  lang,
  themes,
  dict,
  excerptByPath,
  defaultDescription,
}: {
  lang: string;
  themes: PathTreeNode<WikiTreePage>[];
  dict: HomeDict;
  excerptByPath: Map<string, string | null>;
  defaultDescription: string;
}) {
  return (
    <div className="help-center">
      <section className="help-center-hero">
        <div className="help-center-hero-top">
          <Link href={`/${lang}`} className="help-center-mascot" aria-label="Hekoti">
            <Image src="/hekoti.png" alt="" width={160} height={160} priority />
          </Link>
        </div>
        <h1 className="help-center-title">{dict.helpTitle}</h1>
        <HelpCenterSearchForm lang={lang} placeholder={dict.searchPlaceholder} />
      </section>

      <section className="help-center-themes">
        {themes.length > 0 ? (
          <div className="theme-cards-grid">
            {themes.map((node) => (
              <ThemeCard
                key={node.pathKey}
                node={node}
                lang={lang}
                articlesCountLabel={dict.articlesCount}
                defaultDescription={defaultDescription}
                excerptByPath={excerptByPath}
              />
            ))}
          </div>
        ) : (
          <div className="help-center-empty">
            <p className="help-center-empty-title">{dict.noThemes}</p>
            <p className="help-center-empty-hint">{dict.noThemesHint}</p>
          </div>
        )}
      </section>
    </div>
  );
}
