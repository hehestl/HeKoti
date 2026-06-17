import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import type { AiAgent } from "@/lib/ai-links";

const defaultAgents: AiAgent[] = [
  { id: "openai", title: "OpenAI", enabled: true, url: "https://chat.openai.com", apiBaseUrl: "https://api.openai.com/v1", apiKeyEnv: "OPENAI_API_KEY" },
  { id: "gemini", title: "Gemini", enabled: true, url: "https://gemini.google.com", apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta", apiKeyEnv: "GEMINI_API_KEY" },
  { id: "claude", title: "Claude", enabled: true, url: "https://claude.ai", apiBaseUrl: "https://api.anthropic.com/v1", apiKeyEnv: "ANTHROPIC_API_KEY" },
  { id: "grok", title: "Grok", enabled: true, url: "https://grok.com", apiBaseUrl: "https://api.x.ai/v1", apiKeyEnv: "XAI_API_KEY" },
  { id: "deepseek", title: "DeepSeek", enabled: true, url: "https://chat.deepseek.com", apiBaseUrl: "https://api.deepseek.com/v1", apiKeyEnv: "DEEPSEEK_API_KEY" },
  { id: "qwen", title: "Qwen", enabled: true, url: "https://chat.qwen.ai", apiBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", apiKeyEnv: "QWEN_API_KEY" },
  { id: "copilot", title: "Copilot", enabled: true, url: "https://copilot.microsoft.com", apiBaseUrl: "", apiKeyEnv: "COPILOT_TOKEN" },
];

/** All locales that may be enabled (from env). */
export const knownLanguages = env.ENABLED_LANGUAGES.split(",")
  .map((item) => item.trim())
  .filter(Boolean);

function envAgents(): AiAgent[] {
  try {
    const agents = JSON.parse(env.AI_AGENTS_JSON) as AiAgent[];
    return agents.length > 0 ? agents : defaultAgents;
  } catch {
    return defaultAgents;
  }
}

function parseJsonArray(raw: string): string[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
  } catch {
    return null;
  }
}

type AgentToggle = { id: string; enabled: boolean };

function parseAgentToggles(raw: string): AgentToggle[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: AgentToggle[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id.trim() : "";
      if (!id) continue;
      out.push({ id, enabled: row.enabled !== false });
    }
    return out;
  } catch {
    return null;
  }
}

export async function getEnabledLanguages(): Promise<string[]> {
  try {
    const settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    const fromDb = parseJsonArray(settings?.enabledLanguagesJson ?? "");
    if (fromDb && fromDb.length > 0) {
      return fromDb.filter((l) => knownLanguages.includes(l));
    }
  } catch {
    // db not ready
  }
  return knownLanguages.length > 0 ? knownLanguages : ["en"];
}

export async function getAiAgents(): Promise<AiAgent[]> {
  const base = envAgents();
  try {
    const settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    const toggles = parseAgentToggles(settings?.aiAgentsJson ?? "");
    if (!toggles || toggles.length === 0) return base;
    const toggleMap = new Map(toggles.map((t) => [t.id, t.enabled]));
    return base.map((agent) => ({
      ...agent,
      enabled: toggleMap.has(agent.id) ? toggleMap.get(agent.id)! : agent.enabled,
    }));
  } catch {
    return base;
  }
}

export async function getSiteConfig() {
  const [enabledLanguages, aiAgents] = await Promise.all([getEnabledLanguages(), getAiAgents()]);
  return { enabledLanguages, aiAgents, knownLanguages };
}

export function buildAgentTogglesJson(agents: AiAgent[]): string {
  return JSON.stringify(agents.map((a) => ({ id: a.id, enabled: a.enabled })));
}

export function buildEnabledLanguagesJson(languages: string[]): string {
  return JSON.stringify(languages);
}