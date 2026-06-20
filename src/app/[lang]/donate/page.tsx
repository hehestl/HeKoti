import { WikiBreadcrumbs } from "@/components/wiki-breadcrumbs";
import { DonatePageView } from "@/components/donate-page-view";
import { WikiPublicShell } from "@/components/wiki-public-shell";
import { getDonateConfig } from "@/lib/donate-config";
import { safeLang, getDictionary } from "@/lib/i18n";
import { staticBreadcrumbChain } from "@/lib/wiki-collection";
import { getWikiShellProps } from "@/lib/wiki-shell-props";

export default async function DonatePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: inputLang } = await params;
  const lang = safeLang(inputLang);
  const [dict, shell, donateConfig] = await Promise.all([
    getDictionary(lang),
    getWikiShellProps(lang),
    getDonateConfig(),
  ]);

  const donateEditLabels = {
    edit: dict.admin.donate.edit,
    exitEdit: dict.admin.donate.exitEdit,
    save: dict.admin.donate.save,
    cancel: dict.common.cancel,
    saved: dict.admin.donate.saved,
    saving: dict.admin.donate.saving,
    failed: dict.admin.donate.failed,
    dirtyConfirm: dict.admin.donate.dirtyConfirm,
  };

  return (
    <WikiPublicShell
      {...shell}
      variant="compact"
      initialDonateConfig={donateConfig}
      donateEditLabels={donateEditLabels}
      languagePathSuffix="/donate"
    >
      <WikiBreadcrumbs
        items={staticBreadcrumbChain(lang, dict.collection.allCollections, dict.admin.donate.title)}
        pagePath={`/${lang}/donate`}
      />
      <DonatePageView initialConfig={donateConfig} dict={dict} />
    </WikiPublicShell>
  );
}
