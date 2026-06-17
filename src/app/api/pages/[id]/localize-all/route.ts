import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth";
import { limitAiLocalize, requestIp } from "@/lib/auth-rate-limit";
import { prisma } from "@/lib/db";
import { localizePageToAllMissing } from "@/lib/page-localize";
import { findPageCounterpart } from "@/lib/page-counterparts";
import { getEnabledLanguages } from "@/lib/site-config";

const bodySchema = z.object({
  agentId: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminUser();
    const ip = requestIp(request);
    const rate = await limitAiLocalize(ip, user.id, "all");
    if (rate.blocked) {
      return NextResponse.json(
        { ok: false, message: "Too many localization requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
      );
    }

    const { id } = await params;
    const payload = bodySchema.parse(await request.json().catch(() => ({})));

    const source = await prisma.page.findUnique({
      where: { id },
      select: { id: true, originalId: true, path: true, lang: true },
    });
    if (!source) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }

    const enabled = await getEnabledLanguages();
    const missing: string[] = [];
    for (const lang of enabled) {
      if (lang === source.lang) continue;
      const hit = await findPageCounterpart(source, lang);
      if (!hit) missing.push(lang);
    }

    if (missing.length === 0) {
      return NextResponse.json({ ok: true, results: [], message: "All language versions already exist." });
    }

    const results = await localizePageToAllMissing({
      pageId: id,
      targetLangs: missing,
      editorId: user.id,
      agentId: payload.agentId,
    });

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk localization failed";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}