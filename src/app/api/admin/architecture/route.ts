import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { getEnabledLanguages } from "@/lib/site-config";
import { serializeArchitectureForLang } from "@/lib/wiki-architecture-sync";

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const enabled = await getEnabledLanguages();
    const langParam = searchParams.get("lang");
    const lang = langParam && enabled.includes(langParam) ? langParam : enabled[0] ?? "en";
    const markdown = await serializeArchitectureForLang(lang);
    return NextResponse.json({ ok: true, lang, markdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized.";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
