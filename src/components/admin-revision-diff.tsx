"use client";

import { useTheme } from "next-themes";
import { AdminMonacoDiff } from "@/components/admin-monaco-diff";
import type { MetadataDiffRow } from "@/lib/page-revision-snapshot";
import type { Dictionary } from "@/lib/i18n";

type DiffPayload = {
  fromTitle: string;
  toTitle: string;
  fromContentMd: string;
  toContentMd: string;
  titleChanged: boolean;
  contentChanged: boolean;
  lineStats: { added: number; removed: number };
  metadataDiff: MetadataDiffRow[];
};

const FIELD_LABEL_KEYS: Record<string, keyof Dictionary["admin"]["workbench"]> = {
  title: "revisionFieldTitle",
  contentMd: "revisionFieldContent",
  icon: "revisionFieldIcon",
  isPublished: "revisionFieldIsPublished",
  showToc: "revisionFieldShowToc",
  isCategory: "revisionFieldIsCategory",
  navOrder: "revisionFieldNavOrder",
  slug: "revisionFieldSlug",
  path: "revisionFieldPath",
};

export function AdminRevisionDiff({
  diff,
  dict,
  onCopyMarkdown,
}: {
  diff: DiffPayload;
  dict: Dictionary;
  onCopyMarkdown: () => void;
}) {
  const wb = dict.admin.workbench;
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "vs-dark" : "vs";

  return (
    <div className="admin-revision-diff">
      {(diff.lineStats.added > 0 || diff.lineStats.removed > 0) && (
        <p className="admin-revision-diff-stats">
          <span className="admin-revision-stat-added">
            {wb.revisionLinesAdded.replace("{n}", String(diff.lineStats.added))}
          </span>
          {" · "}
          <span className="admin-revision-stat-removed">
            {wb.revisionLinesRemoved.replace("{n}", String(diff.lineStats.removed))}
          </span>
        </p>
      )}

      {diff.titleChanged ? (
        <div className="admin-revision-title-diff">
          <span className="admin-revision-title-before">{diff.fromTitle}</span>
          <span aria-hidden>→</span>
          <span className="admin-revision-title-after">{diff.toTitle}</span>
        </div>
      ) : null}

      <div className="admin-revision-diff-toolbar">
        <button type="button" className="wiki-inline-edit-btn wiki-inline-edit-btn-muted" onClick={onCopyMarkdown}>
          {wb.revisionCopyMarkdown}
        </button>
      </div>

      <AdminMonacoDiff
        original={diff.fromContentMd}
        modified={diff.toContentMd}
        theme={theme}
        language="markdown"
      />

      <h3 className="admin-revision-meta-heading">{wb.revisionMetadata}</h3>
      <table className="admin-revision-meta-table">
        <thead>
          <tr>
            <th>{wb.revisionColField}</th>
            <th>{wb.revisionColBefore}</th>
            <th>{wb.revisionColAfter}</th>
          </tr>
        </thead>
        <tbody>
          {diff.metadataDiff.map((row) => {
            const labelKey = FIELD_LABEL_KEYS[row.field];
            const label = labelKey ? wb[labelKey] : row.field;
            return (
              <tr key={row.field} className={row.changed ? "admin-revision-meta-changed" : undefined}>
                <td>{label}</td>
                <td>{row.before || "—"}</td>
                <td>{row.after || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
