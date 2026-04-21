import { aiAgents } from "@/lib/ai-links";
import { prisma } from "@/lib/db";

type CmdResult = { reply: string; changedAgentId?: string };

export async function ensureDefaultChannel() {
  return prisma.agentChannel.upsert({
    where: { key: "admin-main" },
    update: {},
    create: { key: "admin-main", title: "Admin main", activeAgentId: aiAgents[0]?.id ?? null },
  });
}

function findAgent(idOrTitle: string) {
  const raw = idOrTitle.trim().toLowerCase();
  return aiAgents.find((a) => a.id.toLowerCase() === raw || a.title.toLowerCase() === raw);
}

async function runSlashCommand(channelId: string, text: string): Promise<CmdResult> {
  const cmd = text.trim();
  if (cmd.startsWith("/agent set ") || cmd.startsWith("/agent on ")) {
    const target = cmd.replace("/agent set ", "").replace("/agent on ", "").trim();
    const agent = findAgent(target);
    if (!agent) {
      return { reply: `Unknown agent: ${target}. Try one of: ${aiAgents.map((a) => a.id).join(", ")}` };
    }
    await prisma.agentChannel.update({
      where: { id: channelId },
      data: { activeAgentId: agent.id },
    });
    return { reply: `Active agent switched to ${agent.title} (${agent.id}).`, changedAgentId: agent.id };
  }
  if (cmd.startsWith("/agent list")) {
    const lines = aiAgents.map((a) => `- ${a.id}: ${a.title}${a.enabled ? "" : " (disabled)"}`);
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

async function callActiveAgent(prompt: string, activeAgentId?: string | null) {
  const active = aiAgents.find((a) => a.id === activeAgentId) ?? aiAgents.find((a) => a.enabled);
  if (!active) return "No active agent configured.";
  const key = active.apiKeyEnv ? process.env[active.apiKeyEnv] : undefined;
  if (!key || !active.apiBaseUrl) {
    return `Agent ${active.title} is selected, but ${active.apiKeyEnv ?? "API key"} / apiBaseUrl is not configured.`;
  }
  const system =
    "You are Hekoti admin assistant. Focus on wiki writing quality: translation, grammar, fact gathering hints, concise answers.";
  try {
    const response = await fetch(`${active.apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });
    if (!response.ok) {
      return `Agent ${active.title} API error: ${response.status}`;
    }
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content?.trim() || "Empty response from agent.";
  } catch (error) {
    return `Agent ${active.title} call failed: ${error instanceof Error ? error.message : "unknown error"}`;
  }
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
      assistantReply = await callActiveAgent(input.text.trim().slice(5), channel.activeAgentId);
    } else {
      const command = await runSlashCommand(input.channelId, input.text);
      assistantReply = command.reply;
    }
  } else {
    assistantReply = await callActiveAgent(input.text, channel.activeAgentId);
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
