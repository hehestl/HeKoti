"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import type { DonateInlineEditLabels } from "@/components/donate-inline-edit-types";
import { donateConfigEquals, type DonateConfig } from "@/lib/donate-config-shared";

type DonateInlineEditContextValue = {
  canEdit: boolean;
  isEditing: boolean;
  isAdmin: boolean;
  config: DonateConfig | null;
  draft: DonateConfig | null;
  baseline: DonateConfig | null;
  statusText: string;
  statusTone: "neutral" | "error";
  labels: DonateInlineEditLabels;
  registerConfig: (config: DonateConfig) => void;
  unregisterConfig: () => void;
  startEdit: () => void;
  cancelEdit: () => void;
  saveNow: () => Promise<boolean>;
  patchDraft: (patch: Partial<DonateConfig>) => void;
  isDirty: boolean;
};

const DonateInlineEditContext = createContext<DonateInlineEditContextValue | null>(null);

export function DonateInlineEditProvider({
  isAdmin,
  labels,
  children,
}: {
  isAdmin: boolean;
  labels: DonateInlineEditLabels;
  children: ReactNode;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<DonateConfig | null>(null);
  const [baseline, setBaseline] = useState<DonateConfig | null>(null);
  const [draft, setDraft] = useState<DonateConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<"neutral" | "error">("neutral");
  const [registered, setRegistered] = useState(false);

  const setStatus = useCallback((text: string, tone: "neutral" | "error" = "neutral") => {
    setStatusText(text);
    setStatusTone(tone);
  }, []);

  const registerConfig = useCallback(
    (next: DonateConfig) => {
      setRegistered(true);
      if (!isEditing) {
        setConfig(next);
        setBaseline(next);
        setDraft(null);
        return;
      }
      setConfig(next);
      setBaseline(next);
    },
    [isEditing],
  );

  const unregisterConfig = useCallback(() => {
    setRegistered(false);
    setConfig(null);
    setBaseline(null);
    if (!isEditing) setDraft(null);
  }, [isEditing]);

  const isDirty = useMemo(() => {
    if (!draft || !baseline) return false;
    return !donateConfigEquals(draft, baseline);
  }, [baseline, draft]);

  const startEdit = useCallback(() => {
    if (!isAdmin || !config) return;
    const next = {
      platforms: config.platforms.map((p) => ({ ...p })),
      crypto: config.crypto.map((c) => ({ ...c })),
      contacts: config.contacts.map((c) => ({ ...c })),
    };
    setDraft(next);
    setBaseline(next);
    setIsEditing(true);
    setStatusText("");
    setStatusTone("neutral");
  }, [config, isAdmin]);

  const cancelEdit = useCallback(() => {
    if (isDirty && !window.confirm(labels.dirtyConfirm)) return;
    setIsEditing(false);
    setDraft(null);
    setStatusText("");
    setStatusTone("neutral");
    router.refresh();
  }, [isDirty, labels.dirtyConfirm, router]);

  const saveNow = useCallback(async () => {
    if (!draft || !baseline) return false;
    setStatus(labels.saving);
    try {
      const res = await apiFetch("/api/admin/donate-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as { ok: boolean; config?: DonateConfig; message?: string };
      if (!res.ok || !data.ok || !data.config) {
        setStatus(data.message ?? labels.failed, "error");
        return false;
      }
      setConfig(data.config);
      setBaseline(data.config);
      setDraft(data.config);
      setStatus(labels.saved);
      router.refresh();
      return true;
    } catch {
      setStatus(labels.failed, "error");
      return false;
    }
  }, [baseline, draft, labels.failed, labels.saved, labels.saving, router]);

  const patchDraft = useCallback((patch: Partial<DonateConfig>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo(
    (): DonateInlineEditContextValue => ({
      canEdit: isAdmin && registered && !!config,
      isEditing,
      isAdmin,
      config,
      draft,
      baseline,
      statusText,
      statusTone,
      labels,
      registerConfig,
      unregisterConfig,
      startEdit,
      cancelEdit,
      saveNow,
      patchDraft,
      isDirty,
    }),
    [
      baseline,
      cancelEdit,
      config,
      draft,
      isAdmin,
      isDirty,
      isEditing,
      labels,
      patchDraft,
      registerConfig,
      registered,
      saveNow,
      startEdit,
      statusText,
      statusTone,
      unregisterConfig,
    ],
  );

  return <DonateInlineEditContext.Provider value={value}>{children}</DonateInlineEditContext.Provider>;
}

export function useDonateInlineEdit() {
  const ctx = useContext(DonateInlineEditContext);
  if (!ctx) throw new Error("useDonateInlineEdit must be used within DonateInlineEditProvider");
  return ctx;
}

export function useDonateInlineEditOptional() {
  return useContext(DonateInlineEditContext);
}
