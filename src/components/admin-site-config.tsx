"use client";

import type { CSSProperties } from "react";
import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import { clearNotesOpenTabs } from "@/hooks/use-admin-open-tabs";
import type { Dictionary } from "@/lib/i18n";

type AgentRow = { id: string; title: string; enabled: boolean; hasApi: boolean };

type Props = {
  dict: Dictionary;
  tech: {
    version: string;
    next: string;
    react: string;
    prisma: string;
    db: string;
  };
  initialKnownLanguages: string[];
  initialEnabledLanguages: string[];
  initialAdminLanguage: string;
  messageLocales: string[];
  initialAgents: AgentRow[];
};

export function AdminSiteConfig({
  dict,
  tech,
  initialKnownLanguages,
  initialEnabledLanguages,
  initialAdminLanguage,
  messageLocales,
  initialAgents,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [enabledLanguages, setEnabledLanguages] = useState(initialEnabledLanguages);
  const [adminLanguage, setAdminLanguage] = useState(initialAdminLanguage);
  const [agents, setAgents] = useState(initialAgents);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const adm = dict.admin.administration;
  const adminLangMissingTranslation = !messageLocales.includes(adminLanguage);

  const badge: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid var(--line)",
    borderRadius: 999,
    padding: "6px 10px",
    background: "color-mix(in srgb, var(--fg) 3%, var(--panel))",
    color: "var(--fg)",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  const panel: CSSProperties = {
    border: "1px solid var(--line)",
    borderRadius: 12,
    background: "var(--panel)",
    padding: 12,
    marginBottom: 12,
  };

  const selectStyle: CSSProperties = {
    border: "1px solid var(--line)",
    borderRadius: 8,
    padding: "8px 10px",
    background: "var(--panel)",
    color: "var(--fg)",
    maxWidth: 320,
  };

  const changeAdminLanguage = useCallback(
    async (next: string) => {
      if (next === adminLanguage) return;
      setBusy(true);
      setStatus(dict.common.loading);
      try {
        const res = await apiFetch("/api/admin/site-config", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ adminLanguage: next }),
        });
        const body = (await res.json()) as { ok?: boolean; adminLanguage?: string; message?: string };
        if (!res.ok || !body.ok || !body.adminLanguage) {
          setStatus(body.message ?? dict.admin.posts.failed);
          return;
        }
        setAdminLanguage(body.adminLanguage);
        clearNotesOpenTabs();
        setStatus(dict.admin.posts.saved);
        const params = new URLSearchParams(searchParams.toString());
        startTransition(() => {
          router.replace(`/${body.adminLanguage}/admin?${params.toString()}`, { scroll: false });
          router.refresh();
        });
      } catch {
        setStatus(dict.admin.posts.failed);
      } finally {
        setBusy(false);
      }
    },
    [adminLanguage, dict, router, searchParams, startTransition],
  );

  const toggleLang = useCallback(
    async (code: string) => {
      const next = enabledLanguages.includes(code)
        ? enabledLanguages.filter((l) => l !== code)
        : [...enabledLanguages, code];
      if (next.length === 0) {
        setStatus(dict.admin.administration.langKeepOne);
        return;
      }
      setBusy(true);
      setStatus(dict.common.loading);
      try {
        const res = await apiFetch("/api/admin/site-config", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ enabledLanguages: next }),
        });
        const body = (await res.json()) as { ok?: boolean; enabledLanguages?: string[]; message?: string };
        if (!res.ok || !body.ok || !body.enabledLanguages) {
          setStatus(body.message ?? dict.admin.posts.failed);
          return;
        }
        setEnabledLanguages(body.enabledLanguages);
        setStatus(dict.admin.posts.saved);
      } catch {
        setStatus(dict.admin.posts.failed);
      } finally {
        setBusy(false);
      }
    },
    [dict, enabledLanguages],
  );

  const toggleAgent = useCallback(
    async (id: string) => {
      const next = agents.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a));
      setBusy(true);
      setStatus(dict.common.loading);
      try {
        const res = await apiFetch("/api/admin/site-config", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ aiAgents: next.map((a) => ({ id: a.id, enabled: a.enabled })) }),
        });
        const body = (await res.json()) as { ok?: boolean; aiAgents?: AgentRow[]; message?: string };
        if (!res.ok || !body.ok || !body.aiAgents) {
          setStatus(body.message ?? dict.admin.posts.failed);
          return;
        }
        setAgents(body.aiAgents);
        setStatus(dict.admin.posts.saved);
      } catch {
        setStatus(dict.admin.posts.failed);
      } finally {
        setBusy(false);
      }
    },
    [agents, dict],
  );

  const controlsDisabled = busy || isPending;

  return (
    <section style={panel}>
      <h2 style={{ marginTop: 0 }}>{dict.admin.administration.title}</h2>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={badge}>
            {dict.admin.tech.version}: {tech.version}
          </span>
          <span style={badge}>Next.js {tech.next}</span>
          <span style={badge}>React {tech.react}</span>
          <span style={badge}>Prisma {tech.prisma}</span>
          <span style={badge}>{tech.db}</span>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13, maxWidth: 320 }}>
            <span>{adm.adminLanguage}</span>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>{adm.adminLanguageHint}</span>
            <select
              value={adminLanguage}
              disabled={controlsDisabled}
              style={selectStyle}
              onChange={(e) => void changeAdminLanguage(e.target.value)}
            >
              {initialKnownLanguages.map((code) => (
                <option key={code} value={code}>
                  {code.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          {adminLangMissingTranslation ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{adm.adminLanguageFallback}</p>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{dict.admin.administration.languagesHint}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {initialKnownLanguages.map((code) => {
              const on = enabledLanguages.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => void toggleLang(code)}
                  title={on ? dict.admin.administration.langOn : dict.admin.administration.langOff}
                  style={{
                    ...badge,
                    cursor: controlsDisabled ? "wait" : "pointer",
                    borderColor: on ? "color-mix(in srgb, var(--accent) 55%, var(--line))" : "var(--line)",
                    background: on ? "color-mix(in srgb, var(--accent) 18%, var(--panel))" : badge.background,
                    color: on ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {code.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{dict.admin.administration.agentsHint}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                disabled={controlsDisabled}
                onClick={() => void toggleAgent(agent.id)}
                title={agent.hasApi ? agent.id : dict.admin.administration.agentNoApi}
                style={{
                  ...badge,
                  cursor: controlsDisabled ? "wait" : "pointer",
                  opacity: agent.hasApi ? 1 : 0.65,
                  borderColor: agent.enabled
                    ? "color-mix(in srgb, var(--accent) 55%, var(--line))"
                    : "var(--line)",
                  background: agent.enabled
                    ? "color-mix(in srgb, var(--accent) 18%, var(--panel))"
                    : badge.background,
                  color: agent.enabled ? "var(--accent)" : "var(--muted)",
                }}
              >
                {agent.title}
              </button>
            ))}
          </div>
        </div>

        {status ? <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{status}</p> : null}
      </div>
    </section>
  );
}
