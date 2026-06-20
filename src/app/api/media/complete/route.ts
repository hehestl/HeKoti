import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth";
import { createMediaAssetRecord, toMediaAssetDto } from "@/lib/media-assets";
import { env } from "@/lib/env";
import { getMediaStorage, validateVideoMeta } from "@/lib/media-storage";

const bodySchema = z.object({
  storageKey: z.string().min(1),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.coerce.number().int().positive(),
  publicUrl: z.string().min(1),
});

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Complete failed";
  return env.NODE_ENV === "production" ? "Complete failed" : message;
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminUser();
    const body = bodySchema.parse(await request.json());
    const validation = validateVideoMeta(body.filename, body.mimeType, body.sizeBytes);
    if (!validation.valid) {
      return NextResponse.json({ ok: false, message: validation.error }, { status: 400 });
    }

    if (!body.storageKey.startsWith("hh/social/chat/media/")) {
      return NextResponse.json({ ok: false, message: "Invalid storage key." }, { status: 400 });
    }

    const storage = getMediaStorage();
    const head = await storage.headObject(body.storageKey);
    if (!head) {
      return NextResponse.json({ ok: false, message: "Uploaded object not found." }, { status: 400 });
    }
    if (head.sizeBytes > env.MEDIA_MAX_VIDEO_BYTES) {
      return NextResponse.json({ ok: false, message: "Video exceeds size limit." }, { status: 400 });
    }

    const asset = await createMediaAssetRecord(user.id, "VIDEO", body.filename, {
      storageKey: body.storageKey,
      publicUrl: body.publicUrl,
      mimeType: body.mimeType,
      sizeBytes: head.sizeBytes,
    });

    return NextResponse.json({ ok: true, asset: toMediaAssetDto(asset), url: body.publicUrl });
  } catch (error) {
    const message = safeErrorMessage(error);
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
