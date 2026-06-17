"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import type { Dictionary } from "@/lib/i18n";

type Msg = { id: string; role: string; content: string; createdAt: string };

export function AdminAgentChat({
  initialMessages,
  initialActiveAgentId,
  dict,
}: {
  initialMessages: Msg[];
  initialActiveAgentId: string | null;
  dict: Dictionary;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [text, setText] = useState("");
  const [status, setStatus] = useState(dict.admin.posts.chatReady);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(initialActiveAgentId);

  return (
    <section
      style={{
        border: "1px solid var(--line)",
        borderRadius: 12,
        background: "var(--panel)",
        padding: 12,
      }}
    >
      <h2 style={{ marginTop: 0 }}>{dict.admin.posts.aiChat}</h2>
      <p style={{ color: "var(--muted)", marginTop: 4 }}>
        {dict.admin.posts.activeAgent}: {activeAgentId ?? dict.admin.posts.agentNotSet} | {dict.admin.posts.commands}: /agent list, /agent set claude, /ask translate text
      </p>
      <div
        style={{
          marginTop: 10,
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: 10,
          minHeight: 220,
          maxHeight: 360,
          overflow: "auto",
          display: "grid",
          gap: 8,
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id} style={{ opacity: msg.role === "assistant" ? 1 : 0.9 }}>
            <strong>{msg.role === "assistant" ? dict.admin.posts.roleAI : dict.admin.posts.roleYou}:</strong> {msg.content}
          </div>
        ))}
        {messages.length === 0 ? <div style={{ color: "var(--muted)" }}>{dict.admin.posts.noMessages}</div> : null}
      </div>
      <form
        style={{ marginTop: 10, display: "flex", gap: 8 }}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!text.trim()) return;
          const message = text;
          setText("");
          setStatus(dict.admin.posts.chatSending);
          const response = await apiFetch("/api/agent/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ channelKey: "admin-main", message }),
          });
          const body = (await response.json()) as { ok: boolean; message?: string; messages?: Msg[] };
          if (!response.ok || !body.ok) {
            setStatus(body.message ?? dict.admin.posts.chatFailed);
            return;
          }
          setMessages(body.messages ?? []);
          const getState = await apiFetch("/api/agent/chat");
          if (getState.ok) {
            const stateBody = (await getState.json()) as {
              ok: boolean;
              channel?: { activeAgentId: string | null };
            };
            if (stateBody.ok) setActiveAgentId(stateBody.channel?.activeAgentId ?? null);
          }
          setStatus(dict.admin.posts.chatReady);
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={dict.admin.posts.chatPlaceholder}
          style={{
            flex: 1,
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "8px 10px",
            background: "transparent",
            color: "var(--fg)",
          }}
        />
        <button
          type="submit"
          style={{
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "8px 12px",
            background: "transparent",
            color: "var(--fg)",
          }}
        >
          {dict.common.send}
        </button>
      </form>
      <p style={{ color: "var(--muted)", marginTop: 8 }}>{status}</p>
    </section>
  );
}
