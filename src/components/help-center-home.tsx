import { ThemeCard } from "@/components/theme-card";
import type { PathTreeNode } from "@/lib/page-tree";
import type { WikiTreePage } from "@/lib/wiki-collection";

type HomeDict = {
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
