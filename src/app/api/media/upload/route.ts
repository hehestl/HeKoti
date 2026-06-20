import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { createMediaAssetRecord, toMediaAssetDto } from "@/lib/media-assets";
import {
  getMediaStorage,
  validateImageFile,
  validateVideoFile,
} from "@/lib/media-storage";
import { env } from "@/lib/env";

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Upload failed";
  return env.NODE_ENV === "production" ? "Upload failed" : message;
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminUser();
    const form = await request.formData();
    const file = form.get("file");
    const kind = form.get("kind");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "File is required." }, { status: 400 });
    }

    const storage = getMediaStorage();
    const isVideo = kind === "video";

    if (isVideo) {
      if (storage.mode === "s3") {
        return NextResponse.json(
          { ok: false, message: "Use presigned upload for video when MEDIA_STORAGE=s3." },
          { status: 400 },
        );
      }
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        return NextResponse.json({ ok: false, message: validation.error }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      const put = await storage.putVideo(Buffer.from(bytes), file.name, file.type);
      const asset = await createMediaAssetRecord(user.id, "VIDEO", file.name, put);
      return NextResponse.json({ ok: true, asset: toMediaAssetDto(asset), url: put.publicUrl });
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ ok: false, message: validation.error }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const put = await storage.putImage(Buffer.from(bytes), file.name);
    const asset = await createMediaAssetRecord(user.id, "IMAGE", file.name, put);
    return NextResponse.json({ ok: true, asset: toMediaAssetDto(asset), url: put.publicUrl });
  } catch (error) {
    const message = safeErrorMessage(error);
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
