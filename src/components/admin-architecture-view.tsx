"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useAdminPages } from "@/components/admin-workbench/admin-pages-provider";
import { apiFetch } from "@/lib/api-fetch";
import type { Dictionary } from "@/lib/i18n";
import type { AdminPageRow } from "@/types/admin-workbench";

const MonacoEditor = dynamic(() => import("@/components/admin-monaco"), { ssr: false });

import { pathSegmentsAfterLang } from "@/lib/wiki-path";

function findLangRootPage(pages: AdminPageRow[], lang: string): AdminPageRow | undefined {
  const roots = pages.filter((p) => pathSegmentsAfterLang(p.path, lang).length === 1);
  if (roots.length === 0) return pages[0];
  return roots.sort((a, b) => a.navOrder - b.navOrder || a.title.localeCompare(b.title))[0];
}

export function AdminArchitectureView({
  enabledLanguages,
  dict,
  activeAgentId,
  onStatusChange,
}: {
  enabledLanguages: string[];
  dict: Dictionary;
  activeAgentId?: string | null;
  onStatusChange: (text: string, tone?: "neutral" | "error") => void;
}) {
  const ar = dict.admin.architecture;
  const { pagesByLang, setPagesForLang } = useAdminPages();
  const [lang, setLang] = useState(enabledLanguages[0] ?? "en");
  const [markdown, setMarkdown] = useState("");
  const [mirrorStructure, setMirrorStructure] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadFromWiki = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/architecture?lang=${encodeURIComponent(lang)}`);
      const body = (await res.json()) as { ok?: boolean; markdown?: string; message?: string };
      if (!res.ok || !body.ok || !body.markdown) {
        onStatusChange(body.message ?? ar.loadFailed, "error");
        return;
      }
      setMarkdown(body.markdown);
      onStatusChange(ar.loaded);
    } catch {
      onStatusChange(ar.loadFailed, "error");
    } finally {
      setLoading(false);
    }
  }, [ar.loadFailed, ar.loaded, lang, onStatusChange]);

  useEffect(() => {
    void loadFromWiki();
  }, [loadFromWiki]);

  const refreshPagesStore = async () => {
    const res = await apiFetch("/api/admin/pages?all=1");
    if (!res.ok) return;
    const data = (await res.json()) as Record<string, AdminPageRow[]>;
    for (const [pageLang, rows] of Object.entries(data)) {
      setPagesForLang(
        pageLang,
        rows.map((r) => ({
          ...r,
          lang: pageLang,
          icon: r.icon ?? null,
          isCategory: r.isCategory ?? false,
        })),
      );
    }
  };

  const saveSync = () => {
    startTransition(async () => {
      onStatusChange(ar.saving);
      try {
        const res = await apiFetch("/api/admin/architecture/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lang, markdown, mirrorStructure }),
        });
        const body = (await res.json()) as { ok?: boolean; opsApplied?: number; message?: string };
        if (!res.ok || !body.ok) {
          onStatusChange(body.message ?? ar.syncFailed, "error");
          return;
        }
        await refreshPagesStore();
        await loadFromWiki();
        onStatusChange(ar.synced.replace("{count}", String(body.opsApplied ?? 0)));
      } catch {
        onStatusChange(ar.syncFailed, "error");
      }
    });
  };

  const aiTitles = () => {
    const pages = pagesByLang[lang] ?? [];
    const root = findLangRootPage(pages, lang);
    if (!root) {
      onStatusChange(ar.noRootPage, "error");
      return;
    }
    startTransition(async () => {
      onStatusChange(ar.aiRunning);
      try {
        const res = await apiFetch(`/api/pages/${root.id}/localize-titles-branch`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ agentId: activeAgentId ?? undefined }),
        });
        const body = (await res.json()) as { ok?: boolean; message?: string; summary?: { updated: number; created: number } };
        if (!res.ok || !body.ok) {
          onStatusChange(body.message ?? ar.aiFailed, "error");
          return;
        }
        await refreshPagesStore();
        const s = body.summary;
        onStatusChange(
          ar.aiDone
            .replace("{updated}", String(s?.updated ?? 0))
            .replace("{created}", String(s?.created ?? 0)),
        );
      } catch {
        onStatusChange(ar.aiFailed, "error");
      }
    });
  };

  return (
    <div className="admin-architecture-view">
      <div className="admin-architecture-toolbar">
        <label className="admin-architecture-lang">
          <span>{ar.langLabel}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={isPending || loading}>
            {enabledLanguages.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="admin-explorer-tool-btn" onClick={() => void loadFromWiki()} disabled={isPending || loading}>
          {ar.refreshFromWiki}
        </button>
        <button type="button" className="admin-explorer-tool-btn" onClick={saveSync} disabled={isPending || loading}>
          {ar.save}
        </button>
        <button type="button" className="admin-explorer-tool-btn" onClick={aiTitles} disabled={isPending || loading}>
          {ar.aiTitles}
        </button>
        <label className="admin-architecture-mirror">
          <input
            type="checkbox"
            checked={mirrorStructure}
            onChange={(e) => setMirrorStructure(e.target.checked)}
            disabled={isPending}
          />
          {ar.mirrorStructure}
        </label>
      </div>
      <div className="admin-architecture-editor">
        {loading ? (
          <p className="admin-architecture-loading">{dict.common.loading}</p>
        ) : (
          <MonacoEditor
            height="100%"
            defaultLanguage="markdown"
            value={markdown}
            onChange={(value) => setMarkdown(value ?? "")}
            options={{
              wordWrap: "on",
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
            }}
          />
        )}
      </div>
    </div>
  );
}
