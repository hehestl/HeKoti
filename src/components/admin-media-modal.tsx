"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { useAdminMedia } from "@/hooks/use-admin-media";

type Tab = "upload" | "gallery" | "url";

type Props = {
  mode: "image" | "video";
  dict: Dictionary;
  onClose: () => void;
  onInsert: (snippet: string) => void;
};

const tbBtn: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: 12,
  background: "var(--panel)",
  color: "var(--fg)",
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--fg)",
  padding: "8px 10px",
  width: "100%",
};

export function AdminMediaModal({ mode, dict, onClose, onInsert }: Props) {
  const m = dict.admin.editor.media;
  const { items, nextCursor, loading, uploading, error, setError, loadGallery, uploadImage, uploadVideo } =
    useAdminMedia();
  const [tab, setTab] = useState<Tab>("upload");
  const [url, setUrl] = useState("https://");
  const [alt, setAlt] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const kind = mode === "image" ? "IMAGE" : "VIDEO";

  useEffect(() => {
    if (tab === "gallery") {
      void loadGallery(kind, true);
    }
  }, [tab, kind, loadGallery]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const buildImageSnippet = useCallback(
    (publicUrl: string, label?: string) => {
      const text = (label ?? alt).trim() || m.defaultAlt;
      return `![${text}](${publicUrl})`;
    },
    [alt, m.defaultAlt],
  );

  const buildVideoSnippet = useCallback((publicUrl: string) => {
    return `<video src="${publicUrl}" controls playsinline></video>`;
  }, []);

  const insertFromUrl = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError(m.urlRequired);
      return;
    }
    onInsert(mode === "image" ? buildImageSnippet(trimmed) : buildVideoSnippet(trimmed));
    onClose();
  }, [url, mode, setError, m.urlRequired, onInsert, onClose, buildImageSnippet, buildVideoSnippet]);

  const insertFromGallery = useCallback(() => {
    const picked = items.filter((item) => selected.has(item.id));
    if (picked.length === 0) {
      setError(m.pickOne);
      return;
    }
    const snippet = picked
      .map((item) =>
        mode === "image" ? buildImageSnippet(item.publicUrl, item.filename) : buildVideoSnippet(item.publicUrl),
      )
      .join("\n\n");
    onInsert(snippet);
    onClose();
  }, [items, selected, setError, mode, m.pickOne, onInsert, onClose, buildImageSnippet, buildVideoSnippet]);

  const onFileChange = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const result = mode === "image" ? await uploadImage(file) : await uploadVideo(file);
      if (!result.ok || !result.url) return;
      onInsert(mode === "image" ? buildImageSnippet(result.url) : buildVideoSnippet(result.url));
      onClose();
    },
    [mode, uploadImage, uploadVideo, onInsert, onClose, buildImageSnippet, buildVideoSnippet],
  );

  const title = mode === "image" ? m.imageTitle : m.videoTitle;

  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 11000,
        padding: 12,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          maxHeight: "min(90vh, 720px)",
          overflow: "auto",
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 12,
          display: "grid",
          gap: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["upload", "gallery", "url"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              style={{
                ...tbBtn,
                background: tab === t ? "var(--accent)" : "var(--panel)",
                color: tab === t ? "#fff" : "var(--fg)",
              }}
              onClick={() => setTab(t)}
            >
              {t === "upload" ? m.tabUpload : t === "gallery" ? m.tabGallery : m.tabUrl}
            </button>
          ))}
        </div>

        {tab === "upload" ? (
          <div style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              {mode === "image" ? m.uploadImageHint : m.uploadVideoHint}
            </p>
            <input
              type="file"
              accept={mode === "image" ? "image/jpeg,image/png,image/gif,image/webp" : "video/mp4,video/webm"}
              disabled={uploading}
              onChange={(e) => void onFileChange(e.target.files?.[0])}
            />
            {uploading ? <p style={{ margin: 0, fontSize: 13 }}>{m.uploading}</p> : null}
          </div>
        ) : null}

        {tab === "gallery" ? (
          <div style={{ display: "grid", gap: 8 }}>
            {loading && items.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13 }}>{m.loading}</p>
            ) : null}
            {!loading && items.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{m.empty}</p>
            ) : null}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                gap: 8,
              }}
            >
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleSelect(item.id)}
                  style={{
                    border: selected.has(item.id) ? "2px solid var(--accent)" : "1px solid var(--line)",
                    borderRadius: 8,
                    padding: 4,
                    background: "transparent",
                    cursor: "pointer",
                    minHeight: 80,
                  }}
                  title={item.filename}
                >
                  {item.kind === "IMAGE" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.publicUrl}
                      alt={item.filename}
                      style={{ width: "100%", height: 72, objectFit: "cover", borderRadius: 4 }}
                    />
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{item.filename}</span>
                  )}
                </button>
              ))}
            </div>
            {nextCursor ? (
              <button
                type="button"
                style={tbBtn}
                disabled={loading}
                onClick={() => void loadGallery(kind, false)}
              >
                {m.loadMore}
              </button>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" style={tbBtn} onClick={onClose}>
                {dict.common.cancel}
              </button>
              <button
                type="button"
                style={{ ...tbBtn, background: "var(--accent)", color: "#fff" }}
                onClick={insertFromGallery}
              >
                {m.insertSelected}
              </button>
            </div>
          </div>
        ) : null}

        {tab === "url" ? (
          <div style={{ display: "grid", gap: 8 }}>
            <input
              style={inputStyle}
              autoFocus
              value={url}
              placeholder={m.urlPlaceholder}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") insertFromUrl();
              }}
            />
            {mode === "image" ? (
              <input
                style={inputStyle}
                value={alt}
                placeholder={m.altPlaceholder}
                onChange={(e) => setAlt(e.target.value)}
              />
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" style={tbBtn} onClick={onClose}>
                {dict.common.cancel}
              </button>
              <button
                type="button"
                style={{ ...tbBtn, background: "var(--accent)", color: "#fff" }}
                onClick={insertFromUrl}
              >
                {dict.common.save}
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p style={{ margin: 0, color: "#ff5f7d", fontSize: 13 }}>{error}</p> : null}

        {tab === "upload" ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" style={tbBtn} onClick={onClose}>
              {dict.common.cancel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
