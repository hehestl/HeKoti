import { env } from "@/lib/env";

export type AiLink = { title: string; url: string };
export type AiAgent = {
  id: string;
  title: string;
  enabled: boolean;
  url?: string;
  apiBaseUrl?: string;
  apiKeyEnv?: string;
};

const defaultAgents: AiAgent[] = [
  { id: "openai", title: "OpenAI", enabled: true, url: "https://chat.openai.com", apiBaseUrl: "https://api.openai.com/v1", apiKeyEnv: "OPENAI_API_KEY" },
  { id: "gemini", title: "Gemini", enabled: true, url: "https://gemini.google.com", apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta", apiKeyEnv: "GEMINI_API_KEY" },
  { id: "claude", title: "Claude", enabled: true, url: "https://claude.ai", apiBaseUrl: "https://api.anthropic.com/v1", apiKeyEnv: "ANTHROPIC_API_KEY" },
  { id: "grok", title: "Grok", enabled: true, url: "https://grok.com", apiBaseUrl: "https://api.x.ai/v1", apiKeyEnv: "XAI_API_KEY" },
  { id: "deepseek", title: "DeepSeek", enabled: true, url: "https://chat.deepseek.com", apiBaseUrl: "https://api.deepseek.com/v1", apiKeyEnv: "DEEPSEEK_API_KEY" },
  { id: "qwen", title: "Qwen", enabled: true, url: "https://chat.qwen.ai", apiBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", apiKeyEnv: "QWEN_API_KEY" },
  { id: "copilot", title: "Copilot", enabled: true, url: "https://copilot.microsoft.com", apiBaseUrl: "", apiKeyEnv: "COPILOT_TOKEN" },
];

export const aiLinks: AiLink[] = (() => {
  try {
    const explicit = JSON.parse(env.AI_LINKS_JSON) as AiLink[];
    if (explicit.length > 0) return explicit;
  } catch {
    // fallback below
  }
  try {
    const agents = JSON.parse(env.AI_AGENTS_JSON) as AiAgent[];
    return agents.filter((item) => item.enabled && item.url).map((item) => ({ title: item.title, url: item.url! }));
  } catch {
    return defaultAgents.filter((item) => item.enabled && item.url).map((item) => ({ title: item.title, url: item.url! }));
  }
})();

export const aiAgents: AiAgent[] = (() => {
  try {
    const agents = JSON.parse(env.AI_AGENTS_JSON) as AiAgent[];
    return agents.length > 0 ? agents : defaultAgents;
  } catch {
    return defaultAgents;
  }
})();
