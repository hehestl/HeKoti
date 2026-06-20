import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

export const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm"]);

export const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
export const VIDEO_EXTENSIONS = new Set(["mp4", "webm"]);

export type PutResult = {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
};

export type PresignResult = {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
  expiresIn: number;
};

export interface MediaStorage {
  mode: "local" | "s3";
  putImage(buffer: Buffer, originalName: string): Promise<PutResult>;
  putVideo(buffer: Buffer, originalName: string, mimeType: string): Promise<PutResult>;
  createPresignedVideoPut(filename: string, mimeType: string): Promise<PresignResult>;
  headObject(storageKey: string): Promise<{ sizeBytes: number; contentType?: string } | null>;
  deleteObject(storageKey: string): Promise<void>;
}

function newStorageKey(ext: string): string {
  const year = new Date().getFullYear();
  const id = crypto.randomUUID();
  return `hh/social/chat/media/${year}/${id}.${ext}`;
}

function publicUrlForKey(storageKey: string): string {
  if (env.MEDIA_STORAGE === "s3" && env.S3_PUBLIC_URL) {
    return `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${storageKey}`;
  }
  const base = env.ASSETS_BASE_URL?.replace(/\/$/, "") ?? "";
  const relative = `/uploads/${storageKey}`;
  return base ? `${base}${relative}` : relative;
}

function localRoot(): string {
  const root = path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);
  return root;
}

function localPathForKey(storageKey: string): string {
  const root = localRoot();
  const target = path.resolve(root, storageKey);
  if (!target.startsWith(root + path.sep) && target !== root) {
    throw new Error("Invalid storage key.");
  }
  return target;
}

function createS3Client(): S3Client {
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error("S3 credentials and bucket are required when MEDIA_STORAGE=s3.");
  }
  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(env.S3_ENDPOINT),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}

class LocalMediaStorage implements MediaStorage {
  mode = "local" as const;

  async putImage(buffer: Buffer, originalName: string): Promise<PutResult> {
    void originalName;
    const storageKey = newStorageKey("webp");
    const target = localPathForKey(storageKey);
    await fs.mkdir(path.dirname(target), { recursive: true });

    const processed = await sharp(buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });

    await fs.writeFile(target, processed.data);

    return {
      storageKey,
      publicUrl: publicUrlForKey(storageKey),
      mimeType: "image/webp",
      sizeBytes: processed.data.length,
      width: processed.info.width,
      height: processed.info.height,
    };
  }

  async putVideo(buffer: Buffer, originalName: string, mimeType: string): Promise<PutResult> {
    const ext = originalName.split(".").pop()?.toLowerCase() ?? "mp4";
    const storageKey = newStorageKey(ext);
    const target = localPathForKey(storageKey);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);

    return {
      storageKey,
      publicUrl: publicUrlForKey(storageKey),
      mimeType,
      sizeBytes: buffer.length,
    };
  }

  async createPresignedVideoPut(): Promise<PresignResult> {
    throw new Error("Presigned upload is only available when MEDIA_STORAGE=s3.");
  }

  async headObject(storageKey: string): Promise<{ sizeBytes: number; contentType?: string } | null> {
    try {
      const stat = await fs.stat(localPathForKey(storageKey));
      return { sizeBytes: stat.size };
    } catch {
      return null;
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    try {
      await fs.unlink(localPathForKey(storageKey));
    } catch {
      // ignore missing files
    }
  }
}

class S3MediaStorage implements MediaStorage {
  mode = "s3" as const;
  private client = createS3Client();

  private async putObject(storageKey: string, body: Buffer, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: storageKey,
        Body: body,
        ContentType: mimeType,
      }),
    );
  }

  async putImage(buffer: Buffer, originalName: string): Promise<PutResult> {
    void originalName;
    const storageKey = newStorageKey("webp");
    const processed = await sharp(buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });

    await this.putObject(storageKey, processed.data, "image/webp");

    return {
      storageKey,
      publicUrl: publicUrlForKey(storageKey),
      mimeType: "image/webp",
      sizeBytes: processed.data.length,
      width: processed.info.width,
      height: processed.info.height,
    };
  }

  async putVideo(buffer: Buffer, originalName: string, mimeType: string): Promise<PutResult> {
    const ext = originalName.split(".").pop()?.toLowerCase() ?? "mp4";
    const storageKey = newStorageKey(ext);
    await this.putObject(storageKey, buffer, mimeType);
    return {
      storageKey,
      publicUrl: publicUrlForKey(storageKey),
      mimeType,
      sizeBytes: buffer.length,
    };
  }

  async createPresignedVideoPut(filename: string, mimeType: string): Promise<PresignResult> {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "mp4";
    const storageKey = newStorageKey(ext);
    const expiresIn = env.MEDIA_PRESIGN_TTL_SECONDS;
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: storageKey,
      ContentType: mimeType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });
    return {
      uploadUrl,
      storageKey,
      publicUrl: publicUrlForKey(storageKey),
      expiresIn,
    };
  }

  async headObject(storageKey: string): Promise<{ sizeBytes: number; contentType?: string } | null> {
    try {
      const out = await this.client.send(
        new HeadObjectCommand({
          Bucket: env.S3_BUCKET!,
          Key: storageKey,
        }),
      );
      if (out.ContentLength == null) return null;
      return { sizeBytes: out.ContentLength, contentType: out.ContentType };
    } catch {
      return null;
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: storageKey,
      }),
    );
  }
}

let storageSingleton: MediaStorage | null = null;

export function getMediaStorage(): MediaStorage {
  if (storageSingleton) return storageSingleton;
  storageSingleton = env.MEDIA_STORAGE === "s3" ? new S3MediaStorage() : new LocalMediaStorage();
  return storageSingleton;
}

export function fileExtension(name: string): string | undefined {
  return name.split(".").pop()?.toLowerCase();
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (file.size > env.MEDIA_MAX_IMAGE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds ${Math.round(env.MEDIA_MAX_IMAGE_BYTES / 1024 / 1024)}MB limit.`,
    };
  }
  if (!IMAGE_MIME_TYPES.has(file.type)) {
    return { valid: false, error: `File type "${file.type}" is not allowed.` };
  }
  const ext = fileExtension(file.name);
  if (ext && !IMAGE_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File extension ".${ext}" is not allowed.` };
  }
  return { valid: true };
}

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (file.size > env.MEDIA_MAX_VIDEO_BYTES) {
    return {
      valid: false,
      error: `File size exceeds ${Math.round(env.MEDIA_MAX_VIDEO_BYTES / 1024 / 1024)}MB limit.`,
    };
  }
  if (!VIDEO_MIME_TYPES.has(file.type)) {
    return { valid: false, error: `File type "${file.type}" is not allowed.` };
  }
  const ext = fileExtension(file.name);
  if (ext && !VIDEO_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File extension ".${ext}" is not allowed.` };
  }
  return { valid: true };
}

export function validateVideoMeta(
  filename: string,
  mimeType: string,
  sizeBytes: number,
): { valid: boolean; error?: string } {
  if (sizeBytes > env.MEDIA_MAX_VIDEO_BYTES) {
    return { valid: false, error: "Video exceeds size limit." };
  }
  if (!VIDEO_MIME_TYPES.has(mimeType)) {
    return { valid: false, error: "Video MIME type is not allowed." };
  }
  const ext = fileExtension(filename);
  if (!ext || !VIDEO_EXTENSIONS.has(ext)) {
    return { valid: false, error: "Video extension is not allowed." };
  }
  return { valid: true };
}
