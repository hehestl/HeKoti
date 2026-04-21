import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth";
import { ensureDefaultChannel, processChatMessage } from "@/lib/agent-chat";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  channelKey: z.string().default("admin-main"),
  message: z.string().trim().min(1),
});

export async function GET() {
  await requireAdminUser();
  const channel = await ensureDefaultChannel();
  const messages = await prisma.agentMessage.findMany({
    where: { channelId: channel.id },
    orderBy: { createdAt: "asc" },
    take: 80,
  });
  return NextResponse.json({
    ok: true,
    channel: { key: channel.key, title: channel.title, activeAgentId: channel.activeAgentId },
    messages,
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminUser();
    const payload = bodySchema.parse(await request.json());
    const channel = await prisma.agentChannel.upsert({
      where: { key: payload.channelKey },
      update: {},
      create: { key: payload.channelKey, title: payload.channelKey },
    });
    const result = await processChatMessage({
      channelId: channel.id,
      authorId: user.id,
      text: payload.message,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Agent chat failed" },
      { status: 400 },
    );
  }
}
