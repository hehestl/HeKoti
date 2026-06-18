import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth";
import { getEnabledLanguages } from "@/lib/site-config";
import { syncArchitectureMarkdown } from "@/lib/wiki-architecture-sync";

const bodySchema = z.object({
  lang: z.string().min(2).max(8),
  markdown: z.string().min(1),
  mirrorStructure: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireAdminUser();
    const payload = bodySchema.parse(await request.json());
    const enabled = await getEnabledLanguages();
    if (!enabled.includes(payload.lang)) {
      return NextResponse.json({ ok: false, message: "Invalid language." }, { status: 400 });
    }

    const result = await syncArchitectureMarkdown({
      lang: payload.lang,
      markdown: payload.markdown,
      editorId: user.id,
      mirrorStructure: payload.mirrorStructure,
    });

    return NextResponse.json({
      ok: true,
      opsApplied: result.opsApplied,
      pageCount: result.pages.length,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Sync failed" },
      { status: 400 },
    );
  }
}
