import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin-dashboard";
import { redirectToLogin } from "@/lib/auth-routes";
import { getSessionUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/user-role";
import { ensureDefaultChannel } from "@/lib/agent-chat";
import { prisma } from "@/lib/db";
import { getDictionary, getGlobalSettings, getAvailableMessageLocales } from "@/lib/i18n";
import { getSiteConfig } from "@/lib/site-config";
import { getSiteMetadataForAdmin } from "@/lib/site-metadata";
import { getAppVersion } from "@/lib/version";
import { notesPageWhere, wikiPageWhere } from "@/lib/page-query";
import { ensureSystemNotes } from "@/lib/system-notes";
import type { AdminPageRow, AdminPagesByLang } from "@/types/admin-workbench";
import pkg from "../../../../package.json";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ tab?: string; activePath?: string }>;
}) {
  const { lang: inputLang } = await params;
  const { tab: rawTab, activePath: rawActivePath } = await searchParams;
  const [{ enabledLanguages, aiAgents, knownLanguages }, settings, siteSeo] = await Promise.all([
    getSiteConfig(),
    getGlobalSettings(),
    getSiteMetadataForAdmin(),
  ]);
  const adminLanguage = settings.adminLanguage;
  if (inputLang !== adminLanguage) {
    const qs = new URLSearchParams();
    if (rawTab) qs.set("tab", rawTab);
    if (rawActivePath) qs.set("activePath", rawActivePath);
    const q = qs.toString();
    redirect(`/${adminLanguage}/admin${q ? `?${q}` : ""}`);
  }
  const dict = await getDictionary(adminLanguage);
  const user = await getSessionUser();
  if (!user) redirectToLogin(adminLanguage, `/${adminLanguage}/admin`);
  if (!isAdminRole(user.role)) redirect(`/${adminLanguage}`);

  const initialTotpStatus =
    user.isTotpEnabled ? "enabled" : user.totpSecret ? "pending" : "off";

  await ensureSystemNotes(adminLanguage);

  const pageSelect = {
    id: true,
    title: true,
    path: true,
    contentMd: true,
    isPublished: true,
    showToc: true,
    navOrder: true,
    icon: true,
    slug: true,
    isCategory: true,
    scope: true,
    systemKey: true,
  } as const;

  const pagesByLangEntries = await Promise.all(
    enabledLanguages.map(async (pageLang) => {
      const rows = await prisma.page.findMany({
        where: { lang: pageLang, ...wikiPageWhere },
        orderBy: [{ navOrder: "asc" }, { updatedAt: "desc" }],
        take: 500,
        select: pageSelect,
      });
      const pages: AdminPageRow[] = rows.map((r) => ({
        ...r,
        lang: pageLang,
        icon: r.icon ?? null,
        isCategory: r.isCategory ?? false,
        showToc: r.showToc ?? true,
        scope: r.scope,
        systemKey: r.systemKey,
      }));
      return [pageLang, pages] as const;
    }),
  );
  const initialPagesByLang: AdminPagesByLang = Object.fromEntries(pagesByLangEntries);

  const noteRows = await prisma.page.findMany({
    where: { lang: adminLanguage, ...notesPageWhere },
    orderBy: [{ navOrder: "asc" }, { updatedAt: "desc" }],
    take: 300,
    select: pageSelect,
  });
  const initialNotesByLang: AdminPagesByLang = {
    [adminLanguage]: noteRows.map((r) => ({
      ...r,
      lang: adminLanguage,
      icon: r.icon ?? null,
      isCategory: r.isCategory ?? false,
      showToc: r.showToc ?? true,
      scope: r.scope,
      systemKey: r.systemKey,
    })),
  };

  const channel = await ensureDefaultChannel();
  const agentMessages = await prisma.agentMessage.findMany({
    where: { channelId: channel.id },
    orderBy: { createdAt: "asc" },
    take: 80,
  });
  const initialMessages = agentMessages.map((item) => ({
    id: item.id,
    role: item.role,
    content: item.content,
    createdAt: item.createdAt.toISOString(),
  }));

  const messageLocales = getAvailableMessageLocales();
  const tech = {
    version: getAppVersion(),
    next: (pkg.dependencies as Record<string, string | undefined>)?.next ?? "",
    react: (pkg.dependencies as Record<string, string | undefined>)?.react ?? "",
    prisma: (pkg.dependencies as Record<string, string | undefined>)?.prisma ?? "",
    db: "PostgreSQL",
  };
  const agentRows = aiAgents.map((a) => ({
    id: a.id,
    title: a.title,
    enabled: a.enabled,
    hasApi: Boolean(a.apiBaseUrl && a.apiKeyEnv),
  }));
  const initialTab =
    rawTab === "posts" ||
    rawTab === "notes" ||
    rawTab === "ai" ||
    rawTab === "settings" ||
    rawTab === "tech" ||
    rawTab === "architecture" ||
    rawTab === "trash"
      ? rawTab
      : "posts";
  const initialActivePath =
    rawActivePath && rawActivePath.startsWith(`/${adminLanguage}/`) ? rawActivePath : undefined;

  return (
    <main className="admin-page-root">
      <Suspense fallback={<div style={{ color: "var(--muted)", padding: 12 }}>{dict.common.loading}</div>}>
        <AdminDashboard
          lang={adminLanguage}
          initialLogin={user.email}
          initialTotpStatus={initialTotpStatus}
          initialPagesByLang={initialPagesByLang}
          initialNotesByLang={initialNotesByLang}
          initialMessages={initialMessages}
          initialActiveAgentId={channel.activeAgentId}
          dict={dict}
          defaultLanguage={settings.defaultLanguage}
          headHtml={settings.headHtml}
          bodyHtml={settings.bodyHtml}
          wikiTreeGuideColor={settings.wikiTreeGuideColor}
          siteTitle={siteSeo.titleFromEnv ? siteSeo.title : siteSeo.dbTitle}
          siteDescription={siteSeo.descriptionFromEnv ? siteSeo.description : siteSeo.dbDescription}
          robotsIndexSite={siteSeo.robotsIndexFromEnv ? siteSeo.robotsIndexSite : siteSeo.dbRobotsIndexSite}
          aiCrawlersAllow={siteSeo.aiCrawlersFromEnv ? siteSeo.aiCrawlersAllow : siteSeo.dbAiCrawlersAllow}
          llmsTxtExtra={siteSeo.llmsTxtExtraFromEnv ? siteSeo.llmsTxtExtra : siteSeo.dbLlmsTxtExtra}
          titleFromEnv={siteSeo.titleFromEnv}
          descriptionFromEnv={siteSeo.descriptionFromEnv}
          robotsIndexFromEnv={siteSeo.robotsIndexFromEnv}
          aiCrawlersFromEnv={siteSeo.aiCrawlersFromEnv}
          llmsTxtExtraFromEnv={siteSeo.llmsTxtExtraFromEnv}
          enabledLanguages={enabledLanguages}
          knownLanguages={knownLanguages}
          initialAdminLanguage={adminLanguage}
          messageLocales={messageLocales}
          aiAgents={agentRows}
          tech={tech}
          initialTab={initialTab}
          initialActivePath={initialActivePath}
        />
      </Suspense>
    </main>
  );
}
