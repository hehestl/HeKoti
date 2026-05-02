import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth";
import { enabledLanguages } from "@/lib/i18n";
import { lintTelemetrySnippet } from "@/lib/telemetry-snippets";

const settingsSchema = z.object({
  defaultLanguage: z.string().refine((val) => enabledLanguages.includes(val), {
    message: "Invalid language",
  }),
  headHtml: z.string().max(100000).optional(),
  bodyHtml: z.string().max(100000).optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    const body = await request.json();
    const { defaultLanguage, headHtml, bodyHtml } = settingsSchema.parse(body);

    if (headHtml !== undefined) {
      const issues = lintTelemetrySnippet(headHtml);
      if (issues.length > 0) {
        return NextResponse.json({ ok: false, message: `headHtml rejected: ${issues[0]}` }, { status: 400 });
      }
    }
    if (bodyHtml !== undefined) {
      const issues = lintTelemetrySnippet(bodyHtml);
      if (issues.length > 0) {
        return NextResponse.json({ ok: false, message: `bodyHtml rejected: ${issues[0]}` }, { status: 400 });
      }
    }

    await prisma.globalSettings.upsert({
      where: { id: "default" },
      update: {
        defaultLanguage,
        ...(headHtml !== undefined ? { headHtml } : {}),
        ...(bodyHtml !== undefined ? { bodyHtml } : {}),
      },
      create: { id: "default", defaultLanguage, headHtml: headHtml ?? "", bodyHtml: bodyHtml ?? "" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Settings update failed";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
