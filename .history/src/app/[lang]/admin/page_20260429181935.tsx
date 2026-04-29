import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getSessionUser } from "@/lib/auth";
import { ensureDefaultChannel } from "@/lib/agent-chat";
import { prisma } from "@/lib/db";
import { enabledLanguages, safeLang, getDictionary, getDefaultLanguage } from "@/lib/i18n";

export default async function AdminPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: inputLang } = await params;
  const lang = safeLang(inputLang);
  const dict = await getDictionary(lang);
  const user = await getSessionUser();
  if (!user) redirect(`/${lang}/login`);

  const initialTotpStatus =
    user.isTotpEnabled ? "enabled" : user.totpSecret ? "pending" : "off";

  const pages = await prisma.page.findMany({
    where: { lang },
    orderBy: [{ navOrder: "asc" }, { updatedAt: "desc" }],
    take: 100,
    select: { id: true, title: true, path: true, contentMd: true, isPublished: true, navOrder: true },
  });
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

  const defaultLanguage = await getDefaultLanguage();

  return (
    <main style={{ padding: 12 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 10 }}>{dict.common.admin}</h1>
        <Suspense fallback={<div style={{ color: "var(--muted)" }}>{dict.common.loading}</div>}>
          <AdminDashboard
            lang={lang}
            initialLogin={user.email}
            initialTotpStatus={initialTotpStatus}
            initialPages={pages}
            initialMessages={initialMessages}
            initialActiveAgentId={channel.activeAgentId}
            dict={dict}
            defaultLanguage={defaultLanguage}
            enabledLanguages={enabledLanguages}
          />
        </Suspense>
      </div>
    </main>
  );
}
