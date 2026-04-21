import crypto from "crypto";

export function signWebhookPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyWebhookPayload(payload: string, secret: string, signature?: string | null) {
  if (!signature) return false;
  const expected = signWebhookPayload(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
