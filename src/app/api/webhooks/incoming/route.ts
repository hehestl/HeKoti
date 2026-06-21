import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { verifyWebhookPayload } from "@/lib/webhooks";
import { prisma } from "@/lib/db";
import { normalizePath, toSlug } from "@/lib/slug";
import { applyPageSearchText } from "@/lib/page-search-index";
import { invalidateSearchLangCache } from "@/lib/cache";

// Maximum allowed payload size (1MB)
const MAX_PAYLOAD_SIZE = 1024 * 1024;

// Schema for webhook payload validation
const webhookPayloadSchema = z.object({
  lang: z.string().min(2).max(8),
  title: z.string().min(1).max(500),
  contentMd: z.string().max(1000000),
  publish: z.boolean().optional(),
});

export async function POST(request: Request) {
  // Check content length
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
    return NextResponse.json({ ok: false, message: "Payload too large." }, { status: 413 });
  }

  const body = await request.text();
  
  // Check body size after reading
  if (body.length > MAX_PAYLOAD_SIZE) {
    return NextResponse.json({ ok: false, message: "Payload too large." }, { status: 413 });
  }

  const signature = request.headers.get("x-hekoti-signature");
  const ok = verifyWebhookPayload(body, env.WEBHOOK_SECRET, signature);
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

  // Parse and validate payload
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  const validationResult = webhookPayloadSchema.safeParse(payload);
  if (!validationResult.success) {
    const errorMessages = validationResult.error.issues
      .map((issue) => `${String(issue.path.join("."))}: ${issue.message}`)
      .join(", ");
    return NextResponse.json({ ok: false, message: `Invalid payload: ${errorMessages}` }, { status: 400 });
  }

  const validatedPayload = validationResult.data;
  const slug = toSlug(validatedPayload.title);
  const path = normalizePath(validatedPayload.lang, [slug]);

  const existing = await prisma.page.findFirst({
    where: { lang: validatedPayload.lang, path, deletedAt: null },
  });
  const page = existing
    ? await prisma.page.update({
        where: { id: existing.id },
        data: {
          title: validatedPayload.title,
          contentMd: validatedPayload.contentMd,
          isPublished: Boolean(validatedPayload.publish),
          ...applyPageSearchText({
            title: validatedPayload.title,
            contentMd: validatedPayload.contentMd,
            scope: existing.scope,
          }),
        },
      })
    : await prisma.page.create({
        data: {
          title: validatedPayload.title,
          contentMd: validatedPayload.contentMd,
          slug,
          lang: validatedPayload.lang,
          path,
          isPublished: Boolean(validatedPayload.publish),
          ...applyPageSearchText({
            title: validatedPayload.title,
            contentMd: validatedPayload.contentMd,
            scope: "WIKI",
          }),
        },
      });
  await invalidateSearchLangCache(validatedPayload.lang);
  return NextResponse.json({ ok: true, pageId: page.id });
}
