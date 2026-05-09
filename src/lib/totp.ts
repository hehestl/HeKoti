import crypto from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { env } from "@/lib/env";

/** Allow ±30s clock skew (one period each side). */
const TOTP_EPOCH_TOLERANCE_SEC = 30;

function encryptionKey(): Buffer {
  const raw = env.HEKOTI_TOTP_ENCRYPTION_KEY?.trim();
  if (raw) {
    if (/^[0-9a-f]{64}$/i.test(raw)) {
      return Buffer.from(raw, "hex");
    }
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) {
      return buf;
    }
    throw new Error("HEKOTI_TOTP_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64).");
  }
  if (env.NODE_ENV === "production") {
    throw new Error("HEKOTI_TOTP_ENCRYPTION_KEY must be set in production.");
  }
  return crypto.createHash("sha256").update(`hekoti:totp:${env.WEBHOOK_SECRET}`).digest();
}

/** AES-256-GCM; format v1:iv:ct:tag (base64url). */
export function encryptTotpSecret(plainBase32: string): string {
  const key = encryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plainBase32, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), enc.toString("base64url"), tag.toString("base64url")].join(":");
}

export function decryptTotpSecret(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid stored TOTP secret.");
  }
  const [, ivB64, encB64, tagB64] = parts;
  const key = encryptionKey();
  const iv = Buffer.from(ivB64!, "base64url");
  const enc = Buffer.from(encB64!, "base64url");
  const tag = Buffer.from(tagB64!, "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function generateTotpSecret(): string {
  return generateSecret();
}

export function verifyTotpToken(secretPlain: string, token: string): boolean {
  const cleaned = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) {
    return false;
  }
  try {
    const result = verifySync({
      secret: secretPlain,
      token: cleaned,
      epochTolerance: TOTP_EPOCH_TOLERANCE_SEC,
    });
    return result.valid;
  } catch {
    return false;
  }
}

export async function qrDataUrlForTotp(opts: {
  secret: string;
  accountLabel: string;
  issuer: string;
}): Promise<string> {
  const otpauth = generateURI({
    issuer: opts.issuer,
    label: opts.accountLabel,
    secret: opts.secret,
  });
  return QRCode.toDataURL(otpauth);
}

export const TOTP_ISSUER = "Hekoti";
