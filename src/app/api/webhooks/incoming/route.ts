import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { verifyWebhookPayload } from "@/lib/webhooks";
import { prisma } from "@/lib/db";
import { normalizePath, toSlug } from "@/lib/slug";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-hekoti-signature");
  const ok = verifyWebhookPayload(body, env.WEBHOOK_SECRET, signature);
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

  const payload = JSON.parse(body) as {
    lang: string;
    title: string;
    contentMd: string;
    publish?: boolean;
  };
  const slug = toSlug(payload.title);
  const path = normalizePath(payload.lang || "en", [slug]);
  const page = await prisma.page.upsert({
    where: { path },
    update: { title: payload.title, contentMd: payload.contentMd, isPublished: Boolean(payload.publish) },
    create: {
      title: payload.title,
      contentMd: payload.contentMd,
      slug,
      lang: payload.lang || "en",
      path,
      isPublished: Boolean(payload.publish),
    },
  });
  return NextResponse.json({ ok: true, pageId: page.id });
}
