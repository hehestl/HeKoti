import { getSessionUser } from "@/lib/auth";
import { getDictionary, safeLangAsync } from "@/lib/i18n";
import { isAdminRole } from "@/lib/user-role";
import { getEnabledLanguages } from "@/lib/site-config";
import { languageSwitcherOptions } from "@/lib/language-labels";
import { getAppVersion } from "@/lib/version";

export async function getWikiShellProps(inputLang: string) {
  const langs = await getEnabledLanguages();
  const lang = await safeLangAsync(inputLang);
  const dict = await getDictionary(lang);
  const user = await getSessionUser();
  const isAdmin = !!user && isAdminRole(user.role);
  return {
    lang,
    langs: languageSwitcherOptions(langs),
    searchPlaceholder: dict.home.searchPlaceholder,
    searchLabels: {
      suggestionsAria: dict.search.suggestionsAria,
      loading: dict.search.loading,
      noSuggestions: dict.search.noSuggestions,
      viewAllResults: dict.search.viewAllResults,
      loginHint: dict.search.loginHint,
      suggestionsError: dict.search.suggestionsError,
    },
    languageAria: dict.common.languageAria,
    isAdmin,
    appVersion: isAdmin ? getAppVersion() : undefined,
    adminLabel: dict.admin.workbench.mascotAdmin ?? dict.common.administration,
    versionLabel: dict.admin.workbench.mascotVersion ?? "Version",
    inlineEditLabels: {
      mascotEdit: dict.admin.workbench.mascotEdit,
      mascotExitEdit: dict.admin.workbench.mascotExitEdit,
      save: dict.admin.workbench.inlineEditSave,
      cancel: dict.admin.workbench.inlineEditCancel,
      saved: dict.admin.workbench.inlineEditSaved,
      saving: dict.admin.workbench.inlineEditSaving,
      failed: dict.admin.workbench.inlineEditFailed,
      draftBadge: dict.admin.workbench.inlineEditDraftBadge,
      publish: dict.admin.workbench.publish,
      unpublish: dict.admin.workbench.unpublish,
      dirtyConfirm: dict.admin.workbench.dirtyConfirm,
    },
    diagramCopyLabel: dict.article.diagramCopy,
    diagramCopiedLabel: dict.article.diagramCopied,
    homeInlineEditLabels: {
      dragHint: dict.home.inlineEdit.dragHint,
      makeCategory: dict.home.inlineEdit.makeCategory,
      implicitHint: dict.home.inlineEdit.implicitHint,
      leafReadOnly: dict.home.inlineEdit.leafReadOnly,
      systemReadOnly: dict.home.inlineEdit.systemReadOnly,
      clearIcon: dict.admin.posts.clearIcon,
      save: dict.admin.workbench.inlineEditSave,
      cancel: dict.admin.workbench.inlineEditCancel,
      saved: dict.admin.workbench.inlineEditSaved,
      saving: dict.admin.workbench.inlineEditSaving,
      failed: dict.admin.workbench.inlineEditFailed,
      dirtyConfirm: dict.admin.workbench.dirtyConfirm,
      mascotEdit: dict.admin.workbench.mascotEdit,
      mascotExitEdit: dict.admin.workbench.mascotExitEdit,
    },
  };
}
