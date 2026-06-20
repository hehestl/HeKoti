import { describe, expect, it, vi } from "vitest";
import {
  pickNextTitle,
  reducedRotateDelayMs,
  REDUCED_ROTATE_MAX_MS,
  REDUCED_ROTATE_MIN_MS,
  typingDelayMs,
  TYPEWRITER_DELETE_MS,
  TYPEWRITER_PAUSE_MS,
} from "@/lib/typewriter-placeholder";

describe("pickNextTitle", () => {
  it("returns empty string for empty list", () => {
    expect(pickNextTitle([], null)).toBe("");
  });

  it("returns the only title when length is 1", () => {
    expect(pickNextTitle(["Alpha"], null)).toBe("Alpha");
    expect(pickNextTitle(["Alpha"], "Alpha")).toBe("Alpha");
  });

  it("does not repeat the previous title when alternatives exist", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickNextTitle(["A", "B"], "A")).toBe("B");
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(pickNextTitle(["A", "B"], "B")).toBe("A");
    vi.restoreAllMocks();
  });
});

describe("typewriter timing helpers", () => {
  it("typingDelayMs stays within jitter bounds", () => {
    for (let i = 0; i < 20; i++) {
      const ms = typingDelayMs();
      expect(ms).toBeGreaterThanOrEqual(45);
      expect(ms).toBeLessThan(60);
    }
  });

  it("reducedRotateDelayMs stays within bounds", () => {
    for (let i = 0; i < 20; i++) {
      const ms = reducedRotateDelayMs();
      expect(ms).toBeGreaterThanOrEqual(REDUCED_ROTATE_MIN_MS);
      expect(ms).toBeLessThanOrEqual(REDUCED_ROTATE_MAX_MS);
    }
  });

  it("exports stable pause and delete constants", () => {
    expect(TYPEWRITER_PAUSE_MS).toBe(1200);
    expect(TYPEWRITER_DELETE_MS).toBe(25);
  });
});
