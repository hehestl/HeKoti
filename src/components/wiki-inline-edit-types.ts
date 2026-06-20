export type EditableWikiPage = {
  id: string;
  lang: string;
  title: string;
  contentMd: string;
  path: string;
  systemKey: string | null;
  isPublished: boolean;
  showToc: boolean;
};

export type WikiInlineEditLabels = {
  mascotEdit: string;
  mascotExitEdit: string;
  save: string;
  cancel: string;
  saved: string;
  saving: string;
  failed: string;
  draftBadge: string;
  publish: string;
  unpublish: string;
  dirtyConfirm: string;
};

export type WikiPageBrief = { path: string; title: string };
