import { callAiAgent } from "@/lib/ai-agent";
import { getAiAgents } from "@/lib/site-config";
import { prisma } from "@/lib/db";

type CmdResult = { reply: string; changedAgentId?: string };

export async function ensureDefaultChannel() {
  const agents = await getAiAgents();
  return prisma.agentChannel.upsert({
    where: { key: "admin-main" },
    update: {},
    create: { key: "admin-main", title: "Admin main", activeAgentId: agents.find((a) => a.enabled)?.id ?? null },
  });
}

async function findAgent(idOrTitle: string) {
  const agents = await getAiAgents();
  const raw = idOrTitle.trim().toLowerCase();
  return agents.find((a) => a.id.toLowerCase() === raw || a.title.toLowerCase() === raw);
}

async function runSlashCommand(channelId: string, text: string): Promise<CmdResult> {
  const cmd = text.trim();
  if (cmd.startsWith("/agent set ") || cmd.startsWith("/agent on ")) {
    const target = cmd.replace("/agent set ", "").replace("/agent on ", "").trim();
    const agents = await getAiAgents();
    const agent = await findAgent(target);
    if (!agent) {
      return { reply: `Unknown agent: ${target}. Try one of: ${agents.map((a) => a.id).join(", ")}` };
    }
    await prisma.agentChannel.update({
      where: { id: channelId },
      data: { activeAgentId: agent.id },
    });
    return { reply: `Active agent switched to ${agent.title} (${agent.id}).`, changedAgentId: agent.id };
  }
  if (cmd.startsWith("/agent list")) {
    const agents = await getAiAgents();
    const lines = agents.map((a) => `- ${a.id}: ${a.title}${a.enabled ? "" : " (disabled)"}`);
    return { reply: `Available agents:\n${lines.join("\n")}` };
  }
  if (cmd.startsWith("/help")) {
    return {
      reply:
        "Commands:\n/agent list\n/agent set <id>\n/agent on <id>\n/ask <prompt>\nAny non-command text is treated as /ask.",
    };
  }
  return { reply: "Unknown command. Use /help." };
}

export async function processChatMessage(input: {
  channelId: string;
  authorId: string;
  text: string;
}) {
  const channel = await prisma.agentChannel.findUnique({ where: { id: input.channelId } });
  if (!channel) throw new Error("Channel not found.");

  await prisma.agentMessage.create({
    data: {
      channelId: input.channelId,
      authorId: input.authorId,
      role: "user",
      content: input.text,
    },
  });

  let assistantReply = "";
  if (input.text.trim().startsWith("/")) {
    if (input.text.trim().startsWith("/ask ")) {
      assistantReply = await callAiAgent(input.text.trim().slice(5), channel.activeAgentId);
    } else {
      const command = await runSlashCommand(input.channelId, input.text);
      assistantReply = command.reply;
    }
  } else {
    assistantReply = await callAiAgent(input.text, channel.activeAgentId);
  }

  await prisma.agentMessage.create({
    data: {
      channelId: input.channelId,
      role: "assistant",
      content: assistantReply,
    },
  });

  const messages = await prisma.agentMessage.findMany({
    where: { channelId: input.channelId },
    orderBy: { createdAt: "asc" },
    take: 80,
  });
  return { reply: assistantReply, messages };
}
