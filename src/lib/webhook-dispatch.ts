import { env } from "@/lib/env";
import { signWebhookPayload } from "@/lib/webhooks";

export async function emitOutgoingWebhook(event: string, data: unknown) {
  const urls = env.OUTGOING_WEBHOOK_URLS.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (urls.length === 0) return;
  const payload = JSON.stringify({ event, data, sentAt: new Date().toISOString() });
  const signature = signWebhookPayload(payload, env.WEBHOOK_SECRET);
  await Promise.allSettled(
    urls.map((url) =>
      fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hekoti-signature": signature,
        },
        body: payload,
      }),
    ),
  );
}
