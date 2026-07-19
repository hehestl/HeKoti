import { describe, expect, it } from "vitest";
import { isMascotId, resolveMascotId, resolveMascotSrc } from "@/lib/mascots";

describe("mascots", () => {
  it("resolves default mascot", () => {
    expect(resolveMascotId(undefined)).toBe("hekoti");
    expect(resolveMascotId("unknown")).toBe("hekoti");
  });

  it("resolves hehel mascot src", () => {
    expect(isMascotId("hehel")).toBe(true);
    expect(resolveMascotSrc("hehel")).toBe("/mascots/hehel.png");
  });

  it("maps legacy magnific id to hehel", () => {
    expect(resolveMascotId("magnific")).toBe("hehel");
    expect(isMascotId("magnific")).toBe(false);
  });
});
