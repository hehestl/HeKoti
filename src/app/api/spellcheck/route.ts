import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth";
import { env } from "@/lib/env";

const bodySchema = z.object({
  text: z.string().min(1).max(50_000),
  language: z.string().optional().default("auto"),
});

/**
 * Proxies grammar/spelling checks to a self-hosted LanguageTool instance.
 * Requires admin session. Configure LANGUAGETOOL_URL in the environment.
 */
export async function POST(request: Request) {
  try {
    await requireAdminUser();
    if (!env.LANGUAGETOOL_URL?.trim()) {
      return NextResponse.json(
        { ok: false, message: "LANGUAGETOOL_URL is not configured." },
        { status: 503 },
      );
    }
    const payload = bodySchema.parse(await request.json());
    const base = env.LANGUAGETOOL_URL.replace(/\/$/, "");
    const params = new URLSearchParams();
    params.set("text", payload.text);
    params.set("language", payload.language);

    const res = await fetch(`${base}/v2/check`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, message: `LanguageTool error: ${res.status}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as unknown;
    return NextResponse.json({ ok: true, result: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Spellcheck failed";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
