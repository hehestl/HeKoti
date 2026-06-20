import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMediaStorage } from "@/lib/media-storage";
import { env } from "@/lib/env";

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Delete failed";
  return env.NODE_ENV === "production" ? "Delete failed" : message;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAdminUser();
    const { id } = await context.params;
    const asset = await prisma.mediaAsset.findFirst({
      where: { id, deletedAt: null },
    });
    if (!asset) {
      return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
    }

    const storage = getMediaStorage();
    await storage.deleteObject(asset.storageKey);
    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = safeErrorMessage(error);
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
