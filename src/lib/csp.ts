/**
 * Content-Security-Policy for HTML pages.
 * Nonce must be generated once per request in middleware and passed on the request
 * (see Next.js CSP guide) so framework inline scripts receive the same nonce.
 */

export const CSP_NONCE_HEADER = "x-nonce";

export function generateCspNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  return btoa(String.fromCharCode(...bytes));
}

export function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "https://mc.yandex.ru",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://mc.yandex.ru https://www.google-analytics.com https://region1.google-analytics.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function createCspRequestContext(): { nonce: string; csp: string } {
  const nonce = generateCspNonce();
  return { nonce, csp: buildContentSecurityPolicy(nonce) };
}
