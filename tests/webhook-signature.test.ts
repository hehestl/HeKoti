import { describe, expect, it } from "vitest";
import { signWebhookPayload, verifyWebhookPayload } from "@/lib/webhooks";

describe("webhook signature", () => {
  it("verifies valid signatures", () => {
    const payload = JSON.stringify({ hello: "world" });
    const secret = "super-secret";
    const sig = signWebhookPayload(payload, secret);
    expect(verifyWebhookPayload(payload, secret, sig)).toBe(true);
  });

  it("returns false on length mismatch instead of throwing", () => {
    const payload = '{"x":1}';
    const secret = "super-secret";
    expect(() => verifyWebhookPayload(payload, secret, "short")).not.toThrow();
    expect(verifyWebhookPayload(payload, secret, "short")).toBe(false);
  });
});
