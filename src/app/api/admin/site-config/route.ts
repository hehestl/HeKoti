import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildAgentTogglesJson,
  buildEnabledLanguagesJson,
  getAiAgents,
  getEnabledLanguages,
  getSiteConfig,
  knownLanguages,
} from "@/lib/site-config";

const patchSchema = z.object({
  enabledLanguages: z.array(z.string().min(2).max(12)).optional(),
  aiAgents: z
    .array(
      z.object({
        id: z.string().min(1),
        enabled: z.boolean(),
      }),
    )
    .optional(),
});

export async function GET() {
  try {
    await requireAdminUser();
    const config = await getSiteConfig();
    return NextResponse.json({
      ok: true,
      knownLanguages,
      enabledLanguages: config.enabledLanguages,
      aiAgents: config.aiAgents.map((a) => ({
        id: a.id,
        title: a.title,
        enabled: a.enabled,
        hasApi: Boolean(a.apiBaseUrl && a.apiKeyEnv),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load site config";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    const body = patchSchema.parse(await request.json());

    if (body.enabledLanguages) {
      const invalid = body.enabledLanguages.filter((l) => !knownLanguages.includes(l));
      if (invalid.length > 0) {
        return NextResponse.json(
          { ok: false, message: `Unknown languages: ${invalid.join(", ")}` },
          { status: 400 },
        );
      }
      if (body.enabledLanguages.length === 0) {
        return NextResponse.json({ ok: false, message: "At least one language must stay enabled." }, { status: 400 });
      }
    }

    const currentAgents = await getAiAgents();
    const update: { enabledLanguagesJson?: string; aiAgentsJson?: string } = {};

    if (body.enabledLanguages) {
      update.enabledLanguagesJson = buildEnabledLanguagesJson(body.enabledLanguages);
    }
    if (body.aiAgents) {
      const toggleMap = new Map(body.aiAgents.map((a) => [a.id, a.enabled]));
      const merged = currentAgents.map((a) => ({
        ...a,
        enabled: toggleMap.has(a.id) ? toggleMap.get(a.id)! : a.enabled,
      }));
      update.aiAgentsJson = buildAgentTogglesJson(merged);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, message: "Nothing to update." }, { status: 400 });
    }

    await prisma.globalSettings.upsert({
      where: { id: "default" },
      update,
      create: { id: "default", ...update },
    });

    const config = await getSiteConfig();
    return NextResponse.json({
      ok: true,
      enabledLanguages: config.enabledLanguages,
      aiAgents: config.aiAgents.map((a) => ({
        id: a.id,
        title: a.title,
        enabled: a.enabled,
        hasApi: Boolean(a.apiBaseUrl && a.apiKeyEnv),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Site config update failed";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}