import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "file required" }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webp`;
    const targetDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(targetDir, { recursive: true });
    const target = path.join(targetDir, name);
    await sharp(Buffer.from(bytes)).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 85 }).toFile(target);
    const publicPath = `/uploads/${name}`;
    return NextResponse.json({
      ok: true,
      url: env.ASSETS_BASE_URL ? `${env.ASSETS_BASE_URL}${publicPath}` : publicPath,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "upload failed" },
      { status: 400 },
    );
  }
}
