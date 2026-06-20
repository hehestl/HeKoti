import { describe, expect, it } from "vitest";
import { getAvailableMessageLocales, getDictionary, MESSAGE_LOCALES_FALLBACK } from "@/lib/i18n";

describe("i18n dictionary", () => {
  it("loads ru and en", async () => {
    const en = await getDictionary("en");
    const ru = await getDictionary("ru");
    expect(en.common.loading).toBeTruthy();
    expect(ru.common.loading).toBeTruthy();
    expect(en.common.loading).not.toBe(ru.common.loading);
  });

  it("falls back to en for unknown locale", async () => {
    const de = await getDictionary("de");
    const en = await getDictionary("en");
    expect(de.common.loading).toBe(en.common.loading);
  });

  it("caches dictionary per locale", async () => {
    const first = await getDictionary("en");
    const second = await getDictionary("en");
    expect(first).toBe(second);
  });

  it("getAvailableMessageLocales includes en and ru", () => {
    const locales = getAvailableMessageLocales();
    expect(locales).toEqual(expect.arrayContaining([...MESSAGE_LOCALES_FALLBACK]));
  });
});
