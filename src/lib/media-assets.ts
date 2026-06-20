import type { MediaKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { PutResult } from "@/lib/media-storage";

export type MediaAssetDto = {
  id: string;
  storageKey: string;
  publicUrl: string;
  filename: string;
  mimeType: string;
  kind: MediaKind;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
};

export function toMediaAssetDto(row: {
  id: string;
  storageKey: string;
  publicUrl: string;
  filename: string;
  mimeType: string;
  kind: MediaKind;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
}): MediaAssetDto {
  return {
    id: row.id,
    storageKey: row.storageKey,
    publicUrl: row.publicUrl,
    filename: row.filename,
    mimeType: row.mimeType,
    kind: row.kind,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createMediaAssetRecord(
  uploadedById: string,
  kind: MediaKind,
  filename: string,
  put: PutResult,
) {
  return prisma.mediaAsset.create({
    data: {
      storageKey: put.storageKey,
      publicUrl: put.publicUrl,
      filename,
      mimeType: put.mimeType,
      kind,
      sizeBytes: put.sizeBytes,
      width: put.width,
      height: put.height,
      uploadedById,
    },
  });
}
