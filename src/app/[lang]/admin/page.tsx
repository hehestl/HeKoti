import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getSessionUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/user-role";
import { ensureDefaultChannel } from "@/lib/agent-chat";
import { prisma } from "@/lib/db";
import { safeLangAsync, getDictionary, getGlobalSettings } from "@/lib/i18n";
import { getSiteConfig } from "@/lib/site-config";
import { getAppVersion } from "@/lib/version";
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
  const [{ enabledLanguages, aiAgents, knownLanguages }, lang] = await Promise.all([
    getSiteConfig(),
    safeLangAsync(inputLang),
  ]);
  const dict = await getDictionary(lang);
  const user = await getSessionUser();
  if (!user) redirect(`/${lang}/login`);
  if (!isAdminRole(user.role)) redirect(`/${lang}`);

  const initialTotpStatus =
    user.isTotpEnabled ? "enabled" : user.totpSecret ? "pending" : "off";

  const pagesByLangEntries = await Promise.all(
    enabledLanguages.map(async (pageLang) => {
      const rows = await prisma.page.findMany({
        where: { lang: pageLang },
        orderBy: [{ navOrder: "asc" }, { updatedAt: "desc" }],
        take: 100,
        select: { id: true, title: true, path: true, contentMd: true, isPublished: true, navOrder: true },
      });
      const pages: AdminPageRow[] = rows.map((r) => ({ ...r, lang: pageLang }));
      return [pageLang, pages] as const;
    }),
  );
  const initialPagesByLang: AdminPagesByLang = Object.fromEntries(pagesByLangEntries);

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

  const settings = await getGlobalSettings();
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
  const initialTab = rawTab === "posts" || rawTab === "ai" || rawTab === "settings" || rawTab === "tech" ? rawTab : "posts";
  const initialActivePath =
    rawActivePath && rawActivePath.startsWith(`/${lang}/`) ? rawActivePath : undefined;

  return (
    <main className="admin-page-root">
      <Suspense fallback={<div style={{ color: "var(--muted)", padding: 12 }}>{dict.common.loading}</div>}>
        <AdminDashboard
          lang={lang}
          initialLogin={user.email}
          initialTotpStatus={initialTotpStatus}
          initialPagesByLang={initialPagesByLang}
          initialMessages={initialMessages}
          initialActiveAgentId={channel.activeAgentId}
          dict={dict}
          defaultLanguage={settings.defaultLanguage}
          headHtml={settings.headHtml}
          bodyHtml={settings.bodyHtml}
          enabledLanguages={enabledLanguages}
          knownLanguages={knownLanguages}
          aiAgents={agentRows}
          tech={tech}
          initialTab={initialTab}
          initialActivePath={initialActivePath}
        />
      </Suspense>
    </main>
  );
}
