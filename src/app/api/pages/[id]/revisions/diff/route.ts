import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activePageWhere } from "@/lib/page-query";
import {
  buildDiffPayload,
  resolveDiffRevisionIds,
  type DiffSide,
} from "@/lib/page-revision-diff";
import { pageToRevisionSnapshot, revisionRowToSnapshot } from "@/lib/page-revision-snapshot";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const page = await prisma.page.findFirst({ where: { id, ...activePageWhere } });
    if (!page) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const to = searchParams.get("to");
    if (!to) {
      return NextResponse.json({ ok: false, message: "Query param `to` is required." }, { status: 400 });
    }

    const fromParam = searchParams.get("from") ?? "previous";
    const revisions = await prisma.pageRevision.findMany({
      where: { pageId: id },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    const { fromId, toId } = resolveDiffRevisionIds(revisions, { from: fromParam, to });

    const loadRevisionSide = async (revisionId: string, label: string): Promise<DiffSide | null> => {
      const row = await prisma.pageRevision.findFirst({
        where: { id: revisionId, pageId: id },
      });
      if (!row) return null;
      return {
        kind: "revision",
        id: row.id,
        label,
        snapshot: revisionRowToSnapshot(row),
      };
    };

    const currentSide: DiffSide = {
      kind: "current",
      id: page.id,
      label: "current",
      snapshot: pageToRevisionSnapshot(page),
    };

    let toSide: DiffSide | null = null;
    if (toId === "current") {
      toSide = currentSide;
    } else {
      toSide = await loadRevisionSide(toId, toId);
    }
    if (!toSide) {
      return NextResponse.json({ ok: false, message: "Target revision not found." }, { status: 404 });
    }

    let fromSide: DiffSide | null = null;
    if (fromId === "current") {
      fromSide = currentSide;
    } else if (fromId) {
      fromSide = await loadRevisionSide(fromId, fromId);
    } else {
      fromSide = {
        kind: "revision",
        id: null,
        label: "empty",
        snapshot: {
          title: "",
          contentMd: "",
          slug: null,
          path: null,
          icon: null,
          isPublished: null,
          showToc: null,
          isCategory: null,
          navOrder: null,
        },
      };
    }

    if (!fromSide) {
      return NextResponse.json({ ok: false, message: "Source revision not found." }, { status: 404 });
    }

    const payload = buildDiffPayload({ from: fromSide, to: toSide });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to build diff." },
      { status: 400 },
    );
  }
}
