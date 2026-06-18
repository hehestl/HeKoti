import { NextResponse } from "next/server";
import { z } from "zod";
import { PageReaction } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const reactionSchema = z.object({
  reaction: z.nativeEnum(PageReaction),
});

type Aggregates = Record<PageReaction, number>;

function emptyAggregates(): Aggregates {
  return { BROKEN: 0, NEUTRAL: 0, LOVED: 0 };
}

function buildRatingResponse(
  aggregates: Aggregates,
  userReaction: PageReaction | null,
) {
  const totalVotes = aggregates.BROKEN + aggregates.NEUTRAL + aggregates.LOVED;
  const percentages =
    totalVotes === 0
      ? { BROKEN: 0, NEUTRAL: 0, LOVED: 0 }
      : {
          BROKEN: Math.round((aggregates.BROKEN / totalVotes) * 100),
          NEUTRAL: Math.round((aggregates.NEUTRAL / totalVotes) * 100),
          LOVED: Math.round((aggregates.LOVED / totalVotes) * 100),
        };

  return {
    aggregates,
    totalVotes,
    percentages,
    userReaction,
  };
}

async function loadAggregates(pageId: string): Promise<Aggregates> {
  const rows = await prisma.pageRating.groupBy({
    by: ["reaction"],
    where: { pageId },
    _count: { reaction: true },
  });
  const aggregates = emptyAggregates();
  for (const row of rows) {
    aggregates[row.reaction] = row._count.reaction;
  }
  return aggregates;
}

async function findPublishedPage(id: string) {
  return prisma.page.findFirst({
    where: { id, isPublished: true },
    select: { id: true },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const page = await findPublishedPage(id);
  if (!page) {
    return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
  }

  const [aggregates, user] = await Promise.all([
    loadAggregates(page.id),
    getSessionUser(),
  ]);

  let userReaction: PageReaction | null = null;
  if (user) {
    const rating = await prisma.pageRating.findUnique({
      where: { pageId_userId: { pageId: page.id, userId: user.id } },
      select: { reaction: true },
    });
    userReaction = rating?.reaction ?? null;
  }

  return NextResponse.json(buildRatingResponse(aggregates, userReaction));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const page = await findPublishedPage(id);
  if (!page) {
    return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
  }

  let payload: z.infer<typeof reactionSchema>;
  try {
    payload = reactionSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload." }, { status: 400 });
  }

  await prisma.pageRating.upsert({
    where: { pageId_userId: { pageId: page.id, userId: user.id } },
    create: {
      pageId: page.id,
      userId: user.id,
      reaction: payload.reaction,
    },
    update: { reaction: payload.reaction },
  });

  const aggregates = await loadAggregates(page.id);
  return NextResponse.json(buildRatingResponse(aggregates, payload.reaction));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const page = await findPublishedPage(id);
  if (!page) {
    return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
  }

  await prisma.pageRating.deleteMany({
    where: { pageId: page.id, userId: user.id },
  });

  const aggregates = await loadAggregates(page.id);
  return NextResponse.json(buildRatingResponse(aggregates, null));
}
