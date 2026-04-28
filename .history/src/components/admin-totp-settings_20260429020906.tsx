"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";

export type TotpStatus = "off" | "pending" | "enabled";

export function AdminTotpSettings({
  lang,
  initialStatus,
  dict,
}: {
  lang: string;
  initialStatus: TotpStatus;
  dict: Dictionary;
}) {
  const [status, setStatus] = useState<TotpStatus>(initialStatus);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const startSetup = async () => {
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/totp/setup", {
        method: "POST",
        credentials: "same-origin",
      });
      const body = (await res.json()) as {
        ok?: boolean;
        qrDataUrl?: string;
        manualSecret?: string;
        message?: string;
      };
      if (!res.ok) {
        setMessage(body.message ?? dict.admin.totp.error);
        return;
      }
      setQrDataUrl(body.qrDataUrl ?? null);
      setManualSecret(body.manualSecret ?? null);
      setStatus("pending");
    } finally {
      setBusy(false);
    }
  };

  const confirmTotp = async () => {
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/totp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code: confirmCode.trim() }),
      });
      const body = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) {
        setMessage(body.message ?? dict.admin.totp.error);
        return;
      }
      setConfirmCode("");
      setQrDataUrl(null);
      setManualSecret(null);
      setStatus("enabled");
      setMessage(body.message ?? dict.admin.totp.success);
    } finally {
      setBusy(false);
    }
  };

  const disableTotp = async () => {
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentPassword: disablePassword, code: disableCode.trim() }),
      });
      const body = (await res.json()) as { ok?: boolean; message?: string; relogin?: boolean };
      if (!res.ok) {
        setMessage(body.message ?? dict.admin.totp.error);
        return;
      }
      if (body.relogin) {
        window.location.href = `/${lang}/login`;
        return;
      }
      setDisablePassword("");
      setDisableCode("");
      setStatus("off");
    } finally {
      setBusy(false);
    }
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
      <h2 style={{ marginTop: 0 }}>Двухфакторная аутентификация (TOTP)</h2>
      <p style={{ color: "var(--muted)", marginTop: 0, fontSize: 13, lineHeight: 1.5 }}>
        Опционально: код из приложения вроде Google Authenticator или Яндекс.Ключ после пароля. Секрет в БД хранится в
        зашифрованном виде; для продакшена задайте <code style={{ fontSize: 11 }}>HEKOTI_TOTP_ENCRYPTION_KEY</code>{" "}
        (32 байта, hex или base64).
      </p>

      {status === "enabled" ? (
        <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
          <p style={{ margin: 0, fontSize: 13 }}>2FA включена.</p>
          <label style={labelStyle}>
            Текущий пароль
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              style={input}
              autoComplete="current-password"
            />
          </label>
          <label style={labelStyle}>
            Код из приложения
            <input
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              style={input}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </label>
          <button type="button" style={btnDanger} onClick={disableTotp} disabled={busy}>
            Отключить 2FA
          </button>
        </div>
      ) : null}

      {status === "off" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <button type="button" style={btn} onClick={startSetup} disabled={busy}>
            Включить 2FA…
          </button>
        </div>
      ) : null}

      {status === "pending" ? (
        <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
          {!qrDataUrl ? (
            <button type="button" style={btn} onClick={startSetup} disabled={busy}>
              Сгенерировать QR-код
            </button>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 13 }}>Отсканируйте QR в приложении-аутентификаторе.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR для TOTP" style={{ width: 200, height: 200, borderRadius: 8 }} />
              {manualSecret ? (
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", wordBreak: "break-all" }}>
                  Ключ вручную: <code>{manualSecret}</code>
                </p>
              ) : null}
              <label style={labelStyle}>
                Код для подтверждения
                <input
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  style={input}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>
              <button type="button" style={btn} onClick={confirmTotp} disabled={busy || !confirmCode.trim()}>
                Подтвердить и включить
              </button>
              <button
                type="button"
                style={{ ...btn, background: "transparent", color: "var(--fg)" }}
                onClick={startSetup}
                disabled={busy}
              >
                Новый QR (отменит текущую привязку)
              </button>
            </>
          )}
        </div>
      ) : null}

      {message ? (
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 13,
            color: message.includes("Ошибка") || message.includes("Wrong") || message.includes("Invalid") ? "#ff5f7d" : "var(--muted)",
          }}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}

const labelStyle: CSSProperties = { display: "grid", gap: 4, fontSize: 13 };

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

const btnDanger: CSSProperties = {
  ...btn,
  background: "#7d2b3a",
  color: "#fff",
};
