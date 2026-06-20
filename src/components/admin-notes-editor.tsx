"use client";

import type { ReactNode } from "react";
import {
  AdminPostsEditorProvider,
  type AdminPagesStore,
} from "@/components/admin-posts-editor";
import { useAdminNotesPages } from "@/components/admin-workbench/admin-notes-pages-provider";
import type { Dictionary } from "@/lib/i18n";

export function AdminNotesEditorProvider({
  uiLang,
  dict,
  initialActivePath,
  onStatusChange,
  previewVisible,
  splitRatio,
  onSplitRatioChange,
  children,
}: {
  uiLang: string;
  dict: Dictionary;
  initialActivePath?: string;
  onStatusChange: (text: string, tone: "neutral" | "error") => void;
  previewVisible: boolean;
  splitRatio: number;
  onSplitRatioChange: (ratio: number) => void;
  children: ReactNode;
}) {
  const store = useAdminNotesPages();
  return (
    <AdminPostsEditorProvider
      uiLang={uiLang}
      enabledLanguages={[uiLang]}
      dict={dict}
      initialActivePath={initialActivePath}
      onStatusChange={onStatusChange}
      previewVisible={previewVisible}
      splitRatio={splitRatio}
      onSplitRatioChange={onSplitRatioChange}
      variant="notes"
      pagesStore={store as AdminPagesStore}
    >
      {children}
    </AdminPostsEditorProvider>
  );
}
