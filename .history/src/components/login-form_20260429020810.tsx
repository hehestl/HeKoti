"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";

type Step = "password" | "totp";

export function LoginForm({ lang, dict }: { lang: string; dict: Dictionary }) {
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      style={{ display: "grid", gap: 10 }}
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");

        if (step === "password") {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ email: email.trim(), password }),
          });
          const body = (await res.json()) as {
            ok?: boolean;
            needsTotp?: boolean;
            pendingToken?: string;
            message?: string;
          };
          if (!res.ok) {
            setError(body.message ?? "Login failed");
            return;
          }
          if (body.needsTotp && body.pendingToken) {
            setPendingToken(body.pendingToken);
            setStep("totp");
            return;
          }
          window.location.href = `/${lang}/admin`;
          return;
        }

        const res = await fetch("/api/auth/login/totp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ pendingToken, code: totpCode.trim() }),
        });
        const body = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok) {
          setError(body.message ?? "Invalid code");
          return;
        }
        window.location.href = `/${lang}/admin`;
      }}
    >
      {step === "password" ? (
        <>
          <input
            style={inputStyle}
            placeholder="Login (e.g. admin)"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
          />
          <input
            style={inputStyle}
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
            Введите 6-значный код из приложения-аутентификатора (Google Authenticator, Яндекс.Ключ и т.д.).
          </p>
          <input
            style={inputStyle}
            placeholder="Код"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={totpCode}
            onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
          />
          <button
            type="button"
            style={{ ...buttonStyle, background: "transparent", color: "var(--fg)" }}
            onClick={() => {
              setStep("password");
              setPendingToken("");
              setTotpCode("");
              setError("");
            }}
          >
            Назад
          </button>
        </>
      )}
      <button style={buttonStyle} type="submit">
        {step === "password" ? "Login" : "Подтвердить"}
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
