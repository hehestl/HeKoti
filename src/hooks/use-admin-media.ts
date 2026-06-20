"use client";

import { useCallback, useRef, useState } from "react";
import type { MediaAssetDto } from "@/lib/media-assets";

type ListResponse = {
  ok: boolean;
  items?: MediaAssetDto[];
  nextCursor?: string | null;
  message?: string;
};

type UploadResponse = {
  ok: boolean;
  url?: string;
  asset?: MediaAssetDto;
  message?: string;
};

type PresignResponse = {
  ok: boolean;
  uploadUrl?: string;
  storageKey?: string;
  publicUrl?: string;
  message?: string;
};

export function useAdminMedia() {
  const [items, setItems] = useState<MediaAssetDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const nextCursorRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const loadGallery = useCallback(async (kind?: "IMAGE" | "VIDEO", reset = true) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ take: "48" });
      if (kind) params.set("kind", kind);
      const cursor = reset ? undefined : nextCursorRef.current ?? undefined;
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/admin/media?${params}`);
      const data = (await res.json()) as ListResponse;
      if (!data.ok || !data.items) {
        setError(data.message ?? "Failed to load gallery.");
        return;
      }
      setItems((prev) => (reset ? data.items! : [...prev, ...data.items!]));
      nextCursorRef.current = data.nextCursor ?? null;
      setNextCursor(nextCursorRef.current);
    } catch {
      setError("Failed to load gallery.");
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadImage = useCallback(async (file: File): Promise<UploadResponse> => {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      const data = (await res.json()) as UploadResponse;
      if (!data.ok) {
        setError(data.message ?? "Upload failed.");
        return data;
      }
      if (data.asset) {
        setItems((prev) => [data.asset!, ...prev]);
      }
      return data;
    } catch {
      const fail = { ok: false, message: "Upload failed." };
      setError(fail.message);
      return fail;
    } finally {
      setUploading(false);
    }
  }, []);

  const uploadVideo = useCallback(async (file: File): Promise<UploadResponse> => {
    setUploading(true);
    setError("");
    try {
      const presignRes = await fetch("/api/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      const presign = (await presignRes.json()) as PresignResponse;

      if (presign.ok && presign.uploadUrl && presign.storageKey && presign.publicUrl) {
        const putRes = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putRes.ok) {
          const fail = { ok: false, message: "S3 upload failed." };
          setError(fail.message);
          return fail;
        }

        const completeRes = await fetch("/api/media/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storageKey: presign.storageKey,
            filename: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            publicUrl: presign.publicUrl,
          }),
        });
        const data = (await completeRes.json()) as UploadResponse;
        if (!data.ok) {
          setError(data.message ?? "Upload failed.");
          return data;
        }
        if (data.asset) {
          setItems((prev) => [data.asset!, ...prev]);
        }
        return data;
      }

      const form = new FormData();
      form.set("file", file);
      form.set("kind", "video");
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      const data = (await res.json()) as UploadResponse;
      if (!data.ok) {
        setError(data.message ?? "Upload failed.");
        return data;
      }
      if (data.asset) {
        setItems((prev) => [data.asset!, ...prev]);
      }
      return data;
    } catch {
      const fail = { ok: false, message: "Upload failed." };
      setError(fail.message);
      return fail;
    } finally {
      setUploading(false);
    }
  }, []);

  const deleteMedia = useCallback(async (id: string): Promise<boolean> => {
    setError("");
    try {
      const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setError(data.message ?? "Delete failed.");
        return false;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      return true;
    } catch {
      setError("Delete failed.");
      return false;
    }
  }, []);

  return {
    items,
    nextCursor,
    loading,
    uploading,
    error,
    setError,
    loadGallery,
    uploadImage,
    uploadVideo,
    deleteMedia,
  };
}
