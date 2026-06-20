import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getMediaStorage, validateVideoMeta } from "@/lib/media-storage";

const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.coerce.number().int().positive(),
});

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Presign failed";
  return env.NODE_ENV === "production" ? "Presign failed" : message;
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    if (env.MEDIA_STORAGE !== "s3") {
      return NextResponse.json(
        { ok: false, message: "Presigned upload requires MEDIA_STORAGE=s3." },
        { status: 400 },
      );
    }

    const json = bodySchema.parse(await request.json());
    const validation = validateVideoMeta(json.filename, json.mimeType, json.sizeBytes);
    if (!validation.valid) {
      return NextResponse.json({ ok: false, message: validation.error }, { status: 400 });
    }

    const storage = getMediaStorage();
    const presign = await storage.createPresignedVideoPut(json.filename, json.mimeType);
    return NextResponse.json({ ok: true, ...presign });
  } catch (error) {
    const message = safeErrorMessage(error);
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
