#!/usr/bin/env node

const { spawn } = require("node:child_process");

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HEKOTI_ENFORCE_PROD_SECRETS = process.env.HEKOTI_ENFORCE_PROD_SECRETS || "1";

function requireStrongSecret(name, minLength = 32) {
  const value = (process.env[name] || "").trim();
  if (!value || value.length < minLength) {
    throw new Error(`${name} must be set and at least ${minLength} chars in production.`);
  }
}

function requireNonDefaultAdminCredentials() {
  const email = (process.env.HEKOTI_ADMIN_EMAIL || "admin").trim();
  const password = process.env.HEKOTI_ADMIN_PASSWORD || "hehe";
  if (email === "admin" || password === "hehe") {
    throw new Error("Refusing default admin credentials in production. Set HEKOTI_ADMIN_EMAIL and HEKOTI_ADMIN_PASSWORD.");
  }
}

if (process.env.NODE_ENV === "production" && process.env.HEKOTI_ENFORCE_PROD_SECRETS === "1") {
  requireStrongSecret("WEBHOOK_SECRET");
  requireStrongSecret("AUTH_PENDING_SECRET");
  requireStrongSecret("HEKOTI_TOTP_ENCRYPTION_KEY");
  requireNonDefaultAdminCredentials();
}

const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "start", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
