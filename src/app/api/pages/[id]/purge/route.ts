import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { emitOutgoingWebhook } from "@/lib/webhook-dispatch";
import { purgePageSubtree } from "@/lib/page-trash";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "1";
    const result = await purgePageSubtree(id, force);
    await emitOutgoingWebhook("page.deleted", {
      pageId: id,
      path: result.page.path,
      soft: false,
      purgedIds: result.purgedIds,
    });
    return NextResponse.json({ ok: true, purgedIds: result.purgedIds, path: result.page.path });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Purge failed";
    const status =
      msg === "Unauthorized."
        ? 401
        : msg === "Page not in trash."
          ? 404
          : msg === "Purge not allowed yet."
            ? 403
            : 400;
    return NextResponse.json({ ok: false, message: msg }, { status });
  }
}
