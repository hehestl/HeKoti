"use client";

import type { PathTreeNode } from "@/lib/page-tree";
import { pathKeysBranchingToTarget } from "@/lib/page-tree";
import { wikiPublicHref } from "@/lib/wiki-path";
import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { WikiPageCell } from "@/components/wiki-page-row";
import { TreeChevronButton, TreeChevronSpacer, TreeDepthSpacer } from "@/components/page-tree-shared";
import { ExternalLink, Folder } from "lucide-react";
import { TreePageIcon } from "@/components/page-tree-shared";

export type WikiTreePageBrief = {
  id: string;
  title: string;
  path: string;
  navOrder?: number;
  icon?: string | null;
  isCategory?: boolean;
};

type Node = PathTreeNode<WikiTreePageBrief>;

/** DB paths are /{lang}/…; public URLs live under /{lang}/wiki/…. */
function wikiHref(lang: string, path: string) {
  const prefix = `/${lang}/`;
  if (!path.startsWith(prefix)) return `/${lang}`;
  const tail = path.slice(prefix.length);
  return `/${lang}/wiki/${tail}`;
}

function WikiTreeBranches({
  nodes,
  lang,
  depth,
  activeWikiPath,
  open,
  toggle,
  isAdmin,
  dict,
}: {
  nodes: Node[];
  lang: string;
  depth: number;
  activeWikiPath?: string;
  open: Set<string>;
  toggle: (pathKey: string) => void;
  isAdmin: boolean;
  dict: Dictionary;
}) {
  return (
    <ul className="repo-page-tree" role="list">
      {nodes.map((node) => (
        <WikiTreeNode
          key={node.pathKey}
          node={node}
          lang={lang}
          depth={depth}
          activeWikiPath={activeWikiPath}
          open={open}
          toggle={toggle}
          isAdmin={isAdmin}
          dict={dict}
        />
      ))}
    </ul>
  );
}

function WikiTreeNode({
  node,
  lang,
  depth,
  activeWikiPath,
  open,
  toggle,
  isAdmin,
  dict,
}: {
  node: Node;
  lang: string;
  depth: number;
  activeWikiPath?: string;
  open: Set<string>;
  toggle: (pathKey: string) => void;
  isAdmin: boolean;
  dict: Dictionary;
}) {
  const hasChildren = node.children.length > 0;
  const expanded = !hasChildren || open.has(node.pathKey);
  const page = node.page;
  const href = page ? wikiHref(lang, page.path) : undefined;
  const isActive = page ? activeWikiPath === page.path : false;

  return (
    <li className="repo-tree-li">
      <div className="repo-tree-row">
        <TreeDepthSpacer depth={depth} />
        {hasChildren ? (
          <TreeChevronButton
            expanded={expanded}
            onToggle={() => toggle(node.pathKey)}
            ariaLabel={expanded ? dict.admin.wiki.treeCollapseBranch : dict.admin.wiki.treeExpandBranch}
          />
        ) : (
          <TreeChevronSpacer />
        )}
        {page ? (
          <div className="repo-tree-cell-grow repo-tree-cell-with-meta">
            <WikiPageCell
              id={page.id}
              href={href!}
              title={page.title}
              lang={lang}
              isAdmin={isAdmin}
              isActive={isActive}
              dict={dict}
            />
            {hasChildren ? (
              <span className="repo-tree-node-meta" title={dict.admin.posts.hasChildrenWithPage}>
                <Folder size={14} aria-hidden strokeWidth={2} />
                <a
                  href={wikiPublicHref(lang, page.path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="repo-tree-catalog-link"
                  title={dict.admin.posts.openPublicCatalog}
                  aria-label={dict.admin.posts.openPublicCatalog}
                >
                  <ExternalLink size={14} strokeWidth={2} aria-hidden />
                </a>
              </span>
            ) : (
              <TreePageIcon
                icon={page.icon ?? null}
                isCategory={page.isCategory === true}
                size={14}
              />
            )}
          </div>
        ) : (
          <div
            className="repo-tree-folder-label"
            title={dict.admin.posts.hasChildrenNoArticle}
          >
            <Folder size={14} aria-hidden strokeWidth={2} />
            <span className="repo-tree-folder-segment">{node.segment}</span>
            <span className="repo-tree-folder-hint">{dict.admin.posts.noArticle}</span>
          </div>
        )}
      </div>
      {hasChildren && expanded ? (
        <WikiTreeBranches
          nodes={node.children}
          lang={lang}
          depth={depth + 1}
          activeWikiPath={activeWikiPath}
          open={open}
          toggle={toggle}
          isAdmin={isAdmin}
          dict={dict}
        />
      ) : null}
    </li>
  );
}

function WikiPageTreeInner({
  nodes,
  lang,
  activeWikiPath,
  isAdmin,
  dict,
}: {
  nodes: Node[];
  lang: string;
  activeWikiPath?: string;
  isAdmin: boolean;
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(() => pathKeysBranchingToTarget(nodes, activeWikiPath));

  const toggle = (pathKey: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(pathKey)) next.delete(pathKey);
      else next.add(pathKey);
      return next;
    });
  };

  if (nodes.length === 0) {
    return <p className="repo-page-empty">{dict.admin.wiki.noPagesMatch}</p>;
  }

  return (
    <nav aria-label={dict.admin.wiki.pagesTreeAria}>
      <WikiTreeBranches
        nodes={nodes}
        lang={lang}
        depth={0}
        activeWikiPath={activeWikiPath}
        open={open}
        toggle={toggle}
        isAdmin={isAdmin}
        dict={dict}
      />
    </nav>
  );
}

/** Remount when the open page changes so branches along the active path start expanded without effects. */
export function WikiPageTree(props: {
  nodes: Node[];
  lang: string;
  activeWikiPath?: string;
  isAdmin: boolean;
  dict: Dictionary;
}) {
  return <WikiPageTreeInner key={props.activeWikiPath ?? "__root__"} {...props} />;
}
