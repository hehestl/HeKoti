"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { logoutAction } from "@/lib/actions/logout";
import type { Dictionary } from "@/lib/i18n";

export function AdminAccountSettings({
  lang,
  initialLogin,
  dict,
}: {
  lang: string;
  initialLogin: string;
  dict: Dictionary;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newLogin, setNewLogin] = useState(initialLogin);
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);

  const submit = async () => {
    setStatus("");
    setIsError(false);
    const payload: { currentPassword: string; newEmail?: string; newPassword?: string } = {
      currentPassword,
    };
    if (newLogin.trim() !== initialLogin) payload.newEmail = newLogin.trim();
    if (newPassword.length > 0) payload.newPassword = newPassword;

    const res = await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as { ok?: boolean; message?: string; relogin?: boolean };
    if (!res.ok) {
      setStatus(body.message ?? dict.admin.account.error);
      setIsError(true);
      return;
    }
    if (body.relogin) {
      window.location.href = `/${lang}/login`;
      return;
    }
    setStatus(body.message ?? dict.admin.account.saved);
    setIsError(false);
    setCurrentPassword("");
    setNewPassword("");
  };

  return (
    <section
      style={{
        border: "1px solid var(--line)",
        borderRadius: 12,
        background: "var(--panel)",
        padding: 12,
        marginBottom: 12,
      }}
    >
      <h2 style={{ marginTop: 0 }}>{dict.admin.accountSettings}</h2>
      <p style={{ color: "var(--muted)", marginTop: 0, fontSize: 13 }}>
        {dict.admin.account.desc}
      </p>
      <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          {dict.admin.account.currentPassword}
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={input}
            autoComplete="current-password"
          />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          {dict.admin.account.login}
          <input value={newLogin} onChange={(e) => setNewLogin(e.target.value)} style={input} autoComplete="username" />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          {dict.admin.account.newPassword}
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={input}
            autoComplete="new-password"
          />
        </label>
        <button type="button" onClick={submit} style={btn}>
          {dict.common.save}
        </button>
        {status ? <p style={{ margin: 0, fontSize: 13, color: isError ? "#ff5f7d" : "var(--muted)" }}>{status}</p> : null}
      </div>
      <form action={logoutAction.bind(null, lang)} style={{ marginTop: 16 }}>
        <button type="submit" style={logoutBtn}>
          {dict.common.logout}
        </button>
      </form>
    </section>
  );
}

const input: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "8px 10px",
  background: "transparent",
  color: "var(--fg)",
};

const btn: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "10px 12px",
  background: "var(--accent)",
  color: "#fff",
  cursor: "pointer",
  justifySelf: "start",
};

const logoutBtn: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "8px 12px",
  background: "transparent",
  color: "var(--muted)",
  cursor: "pointer",
  fontSize: 13,
};
