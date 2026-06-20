"use client";

import type { CSSProperties } from "react";
import { AdminEditorSplit } from "@/components/admin-workbench/admin-editor-split";
import { AdminEditorTabs } from "@/components/admin-workbench/admin-editor-tabs";
import { AdminMarkdownEditor } from "@/components/admin-markdown-editor";
import { AdminPostsEditorModals } from "@/components/admin-posts-editor-modals";
import type { Dictionary } from "@/lib/i18n";
import type { useAdminOpenTabs } from "@/hooks/use-admin-open-tabs";
import type { useAdminPageSave } from "@/hooks/use-admin-page-save";
import type { AdminPageRow } from "@/types/admin-workbench";

const inputStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--fg)",
  padding: "8px 10px",
};

type OpenTabs = ReturnType<typeof useAdminOpenTabs>;
type PageSave = ReturnType<typeof useAdminPageSave>;

type CreateModal = { lang: string; parentParts: string[]; isCategory?: boolean } | null;
type RenameModal = { id: string; lang: string; title: string; slug: string } | null;
type DeleteModal = { id: string; lang: string; title: string; childCount: number } | null;

export function AdminPostsEditorMain({
  dict,
  wb,
  tabs,
  active,
  savePage,
  getPage,
  syncActivePathUrl,
  previewVisible,
  splitRatio,
  onSplitRatioChange,
  wikiPages,
  isPending,
  createModal,
  createTitle,
  onCreateTitleChange,
  onCreateCancel,
  onCreateSubmit,
  renameModal,
  renamePreviewPath,
  renameSlugValid,
  onRenameChange,
  onRenameCancel,
  onRenameSubmit,
  deleteModal,
  onDeleteCancel,
  onDeleteSubmit,
}: {
  dict: Dictionary;
  wb: Dictionary["admin"]["workbench"];
  tabs: OpenTabs;
  active: PageSave["active"];
  savePage: PageSave["savePage"];
  getPage: (id: string, lang: string) => AdminPageRow | undefined;
  syncActivePathUrl: (page?: AdminPageRow) => void;
  previewVisible: boolean;
  splitRatio: number;
  onSplitRatioChange: (ratio: number) => void;
  wikiPages: { path: string; title: string }[];
  isPending: boolean;
  createModal: CreateModal;
  createTitle: string;
  onCreateTitleChange: (v: string) => void;
  onCreateCancel: () => void;
  onCreateSubmit: () => void;
  renameModal: RenameModal;
  renamePreviewPath: string;
  renameSlugValid: boolean;
  onRenameChange: (patch: Partial<{ title: string; slug: string }>) => void;
  onRenameCancel: () => void;
  onRenameSubmit: () => void;
  deleteModal: DeleteModal;
  onDeleteCancel: () => void;
  onDeleteSubmit: () => void;
}) {
  return (
    <div className="admin-editor-main">
      <AdminEditorTabs
        tabs={tabs.openTabs}
        activeTabId={tabs.activeTabId}
        onSelect={(key) => {
          tabs.setActiveTabId(key);
          const sep = key.indexOf(":");
          if (sep < 0) return;
          const pl = key.slice(0, sep);
          const pid = key.slice(sep + 1);
          const page = getPage(pid, pl);
          if (page) syncActivePathUrl(page);
        }}
        onClose={(pageId, lang) => tabs.closeTab(pageId, lang)}
        onSave={(pageId, lang) => void savePage(pageId, lang)}
        dict={wb}
      />
      {!active ? (
        <p className="admin-sidebar-hint">{wb.noOpenTabs}</p>
      ) : (
        <>
          <input
            className="admin-editor-title-input"
            style={inputStyle}
            value={active.title}
            onChange={(e) => tabs.patchDraft(active.id, active.lang, { title: e.target.value })}
          />
          <AdminEditorSplit
            markdown={active.contentMd}
            lang={active.lang}
            pagePath={active.path}
            previewVisible={previewVisible}
            splitRatio={splitRatio}
            onSplitRatioChange={onSplitRatioChange}
            dict={wb}
            editor={
              <AdminMarkdownEditor
                key={`${active.id}:${active.lang}`}
                value={active.contentMd}
                onChange={(v) => tabs.patchDraft(active.id, active.lang, { contentMd: v })}
                lang={active.lang}
                wikiPages={wikiPages}
                dict={dict}
                height="100%"
              />
            }
          />
        </>
      )}
      <AdminPostsEditorModals
        dict={dict}
        isPending={isPending}
        createModal={createModal}
        createTitle={createTitle}
        onCreateTitleChange={onCreateTitleChange}
        onCreateCancel={onCreateCancel}
        onCreateSubmit={onCreateSubmit}
        renameModal={renameModal}
        renamePreviewPath={renamePreviewPath}
        renameSlugValid={renameSlugValid}
        onRenameChange={onRenameChange}
        onRenameCancel={onRenameCancel}
        onRenameSubmit={onRenameSubmit}
        deleteModal={deleteModal}
        onDeleteCancel={onDeleteCancel}
        onDeleteSubmit={onDeleteSubmit}
      />
    </div>
  );
}
