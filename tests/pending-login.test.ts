import { describe, expect, it } from "vitest";
import { signPendingLogin, verifyPendingLogin } from "@/lib/pending-login";

describe("pending login token", () => {
  it("round-trips user id", () => {
    const token = signPendingLogin("user-123", 60_000);
    const parsed = verifyPendingLogin(token);
    expect(parsed.userId).toBe("user-123");
  });

  it("rejects tampered token", () => {
    const token = signPendingLogin("user-123", 60_000);
    const tampered = `${token}x`;
    expect(() => verifyPendingLogin(tampered)).toThrow();
  });
});
