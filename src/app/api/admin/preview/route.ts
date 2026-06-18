import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth";
import { renderWikiHtml } from "@/lib/markdown";

const bodySchema = z.object({
  markdown: z.string(),
  lang: z.string().min(2).max(8),
});

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid body" }, { status: 400 });
    }
    const html = await renderWikiHtml(parsed.data.markdown, parsed.data.lang);
    return NextResponse.json({ ok: true, html });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Preview failed";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
