"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminContextMenu } from "@/components/admin-workbench/admin-context-menu";
import { TreeIndentGuides, TreePageIcon } from "@/components/page-tree-shared";
import { apiFetch } from "@/lib/api-fetch";
import { buildPathTree, pathKeysWithChildren, type PathTreeNode } from "@/lib/page-tree";
import type { AdminContextMenuItem } from "@/types/admin-workbench";
import type { Dictionary } from "@/lib/i18n";

type TrashPageRow = {
  id: string;
  title: string;
  path: string;
  lang: string;
  isCategory: boolean;
  icon: string | null;
  deletedAt: string;
};

function daysUntilPurge(deletedAt: string): number {
  const purgeAt = new Date(deletedAt).getTime() + 3 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

function TrashTreeRows({
  nodes,
  depth,
  openKeys,
  onToggle,
  onContextMenu,
}: {
  nodes: PathTreeNode<TrashPageRow>[];
  depth: number;
  openKeys: Set<string>;
  onToggle: (key: string) => void;
  onContextMenu: (page: TrashPageRow, x: number, y: number) => void;
}) {
  return (
    <>
      {nodes.map((node, index) => {
        const page = node.page;
        const hasChildren = node.children.length > 0;
        const open = openKeys.has(node.pathKey);
        const isLast = index === nodes.length - 1;
        return (
          <div key={node.pathKey}>
            {page ? (
              <div
                className="admin-explorer-row"
                style={{ paddingLeft: depth * 12 + 8 }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(page, e.clientX, e.clientY);
                }}
              >
                <TreeIndentGuides depth={depth} isLast={isLast} />
                {hasChildren ? (
                  <button
                    type="button"
                    className="admin-explorer-chevron"
                    aria-expanded={open}
                    onClick={() => onToggle(node.pathKey)}
                  >
                    {open ? "▾" : "▸"}
                  </button>
                ) : (
                  <span className="admin-explorer-chevron-spacer" />
                )}
                <TreePageIcon icon={page.icon} isCategory={page.isCategory} />
                <span className="admin-explorer-label">{page.title}</span>
                <span className="admin-explorer-meta">{daysUntilPurge(page.deletedAt)}d</span>
              </div>
            ) : null}
            {hasChildren && (open || !page) ? (
              <TrashTreeRows
                nodes={node.children}
                depth={page ? depth + 1 : depth}
                openKeys={openKeys}
                onToggle={onToggle}
                onContextMenu={onContextMenu}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function AdminTrashView({
  enabledLanguages,
  dict,
  onStatusChange,
}: {
  enabledLanguages: string[];
  dict: Dictionary;
  onStatusChange: (text: string, tone?: "neutral" | "error") => void;
}) {
  const wb = dict.admin.workbench;
  const tp = dict.admin.trash;
  const [pages, setPages] = useState<TrashPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBranches, setOpenBranches] = useState<Record<string, Set<string>>>({});
  const [rowMenu, setRowMenu] = useState<{ page: TrashPageRow; x: number; y: number } | null>(null);
  const [pathConflict, setPathConflict] = useState<{ title: string } | null>(null);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/pages/trash");
      const body = (await res.json()) as { ok?: boolean; pages?: TrashPageRow[]; message?: string };
      if (!res.ok || !body.ok) {
        onStatusChange(body.message ?? tp.loadFailed, "error");
        return;
      }
      setPages(body.pages ?? []);
    } catch {
      onStatusChange(tp.loadFailed, "error");
    } finally {
      setLoading(false);
    }
  }, [onStatusChange, tp.loadFailed]);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  const pagesByLang = useMemo(() => {
    const map: Record<string, TrashPageRow[]> = {};
    for (const lang of enabledLanguages) map[lang] = [];
    for (const p of pages) {
      (map[p.lang] ??= []).push(p);
    }
    return map;
  }, [enabledLanguages, pages]);

  const restorePage = async (page: TrashPageRow) => {
    const res = await apiFetch(`/api/pages/${page.id}/restore`, { method: "POST" });
    const body = (await res.json()) as { ok?: boolean; error?: string; title?: string; message?: string };
    if (res.status === 409 && body.error === "PATH_OCCUPIED") {
      setPathConflict({ title: body.title ?? "" });
      return;
    }
    if (!res.ok || !body.ok) {
      onStatusChange(body.message ?? tp.restoreFailed, "error");
      return;
    }
    onStatusChange(tp.restored);
    await loadTrash();
  };

  const purgePage = async (page: TrashPageRow, force = false) => {
    const url = force ? `/api/pages/${page.id}/purge?force=1` : `/api/pages/${page.id}/purge`;
    const res = await apiFetch(url, { method: "DELETE" });
    const body = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !body.ok) {
      onStatusChange(body.message ?? tp.purgeFailed, "error");
      return;
    }
    onStatusChange(tp.purged);
    await loadTrash();
  };

  const buildMenuItems = (page: TrashPageRow): AdminContextMenuItem[] => {
    const daysLeft = daysUntilPurge(page.deletedAt);
    return [
      { id: "restore", label: tp.restore, onClick: () => void restorePage(page) },
      { id: "sep", label: "", separator: true },
      {
        id: "purge",
        label: tp.purgeForever,
        danger: true,
        disabled: daysLeft > 0,
        onClick: () => void purgePage(page),
      },
    ];
  };

  const toggleBranch = (lang: string, key: string) => {
    setOpenBranches((prev) => {
      const set = new Set(prev[lang] ?? []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, [lang]: set };
    });
  };

  return (
    <div className="admin-trash-view">
      <div className="admin-trash-banner">{tp.retentionBanner}</div>
      <div className="admin-trash-toolbar">
        <button type="button" className="admin-explorer-tool-btn" onClick={() => void loadTrash()}>
          {wb.refresh}
        </button>
      </div>
      {loading ? <p className="admin-trash-empty">{dict.common.loading}</p> : null}
      {!loading && pages.length === 0 ? <p className="admin-trash-empty">{tp.empty}</p> : null}
      {enabledLanguages.map((lang) => {
        const langPages = pagesByLang[lang] ?? [];
        if (langPages.length === 0) return null;
        const tree = buildPathTree(langPages, lang);
        const openKeys = openBranches[lang] ?? pathKeysWithChildren(tree);
        return (
          <section key={lang} className="admin-explorer-lang-section">
            <div className="admin-explorer-lang-header">
              {lang.toUpperCase()} ({langPages.length})
            </div>
            <TrashTreeRows
              nodes={tree}
              depth={0}
              openKeys={openKeys}
              onToggle={(key) => toggleBranch(lang, key)}
              onContextMenu={(page, x, y) => setRowMenu({ page, x, y })}
            />
          </section>
        );
      })}
      {rowMenu ? (
        <AdminContextMenu
          x={rowMenu.x}
          y={rowMenu.y}
          items={buildMenuItems(rowMenu.page)}
          onClose={() => setRowMenu(null)}
        />
      ) : null}
      {pathConflict ? (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <h3 style={{ marginTop: 0 }}>{tp.pathOccupiedTitle}</h3>
            <p style={{ margin: "8px 0 16px" }}>
              {tp.pathOccupiedBody.replace("{title}", pathConflict.title)}
            </p>
            <button type="button" className="admin-modal-btn" onClick={() => setPathConflict(null)}>
              {dict.common.cancel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
