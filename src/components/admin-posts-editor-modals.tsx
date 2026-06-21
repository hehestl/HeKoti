"use client";

import type { CSSProperties, ReactNode } from "react";
import { WikiIconPickerGrid } from "@/components/wiki-icon-picker-grid";
import type { Dictionary } from "@/lib/i18n";
import type { WikiIconKey } from "@/lib/wiki-icon-presets";

const inputStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--fg)",
  padding: "8px 10px",
};

const buttonStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--fg)",
  padding: "8px 10px",
};

function ModalCard({
  title,
  children,
  onCancel,
  onSubmit,
  submitLabel,
  cancelLabel,
  submitDisabled = false,
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  cancelLabel: string;
  submitDisabled?: boolean;
}) {
  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal onClick={onCancel}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        {children}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" style={buttonStyle} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            style={{ ...buttonStyle, background: "var(--accent)", color: "#fff" }}
            onClick={onSubmit}
            disabled={submitDisabled}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminPostsEditorModals({
  dict,
  isPending,
  createModal,
  createTitle,
  createSlug,
  createPreviewPath,
  createSlugValid,
  onCreateTitleChange,
  onCreateSlugChange,
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
  isPending: boolean;
  createModal: { isCategory?: boolean } | null;
  createTitle: string;
  createSlug: string;
  createPreviewPath: string;
  createSlugValid: boolean;
  onCreateTitleChange: (v: string) => void;
  onCreateSlugChange: (v: string) => void;
  onCreateCancel: () => void;
  onCreateSubmit: () => void;
  renameModal: { title: string; slug: string; icon: WikiIconKey | null } | null;
  renamePreviewPath: string;
  renameSlugValid: boolean;
  onRenameChange: (patch: Partial<{ title: string; slug: string; icon: WikiIconKey | null }>) => void;
  onRenameCancel: () => void;
  onRenameSubmit: () => void;
  deleteModal: { title: string; childCount: number } | null;
  onDeleteCancel: () => void;
  onDeleteSubmit: () => void;
}) {
  return (
    <>
      {createModal ? (
        <ModalCard
          title={createModal.isCategory ? dict.admin.workbench.createCategory : dict.admin.posts.pageTitle}
          cancelLabel={dict.common.cancel}
          onCancel={onCreateCancel}
          onSubmit={onCreateSubmit}
          submitLabel={dict.common.save}
          submitDisabled={!createTitle.trim() || isPending || (!createModal.isCategory && !createSlugValid)}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              {dict.admin.posts.renamePrompt}
              <input
                style={{ ...inputStyle, width: "100%" }}
                value={createTitle}
                autoFocus
                onChange={(e) => onCreateTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && createSlugValid) onCreateSubmit();
                }}
              />
            </label>
            {!createModal.isCategory ? (
              <>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                  {dict.admin.posts.renameSlug}
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>{dict.admin.posts.renameSlugHint}</span>
                  <input
                    style={{
                      ...inputStyle,
                      width: "100%",
                      borderColor: createSlugValid ? undefined : "#ff5f7d",
                    }}
                    value={createSlug}
                    onChange={(e) => onCreateSlugChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && createSlugValid) onCreateSubmit();
                    }}
                  />
                </label>
                {createPreviewPath ? (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                    {dict.admin.posts.renameSlugPreview.replace("{path}", createPreviewPath)}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </ModalCard>
      ) : null}
      {renameModal ? (
        <ModalCard
          title={dict.admin.posts.rename}
          cancelLabel={dict.common.cancel}
          onCancel={onRenameCancel}
          onSubmit={onRenameSubmit}
          submitLabel={dict.common.save}
          submitDisabled={!renameModal.title.trim() || !renameSlugValid}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              {dict.admin.posts.renamePrompt}
              <input
                style={{ ...inputStyle, width: "100%" }}
                value={renameModal.title}
                autoFocus
                onChange={(e) => onRenameChange({ title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onRenameSubmit();
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              {dict.admin.posts.renameSlug}
              <span style={{ color: "var(--muted)", fontSize: 12 }}>{dict.admin.posts.renameSlugHint}</span>
              <input
                style={{
                  ...inputStyle,
                  width: "100%",
                  borderColor: renameSlugValid ? undefined : "#ff5f7d",
                }}
                value={renameModal.slug}
                onChange={(e) => onRenameChange({ slug: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onRenameSubmit();
                }}
              />
            </label>
            {renamePreviewPath ? (
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                {dict.admin.posts.renameSlugPreview.replace("{path}", renamePreviewPath)}
              </p>
            ) : null}
            <WikiIconPickerGrid
              label={dict.admin.posts.changeIcon}
              clearLabel={dict.admin.posts.clearIcon}
              value={renameModal.icon}
              onChange={(icon) => onRenameChange({ icon })}
            />
          </div>
        </ModalCard>
      ) : null}
      {deleteModal ? (
        <ModalCard
          title={dict.admin.posts.delete}
          cancelLabel={dict.common.cancel}
          onCancel={onDeleteCancel}
          onSubmit={onDeleteSubmit}
          submitLabel={dict.admin.posts.delete}
        >
          <p style={{ margin: 0 }}>
            {deleteModal.childCount > 0
              ? dict.admin.posts.deleteConfirmCascade
                  .replace("{title}", deleteModal.title)
                  .replace("{count}", String(deleteModal.childCount))
              : dict.admin.posts.deleteConfirm.replace("{title}", deleteModal.title)}
          </p>
        </ModalCard>
      ) : null}
    </>
  );
}
