import { getAiAgents } from "@/lib/site-config";
import type { AiAgent } from "@/lib/ai-links";

export async function resolveActiveAgent(agentId?: string | null): Promise<AiAgent | null> {
  const agents = await getAiAgents();
  const byId = agentId ? agents.find((a) => a.id === agentId) : undefined;
  return byId ?? agents.find((a) => a.enabled) ?? null;
}

export async function callAiAgent(prompt: string, agentId?: string | null): Promise<string> {
  const active = await resolveActiveAgent(agentId);
  if (!active) return "No active AI agent configured.";
  const key = active.apiKeyEnv ? process.env[active.apiKeyEnv] : undefined;
  if (!key || !active.apiBaseUrl) {
    return `Agent ${active.title} is selected, but ${active.apiKeyEnv ?? "API key"} / apiBaseUrl is not configured.`;
  }

  const system =
    "You are Hekoti wiki assistant. Help with translation, localization, grammar, and concise wiki writing. When asked for JSON, return only valid JSON without markdown fences.";

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

export function extractJsonObject<T>(text: string): T | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}