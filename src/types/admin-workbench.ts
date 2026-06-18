export type AdminActivityTab = "posts" | "ai" | "settings" | "tech" | "architecture" | "trash";

export type AdminPageRow = {
  id: string;
  title: string;
  path: string;
  contentMd: string;
  isPublished: boolean;
  navOrder: number;
  lang: string;
  icon: string | null;
  isCategory: boolean;
};

export type AdminOpenTab = {
  pageId: string;
  lang: string;
  title: string;
  dirty: boolean;
};

export type AdminContextMenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  onClick?: () => void;
};

export type AdminPagesByLang = Record<string, AdminPageRow[]>;

export type AdminWorkbenchUiState = {
  previewVisible: boolean;
  splitRatio: number;
  statusText: string;
  statusTone: "neutral" | "error";
};
