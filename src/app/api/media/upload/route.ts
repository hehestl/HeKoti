import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { env } from "@/lib/env";

// Security constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

/**
 * Validates that a file is a valid image
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.` };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: ${Array.from(ALLOWED_MIME_TYPES).join(", ")}.`,
    };
  }

  // Check file extension
  const ext = file.name.split(".").pop()?.toLowerCase();
  const allowedExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);
  if (ext && !allowedExtensions.has(ext)) {
    return {
      valid: false,
      error: `File extension ".${ext}" is not allowed.`,
    };
  }

  return { valid: true };
}


export async function POST(request: Request) {
  try {
    await requireAdminUser();
    
    const form = await request.formData();
    const file = form.get("file");
    
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "File is required." }, { status: 400 });
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ ok: false, message: validation.error }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    
    // Generate safe filename (timestamp + random + .webp)
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webp`;
    
    // Ensure upload directory exists
    const targetDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(targetDir, { recursive: true });
    
    // Use path.resolve and verify the path is within uploads directory
    const target = path.join(targetDir, name);
    const resolvedTarget = path.resolve(target);
    
    // Prevent path traversal attacks
    if (!resolvedTarget.startsWith(path.resolve(targetDir))) {
      return NextResponse.json({ ok: false, message: "Invalid file path." }, { status: 400 });
    }

    // Process and save the image
    // Note: SVG files should be handled differently as sharp doesn't support SVG output
    if (file.type === "image/svg+xml") {
      // For SVG, just copy the file after validating it's valid XML
      const content = Buffer.from(bytes).toString("utf-8");
      if (!content.includes("<svg")) {
        return NextResponse.json({ ok: false, message: "Invalid SVG file." }, { status: 400 });
      }
      // Save SVG with webp extension won't work, so we keep svg extension
      const svgName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.svg`;
      const svgTarget = path.join(targetDir, svgName);
      await fs.writeFile(svgTarget, content);
      const publicPath = `/uploads/${svgName}`;
      return NextResponse.json({
        ok: true,
        url: env.ASSETS_BASE_URL ? `${env.ASSETS_BASE_URL}${publicPath}` : publicPath,
      });
    }

    // Process image with sharp
    await sharp(Buffer.from(bytes))
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(target);

    const publicPath = `/uploads/${name}`;
    return NextResponse.json({
      ok: true,
      url: env.ASSETS_BASE_URL ? `${env.ASSETS_BASE_URL}${publicPath}` : publicPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    // Don't expose internal errors
    const safeMessage = process.env.NODE_ENV === "production" ? "Upload failed" : message;
    return NextResponse.json({ ok: false, message: safeMessage }, { status: 400 });
  }
}
