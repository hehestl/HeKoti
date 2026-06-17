import Link from "next/link";
import { BookOpen, Folder, Shield, Wallet, Users, RefreshCw, HelpCircle } from "lucide-react";
import type { PathTreeNode } from "@/lib/page-tree";
import {
  collectionDescription,
  collectionTitle,
  countDescendantPages,
  getNodeUrl,
  isCollectionNode,
  type WikiTreePage,
} from "@/lib/wiki-collection";

const THEME_ICONS = [Folder, BookOpen, Wallet, Users, Shield, RefreshCw, HelpCircle] as const;

function renderThemeIcon(segment: string) {
  const Icon = THEME_ICONS[themeIconIndex(segment)] ?? Folder;
  return <Icon size={22} strokeWidth={1.75} />;
}

function themeIconIndex(segment: string): number {
  let hash = 0;
  for (let i = 0; i < segment.length; i++) {
    hash = (hash + segment.charCodeAt(i) * (i + 1)) % THEME_ICONS.length;
  }
  return hash;
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
    <Link href={href} prefetch={false} className="theme-card">
      <span className="theme-card-icon" aria-hidden>
        {renderThemeIcon(node.segment)}
      </span>
      <span className="theme-card-body">
        <span className="theme-card-title">{title}</span>
        <span className="theme-card-desc">{description}</span>
        <span className="theme-card-meta">
          {articlesCountLabel.replace("{n}", String(isCollectionNode(node) ? count : count || 1))}
        </span>
      </span>
    </Link>
  );
}
