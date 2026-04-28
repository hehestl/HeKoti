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
  const [isError, setIsError] = useState(false);

  const startSetup = async () => {
    setMessage("");
    setIsError(false);
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
        setIsError(true);
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
    setIsError(false);
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
        setIsError(true);
        return;
      }
      setConfirmCode("");
      setQrDataUrl(null);
      setManualSecret(null);
      setStatus("enabled");
      setMessage(body.message ?? dict.admin.totp.success);
      setIsError(false);
    } finally {
      setBusy(false);
    }
  };

  const disableTotp = async () => {
    setMessage("");
    setIsError(false);
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
        setIsError(true);
        return;
      }
      if (body.relogin) {
        window.location.href = `/${lang}/login`;
        return;
      }
      setDisablePassword("");
      setDisableCode("");
      setStatus("off");
      setIsError(false);
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
        padding: 16,
        marginBottom: 12,
      }}
    >
      <h3 style={{ marginTop: 0 }}>{dict.admin.totp.title}</h3>
      <p style={{ margin: "8px 0", fontSize: 14 }}>
        {dict.admin.totp.status}:{" "}
        <strong style={{ color: status === "enabled" ? "#4caf50" : "var(--muted)" }}>
          {status === "enabled" ? dict.admin.totp.enabled : dict.admin.totp.disabled}
        </strong>
      </p>

      {status === "off" && (
        <button style={btn} onClick={startSetup} disabled={busy}>
          {dict.admin.totp.enable}
        </button>
      )}

      {status === "enabled" && (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <input
              style={{ ...input, width: 160 }}
              type="password"
              placeholder={dict.admin.totp.placeholderPassword}
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              autoComplete="current-password"
            />
            <input
              style={{ ...input, width: 100 }}
              placeholder={dict.admin.totp.placeholderCode}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <button
              style={btnDanger}
              onClick={disableTotp}
              disabled={busy || !disablePassword || disableCode.length < 6}
            >
              {dict.admin.totp.disable}
            </button>
          </div>
        </div>
      )}

      {status === "pending" ? (
        <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
          {!qrDataUrl ? (
            <button type="button" style={btn} onClick={startSetup} disabled={busy}>
              {dict.admin.totp.generateQR}
            </button>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 13 }}>{dict.admin.totp.scanQR}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="TOTP QR" style={{ width: 200, height: 200, borderRadius: 8 }} />
              {manualSecret ? (
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", wordBreak: "break-all" }}>
                  {dict.admin.totp.manualKey}: <code>{manualSecret}</code>
                </p>
              ) : null}
              <label style={labelStyle}>
                {dict.admin.totp.confirmCode}
                <input
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  style={input}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>
              <button type="button" style={btn} onClick={confirmTotp} disabled={busy || !confirmCode.trim()}>
                {dict.admin.totp.confirmEnable}
              </button>
              <button
                type="button"
                style={{ ...btn, background: "transparent", color: "var(--fg)" }}
                onClick={startSetup}
                disabled={busy}
              >
                {dict.admin.totp.newQR}
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
