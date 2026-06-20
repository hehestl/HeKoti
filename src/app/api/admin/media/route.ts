import { NextResponse } from "next/server";
import type { MediaKind } from "@prisma/client";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toMediaAssetDto } from "@/lib/media-assets";
import { env } from "@/lib/env";

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "List failed";
  return env.NODE_ENV === "production" ? "List failed" : message;
}

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");
    const take = Math.min(Math.max(Number(searchParams.get("take") ?? "48"), 1), 100);
    const cursor = searchParams.get("cursor") ?? undefined;

    const kindFilter =
      kind === "IMAGE" || kind === "VIDEO" ? (kind as MediaKind) : undefined;

    const rows = await prisma.mediaAsset.findMany({
      where: {
        deletedAt: null,
        ...(kindFilter ? { kind: kindFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      ok: true,
      items: items.map(toMediaAssetDto),
      nextCursor,
    });
  } catch (error) {
    const message = safeErrorMessage(error);
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
