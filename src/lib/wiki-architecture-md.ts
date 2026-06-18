import { buildPathTree, type PathTreeNode } from "@/lib/page-tree";
import { toSlug, normalizePath } from "@/lib/slug";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";

export interface ArchNode {
  title: string;
  isCategory: boolean;
  comment?: string;
  depth: number;
}

export type ArchPageRef = {
  id: string;
  path: string;
  title: string;
  isCategory: boolean;
  lang: string;
  slug: string;
  navOrder?: number;
};

export type ArchOp =
  | {
      type: "create";
      lang: string;
      title: string;
      isCategory: boolean;
      parentParts: string[];
      slug: string;
      path: string;
    }
  | { type: "update"; id: string; title: string; isCategory: boolean }
  | { type: "softDelete"; id: string; path: string };

const TREE_LINE = /^([│\s]*)[├└]──\s+([^#\n]+?)(?:\s+#\s*(.*))?$/;

export function parseArchitectureMarkdown(md: string): ArchNode[] {
  const lines = md.split("\n");
  const result: ArchNode[] = [];
  let inBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inBlock = !inBlock;
      continue;
    }
    if (!inBlock && !line.includes("├──") && !line.includes("└──")) continue;

    const match = line.match(TREE_LINE);
    if (!match) continue;

    const fill = match[1] ?? "";
    const depth = (fill.match(/│/g) ?? []).length;
    let rawTitle = match[2].trim();
    const comment = match[3]?.trim();

    let isCategory = true;
    if (rawTitle.endsWith(".md")) {
      isCategory = false;
      rawTitle = rawTitle.slice(0, -3).trim();
    }

    if (!rawTitle) continue;
    result.push({ title: rawTitle, isCategory, comment, depth });
  }

  return result;
}

function flattenTreeNodes<T extends { path: string; title: string; isCategory?: boolean }>(
  nodes: PathTreeNode<T>[],
  lang: string,
  depth = 0,
  out: Array<{ depth: number; page: T; parentParts: string[] }> = [],
  parentParts: string[] = [],
): typeof out {
  for (const node of nodes) {
    if (node.page) {
      out.push({ depth, page: node.page, parentParts: [...parentParts] });
    }
    const nextParent = node.page
      ? pathSegmentsAfterLang(node.page.path, lang)
      : [...parentParts, node.segment];
    if (node.children.length) {
      flattenTreeNodes(node.children, lang, node.page ? depth + 1 : depth, out, nextParent);
    }
  }
  return out;
}

export function serializeArchitectureTree(
  pages: Array<{
    id: string;
    path: string;
    title: string;
    isCategory?: boolean;
    navOrder?: number;
  }>,
  lang: string,
  rootLabel = "hekoti-docs",
): string {
  const tree = buildPathTree(pages, lang);
  const flat = flattenTreeNodes(tree, lang);
  let md = "## Project Structure\n\n```\n";
  md += `${rootLabel} #\n`;

  flat.forEach((row, index) => {
    const indent = "│   ".repeat(row.depth);
    const prefix = index === flat.length - 1 ? "└── " : "├── ";
    const suffix = row.page.isCategory ? "" : ".md";
    md += `${indent}${prefix}${row.page.title}${suffix}\n`;
  });

  md += "```\n";
  return md;
}

function buildDesiredPaths(nodes: ArchNode[], lang: string): Map<string, Omit<ArchOp & { type: "create" }, "type">> {
  const map = new Map<string, Omit<ArchOp & { type: "create" }, "type">>();
  const stack: string[] = [];

  for (const node of nodes) {
    while (stack.length > node.depth) stack.pop();
    const slug = toSlug(node.title);
    const parentParts = [...stack];
    const path = normalizePath(lang, [...parentParts, slug]);
    map.set(path, {
      lang,
      title: node.title,
      isCategory: node.isCategory,
      parentParts,
      slug,
      path,
    });
    stack.push(slug);
  }

  return map;
}

export function diffArchitecture(
  currentPages: ArchPageRef[],
  parsed: ArchNode[],
  lang: string,
): ArchOp[] {
  const desired = buildDesiredPaths(parsed, lang);
  const desiredPaths = new Set(desired.keys());
  const currentByPath = new Map(currentPages.map((p) => [p.path, p]));
  const ops: ArchOp[] = [];

  for (const [path, spec] of desired) {
    const existing = currentByPath.get(path);
    if (!existing) {
      ops.push({ type: "create", ...spec });
      continue;
    }
    if (existing.title !== spec.title || existing.isCategory !== spec.isCategory) {
      ops.push({
        type: "update",
        id: existing.id,
        title: spec.title,
        isCategory: spec.isCategory,
      });
    }
  }

  for (const page of currentPages) {
    if (!desiredPaths.has(page.path)) {
      ops.push({ type: "softDelete", id: page.id, path: page.path });
    }
  }

  return ops;
}

export function sortOpsForApply(ops: ArchOp[]): ArchOp[] {
  const creates = ops.filter((o): o is Extract<ArchOp, { type: "create" }> => o.type === "create");
  const updates = ops.filter((o): o is Extract<ArchOp, { type: "update" }> => o.type === "update");
  const deletes = ops.filter((o): o is Extract<ArchOp, { type: "softDelete" }> => o.type === "softDelete");

  creates.sort((a, b) => a.parentParts.length - b.parentParts.length);
  deletes.sort((a, b) => b.path.length - a.path.length);

  return [...creates, ...updates, ...deletes];
}
