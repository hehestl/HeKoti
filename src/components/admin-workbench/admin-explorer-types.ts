import type { AdminPageRow } from "@/types/admin-workbench";
import type { WikiIconKey } from "@/lib/wiki-icon-presets";

export type AdminExplorerActions = {
  onSelectPage: (page: AdminPageRow) => void;
  onRename: (id: string, lang: string) => void;
  onDelete: (id: string, lang: string) => void;
  onTogglePublish?: (id: string, lang: string) => void;
  onBulkSetPublished?: (pages: AdminPageRow[], publish: boolean) => void;
  onMoveByDrop: (
    fromId: string,
    lang: string,
    target:
      | { kind: "page"; targetId: string; mode: "before" | "after" | "inside" }
      | { kind: "folder"; pathKey: string; mode: "inside" }
      | { kind: "root" },
  ) => void;
  onAddChild: (id: string, lang: string) => void;
  onAddSibling: (id: string, lang: string) => void;
  onCreateAtRoot: (lang: string) => void;
  onCreateCategory: (lang: string, parentParts: string[]) => void;
  onRefresh: (lang: string | "all") => void;
  onChangeIcon: (id: string, lang: string, icon: WikiIconKey | null) => void;
  onLiftUp: (id: string, lang: string) => void;
  onLocalizeBranch: (id: string, lang: string) => void;
  onLocalizeAll: (id: string, lang: string) => void;
  onOpenPublic: (page: AdminPageRow) => void;
  onOpenHistory?: (page: AdminPageRow) => void;
  activePageId?: string;
  activePageLang?: string;
};
