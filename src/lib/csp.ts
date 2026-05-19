/**
 * Content-Security-Policy for HTML pages.
 *
 * Next.js App Router emits many inline scripts for hydration; nonce-based CSP
 * requires perfect middleware↔render coupling and breaks easily behind proxies.
 * We use 'unsafe-inline' for script-src (see Next.js CSP guide — without nonces).
 */

export function buildContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
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

export function createCspContext(): { csp: string } {
  return { csp: buildContentSecurityPolicy() };
}
