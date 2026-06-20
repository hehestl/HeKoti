"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  patchDraft: (next: DonateConfig) => void;
  isDirty: boolean;
};

const DonateInlineEditContext = createContext<DonateInlineEditContextValue | null>(null);

export function DonateInlineEditProvider({
  isAdmin,
  labels,
  initialConfig,
  children,
}: {
  isAdmin: boolean;
  labels: DonateInlineEditLabels;
  initialConfig: DonateConfig;
  children: ReactNode;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<DonateConfig | null>(initialConfig);
  const [baseline, setBaseline] = useState<DonateConfig | null>(initialConfig);
  const [draft, setDraft] = useState<DonateConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<"neutral" | "error">("neutral");
  const [registered, setRegistered] = useState(true);
  const lastConfigRef = useRef<DonateConfig>(initialConfig);
  const isEditingRef = useRef(false);
  isEditingRef.current = isEditing;

  useEffect(() => {
    lastConfigRef.current = initialConfig;
    if (!isEditingRef.current) {
      setConfig(initialConfig);
      setBaseline(initialConfig);
      setRegistered(true);
    }
  }, [initialConfig]);

  const setStatus = useCallback((text: string, tone: "neutral" | "error" = "neutral") => {
    setStatusText(text);
    setStatusTone(tone);
  }, []);

  const registerConfig = useCallback(
    (next: DonateConfig) => {
      lastConfigRef.current = next;
      setRegistered(true);
      if (!isEditingRef.current) {
        setConfig(next);
        setBaseline(next);
        setDraft(null);
        return;
      }
      setConfig(next);
      setBaseline(next);
    },
    [],
  );

  const unregisterConfig = useCallback(() => {
    setRegistered(false);
    setConfig(null);
    setBaseline(null);
    if (!isEditingRef.current) setDraft(null);
  }, []);

  const isDirty = useMemo(() => {
    if (!draft || !baseline) return false;
    return !donateConfigEquals(draft, baseline);
  }, [baseline, draft]);

  const startEdit = useCallback(() => {
    const source = config ?? lastConfigRef.current;
    if (!isAdmin || !source) return;
    const next = {
      platforms: source.platforms.map((p) => ({ ...p })),
      crypto: source.crypto.map((c) => ({ ...c })),
      contacts: source.contacts.map((c) => ({ ...c })),
    };
    setDraft(next);
    setBaseline(next);
    setIsEditing(true);
    isEditingRef.current = true;
    setStatusText("");
    setStatusTone("neutral");
  }, [config, isAdmin]);

  const cancelEdit = useCallback(() => {
    if (isDirty && !window.confirm(labels.dirtyConfirm)) return;
    isEditingRef.current = false;
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
      lastConfigRef.current = data.config;
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
  }, [baseline, draft, labels.failed, labels.saved, labels.saving, router, setStatus]);

  const patchDraft = useCallback((next: DonateConfig) => {
    setDraft(next);
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
