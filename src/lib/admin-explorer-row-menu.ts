import type { Dictionary } from "@/lib/i18n";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";
import type { AdminContextMenuItem, AdminPageRow, AdminPagesByLang } from "@/types/admin-workbench";
import type { AdminExplorerActions } from "@/components/admin-workbench/admin-explorer-types";

export function buildAdminExplorerRowMenuItems(
  page: AdminPageRow,
  menuX: number,
  menuY: number,
  opts: {
    dict: Dictionary;
    isNotes: boolean;
    pagesByLang: AdminPagesByLang;
    actions: AdminExplorerActions;
    onOpenIconPicker: (id: string, lang: string, x: number, y: number) => void;
  },
): AdminContextMenuItem[] {
  const { dict, isNotes, pagesByLang, actions, onOpenIconPicker } = opts;
  const wb = dict.admin.workbench;
  const childCount = (pagesByLang[page.lang] ?? []).filter(
    (p) => p.path !== page.path && p.path.startsWith(`${page.path}/`),
  ).length;
  const deleteLabel =
    childCount > 0
      ? dict.admin.posts.deleteWithChildren.replace("{count}", String(childCount))
      : dict.admin.posts.delete;

  return [
    { id: "open", label: wb.openPage, onClick: () => actions.onSelectPage(page) },
    { id: "sep0", label: "", separator: true },
    { id: "sibling", label: wb.createArticle, onClick: () => actions.onAddSibling(page.id, page.lang) },
    { id: "child", label: dict.admin.posts.addChild, onClick: () => actions.onAddChild(page.id, page.lang) },
    {
      id: "cat",
      label: wb.createCategory,
      onClick: () => actions.onCreateCategory(page.lang, pathSegmentsAfterLang(page.path, page.lang)),
    },
    ...(page.systemKey
      ? []
      : [{ id: "rename", label: dict.admin.posts.rename, onClick: () => actions.onRename(page.id, page.lang) }]),
    {
      id: "icon",
      label: dict.admin.posts.changeIcon,
      onClick: () => onOpenIconPicker(page.id, page.lang, menuX, menuY),
    },
    ...(actions.onTogglePublish
      ? [
          {
            id: "publish",
            label: page.isPublished ? wb.unpublish : wb.publish,
            onClick: () => actions.onTogglePublish!(page.id, page.lang),
          },
        ]
      : []),
    ...(!isNotes ? [{ id: "public", label: wb.openOnSite, onClick: () => actions.onOpenPublic(page) }] : []),
    { id: "lift", label: dict.admin.posts.upLevel, onClick: () => actions.onLiftUp(page.id, page.lang) },
    ...(!isNotes
      ? [
          { id: "sep1", label: "", separator: true },
          {
            id: "loc-branch",
            label: dict.admin.posts.aiLocalizeBranch,
            onClick: () => actions.onLocalizeBranch(page.id, page.lang),
          },
          {
            id: "loc-all",
            label: dict.admin.posts.aiLocalizeAll,
            onClick: () => actions.onLocalizeAll(page.id, page.lang),
          },
        ]
      : []),
    { id: "sep2", label: "", separator: true },
    ...(page.systemKey
      ? [{ id: "protected", label: dict.admin.notes.systemProtected, disabled: true }]
      : [{ id: "delete", label: deleteLabel, danger: true, onClick: () => actions.onDelete(page.id, page.lang) }]),
  ];
}
