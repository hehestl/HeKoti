import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ensureProdSecrets, parseEnvFile, isStrong } = require("../scripts/ensure-prod-secrets.cjs");

describe("ensure-prod-secrets", () => {
  let tmpDir = "";

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hekoti-secrets-"));
    for (const name of ["WEBHOOK_SECRET", "AUTH_PENDING_SECRET", "HEKOTI_TOTP_ENCRYPTION_KEY"]) {
      delete process.env[name];
    }
    delete process.env.HEKOTI_AUTO_SECRETS;
  });

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("isStrong requires 32+ chars", () => {
    expect(isStrong("short")).toBe(false);
    expect(isStrong("a".repeat(32))).toBe(true);
  });

  it("parses env file lines", () => {
    expect(parseEnvFile("# comment\nWEBHOOK_SECRET=abc\n\nFOO=bar")).toEqual({
      WEBHOOK_SECRET: "abc",
      FOO: "bar",
    });
  });

  it("generates and persists when env missing", () => {
    const secretsFile = path.join(tmpDir, "runtime-secrets.env");
    const result = ensureProdSecrets({ secretsFile });

    expect(result.skipped).toBe(false);
    expect(result.generated).toHaveLength(3);
    expect(fs.existsSync(secretsFile)).toBe(true);
    for (const name of ["WEBHOOK_SECRET", "AUTH_PENDING_SECRET", "HEKOTI_TOTP_ENCRYPTION_KEY"]) {
      expect(process.env[name]?.length).toBeGreaterThanOrEqual(32);
    }
  });

  it("reuses file secrets on second run", () => {
    const secretsFile = path.join(tmpDir, "runtime-secrets.env");
    const first = ensureProdSecrets({ secretsFile });
    delete process.env.WEBHOOK_SECRET;
    delete process.env.AUTH_PENDING_SECRET;
    delete process.env.HEKOTI_TOTP_ENCRYPTION_KEY;

    const second = ensureProdSecrets({ secretsFile });
    expect(second.generated).toHaveLength(0);
    expect(second.fromFile).toHaveLength(3);
    expect(second.secrets.WEBHOOK_SECRET).toBe(first.secrets.WEBHOOK_SECRET);
  });

  it("explicit env overrides file", () => {
    const secretsFile = path.join(tmpDir, "runtime-secrets.env");
    ensureProdSecrets({ secretsFile });
    const explicit = "e".repeat(64);
    process.env.WEBHOOK_SECRET = explicit;

    const result = ensureProdSecrets({ secretsFile });
    expect(result.secrets.WEBHOOK_SECRET).toBe(explicit);
    expect(result.fromEnv).toContain("WEBHOOK_SECRET");
  });

  it("skips when HEKOTI_AUTO_SECRETS=0", () => {
    process.env.HEKOTI_AUTO_SECRETS = "0";
    const result = ensureProdSecrets({ secretsFile: path.join(tmpDir, "x.env") });
    expect(result.skipped).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "x.env"))).toBe(false);
  });
});
