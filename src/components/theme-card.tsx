import { resolveWikiIconComponent } from "@/lib/wiki-icon-presets";
import type { PathTreeNode } from "@/lib/page-tree";
import {
  collectionDescription,
  collectionTitle,
  countDescendantPages,
  getNodeUrl,
  isCollectionNode,
  type WikiTreePage,
} from "@/lib/wiki-collection";

function renderThemeIcon(node: PathTreeNode<WikiTreePage>) {
  const Icon = resolveWikiIconComponent(
    node.page?.icon,
    isCollectionNode(node) || node.page?.isCategory === true,
  );
  return <Icon size={22} strokeWidth={1.75} />;
}

export function ThemeCard({
  node,
  lang,
  articlesCountLabel,
  defaultDescription,
  excerptByPath,
}: {
  node: PathTreeNode<WikiTreePage>;
  lang: string;
  articlesCountLabel: string;
  defaultDescription: string;
  excerptByPath: Map<string, string | null>;
}) {
  const title = collectionTitle(node);
  const description = collectionDescription(node, defaultDescription, excerptByPath);
  const count = countDescendantPages(node);
  const href = getNodeUrl(node, lang);

  return (
    <a href={href} className="theme-card">
      <span className="theme-card-icon" aria-hidden>
        {renderThemeIcon(node)}
      </span>
      <span className="theme-card-body">
        <span className="theme-card-title">{title}</span>
        <span className="theme-card-desc">{description}</span>
        <span className="theme-card-meta">
          {articlesCountLabel.replace("{n}", String(isCollectionNode(node) ? count : count || 1))}
        </span>
      </span>
    </a>
  );
}
