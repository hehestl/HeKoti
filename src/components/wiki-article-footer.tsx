import { WikiArticleRating } from "@/components/wiki-article-rating";
import { WikiRelatedArticles } from "@/components/wiki-related-articles";
import type { PathTreeNode } from "@/lib/page-tree";
import type { WikiTreePage } from "@/lib/wiki-collection";
import { getRecommendedArticles } from "@/lib/wiki-recommendations";

type ArticleFooterDict = {
  relatedTitle: string;
  relatedNeighborTitle: string;
  ratingTitle: string;
  ratingThanks: string;
  ratingBroken: string;
  ratingNeutral: string;
  ratingLoved: string;
};

export function WikiArticleFooter({
  page,
  lang,
  tree,
  user,
  dict,
}: {
  page: { id: string; path: string };
  lang: string;
  tree: PathTreeNode<WikiTreePage>[];
  user: { id: string } | null;
  dict: ArticleFooterDict;
}) {
  const { siblings, neighbors } = getRecommendedArticles(tree, page.path, lang);

  return (
    <footer className="wiki-article-footer">
      <WikiRelatedArticles siblings={siblings} neighbors={neighbors} lang={lang} dict={dict} />
      {user ? <WikiArticleRating pageId={page.id} dict={dict} /> : null}
    </footer>
  );
}
