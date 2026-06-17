import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth";
import { limitAiLocalize, requestIp } from "@/lib/auth-rate-limit";
import { localizeBranchToMissing } from "@/lib/page-localize";
import { getEnabledLanguages } from "@/lib/site-config";

const bodySchema = z.object({
  agentId: z.string().optional(),
  targetLangs: z.array(z.string().min(2).max(12)).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminUser();
    const ip = requestIp(request);
    const rate = await limitAiLocalize(ip, user.id, "branch");
    if (rate.blocked) {
      return NextResponse.json(
        { ok: false, message: "Too many localization requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
      );
    }

    const { id } = await params;
    const payload = bodySchema.parse(await request.json().catch(() => ({})));

    if (payload.targetLangs) {
      const enabled = await getEnabledLanguages();
      const invalid = payload.targetLangs.filter((l) => !enabled.includes(l));
      if (invalid.length > 0) {
        return NextResponse.json(
          { ok: false, message: `Languages not enabled: ${invalid.join(", ")}` },
          { status: 400 },
        );
      }
    }

    const { pageCount, results } = await localizeBranchToMissing({
      rootPageId: id,
      editorId: user.id,
      agentId: payload.agentId,
      targetLangs: payload.targetLangs,
    });

    const created = results.filter((r) => r.ok && r.created).length;
    const skipped = results.filter((r) => r.ok && !r.created && r.message === "Already exists.").length;
    const failed = results.filter((r) => !r.ok).length;

    return NextResponse.json({
      ok: true,
      pageCount,
      summary: { created, skipped, failed, total: results.length },
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Branch localization failed";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}