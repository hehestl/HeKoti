import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth";
import { limitAiLocalize, requestIp } from "@/lib/auth-rate-limit";
import { localizePageToLanguage } from "@/lib/page-localize";
import { getEnabledLanguages } from "@/lib/site-config";

const bodySchema = z.object({
  targetLang: z.string().min(2).max(12),
  agentId: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminUser();
    const ip = requestIp(request);
    const rate = await limitAiLocalize(ip, user.id, "single");
    if (rate.blocked) {
      return NextResponse.json(
        { ok: false, message: "Too many localization requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
      );
    }

    const { id } = await params;
    const payload = bodySchema.parse(await request.json());
    const enabled = await getEnabledLanguages();
    if (!enabled.includes(payload.targetLang)) {
      return NextResponse.json({ ok: false, message: "Target language is not enabled." }, { status: 400 });
    }

    const result = await localizePageToLanguage({
      pageId: id,
      targetLang: payload.targetLang,
      editorId: user.id,
      agentId: payload.agentId,
    });

    return NextResponse.json({
      ok: true,
      created: result.created,
      page: {
        id: result.page.id,
        title: result.page.title,
        path: result.page.path,
        lang: result.page.lang,
        contentMd: result.page.contentMd,
        isPublished: result.page.isPublished,
        navOrder: result.page.navOrder,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Localization failed";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}