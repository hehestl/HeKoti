#!/usr/bin/env node
/**
 * Docker HEALTHCHECK — liveness via GET /api/health/live (no DB).
 * Uses http.get + timeout (fetch in -e has no default timeout and may hang).
 */
const http = require("node:http");

const port = Number(process.env.PORT) || 3310;
const path = "/api/health/live";
const timeoutMs = 4000;

function probe(host) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path, timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

(async () => {
  if (await probe("127.0.0.1")) process.exit(0);
  if (await probe("localhost")) process.exit(0);
  process.exit(1);
})();
