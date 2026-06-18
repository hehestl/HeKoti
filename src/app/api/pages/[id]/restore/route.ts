import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { restorePageSubtree } from "@/lib/page-trash";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const result = await restorePageSubtree(id);
    return NextResponse.json({
      ok: true,
      restoredIds: result.restoredIds,
      path: result.page.path,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Restore failed";
    if (msg === "PATH_OCCUPIED") {
      const occupantTitle = (error as Error & { occupantTitle?: string }).occupantTitle ?? "";
      return NextResponse.json({ ok: false, error: "PATH_OCCUPIED", title: occupantTitle }, { status: 409 });
    }
    const status = msg === "Unauthorized." ? 401 : msg === "Page not in trash." ? 404 : 400;
    return NextResponse.json({ ok: false, message: msg }, { status });
  }
}
