"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { AdminPageRow, AdminPagesByLang } from "@/types/admin-workbench";

type Action =
  | { type: "setPagesForLang"; lang: string; pages: AdminPageRow[] }
  | { type: "upsertPage"; page: AdminPageRow }
  | { type: "removePage"; id: string; lang: string }
  | { type: "removePages"; ids: string[]; lang: string }
  | { type: "patchPage"; id: string; lang: string; patch: Partial<AdminPageRow> };

function pagesReducer(state: AdminPagesByLang, action: Action): AdminPagesByLang {
  switch (action.type) {
    case "setPagesForLang":
      return { ...state, [action.lang]: action.pages };
    case "upsertPage": {
      const list = state[action.page.lang] ?? [];
      const idx = list.findIndex((p) => p.id === action.page.id);
      const next = idx >= 0 ? list.map((p, i) => (i === idx ? action.page : p)) : [action.page, ...list];
      return { ...state, [action.page.lang]: next };
    }
    case "removePage": {
      const list = state[action.lang] ?? [];
      return { ...state, [action.lang]: list.filter((p) => p.id !== action.id) };
    }
    case "removePages": {
      const idSet = new Set(action.ids);
      const list = state[action.lang] ?? [];
      return { ...state, [action.lang]: list.filter((p) => !idSet.has(p.id)) };
    }
    case "patchPage": {
      const list = state[action.lang] ?? [];
      return {
        ...state,
        [action.lang]: list.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
      };
    }
    default:
      return state;
  }
}

type AdminNotesPagesContextValue = {
  pagesByLang: AdminPagesByLang;
  setPagesForLang: (lang: string, pages: AdminPageRow[]) => void;
  upsertPage: (page: AdminPageRow) => void;
  removePage: (id: string, lang: string) => void;
  removePages: (ids: string[], lang: string) => void;
  patchPageLocal: (id: string, lang: string, patch: Partial<AdminPageRow>) => void;
  getPage: (id: string, lang: string) => AdminPageRow | undefined;
};

const AdminNotesPagesContext = createContext<AdminNotesPagesContextValue | null>(null);

export function AdminNotesPagesProvider({
  initialPagesByLang,
  children,
}: {
  initialPagesByLang: AdminPagesByLang;
  children: ReactNode;
}) {
  const [pagesByLang, dispatch] = useReducer(pagesReducer, initialPagesByLang);

  const setPagesForLang = useCallback((lang: string, pages: AdminPageRow[]) => {
    dispatch({ type: "setPagesForLang", lang, pages });
  }, []);

  const upsertPage = useCallback((page: AdminPageRow) => {
    dispatch({ type: "upsertPage", page });
  }, []);

  const removePage = useCallback((id: string, lang: string) => {
    dispatch({ type: "removePage", id, lang });
  }, []);

  const patchPageLocal = useCallback((id: string, lang: string, patch: Partial<AdminPageRow>) => {
    dispatch({ type: "patchPage", id, lang, patch });
  }, []);

  const removePages = useCallback((ids: string[], lang: string) => {
    dispatch({ type: "removePages", ids, lang });
  }, []);

  const getPage = useCallback(
    (id: string, lang: string) => pagesByLang[lang]?.find((p) => p.id === id),
    [pagesByLang],
  );

  const value = useMemo(
    () => ({
      pagesByLang,
      setPagesForLang,
      upsertPage,
      removePage,
      removePages,
      patchPageLocal,
      getPage,
    }),
    [pagesByLang, setPagesForLang, upsertPage, removePage, removePages, patchPageLocal, getPage],
  );

  return <AdminNotesPagesContext.Provider value={value}>{children}</AdminNotesPagesContext.Provider>;
}

export function useAdminNotesPages() {
  const ctx = useContext(AdminNotesPagesContext);
  if (!ctx) throw new Error("useAdminNotesPages must be used within AdminNotesPagesProvider");
  return ctx;
}
