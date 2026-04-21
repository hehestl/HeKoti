"use client";

import { useState } from "react";

export function LoginForm({ lang }: { lang: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      style={{ display: "grid", gap: 10 }}
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, totpCode: totpCode || undefined }),
        });
        if (!res.ok) {
          const body = (await res.json()) as { message?: string };
          setError(body.message ?? "Login failed");
          return;
        }
        window.location.href = `/${lang}/admin`;
      }}
    >
      <input style={inputStyle} placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <input
        style={inputStyle}
        placeholder="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <input
        style={inputStyle}
        placeholder="TOTP code (optional)"
        value={totpCode}
        onChange={(event) => setTotpCode(event.target.value)}
      />
      <button style={buttonStyle} type="submit">
        Login
      </button>
      {error ? <p style={{ color: "#ff5f7d" }}>{error}</p> : null}
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 10,
  background: "transparent",
  color: "var(--fg)",
  padding: "10px",
};
const buttonStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 10,
  background: "var(--accent)",
  color: "white",
  padding: "10px",
};
