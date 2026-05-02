import { describe, expect, it } from "vitest";
import { lintTelemetrySnippet, parseTelemetrySnippet } from "@/lib/telemetry-snippets";

describe("telemetry snippets", () => {
  it("accepts allowlisted analytics hosts", () => {
    const html = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>`;
    const issues = lintTelemetrySnippet(html);
    expect(issues).toHaveLength(0);
  });

  it("rejects non-allowlisted script hosts", () => {
    const html = `<script src="https://evil.example.com/a.js"></script>`;
    const issues = lintTelemetrySnippet(html);
    expect(issues.some((x) => x.includes("allowlisted"))).toBe(true);
  });

  it("rejects extra tags outside allowed set", () => {
    const html = `<div>bad</div><script src="https://mc.yandex.ru/a.js"></script>`;
    const parsed = parseTelemetrySnippet(html);
    expect(parsed.violations.some((x) => x.includes("Only <script>, <meta>, <link>, and <noscript>"))).toBe(true);
  });
});
