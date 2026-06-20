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
  };
}
