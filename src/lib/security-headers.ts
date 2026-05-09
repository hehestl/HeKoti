import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security Headers Middleware
 * 
 * Adds essential security headers to all responses.
 */

export function addSecurityHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = btoa(String.fromCharCode(...nonceBytes));

  // Content Security Policy - stricter than the inline one in layout.tsx
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://mc.yandex.ru https://www.googletagmanager.com https://www.google-analytics.com`,
    "style-src 'self' 'unsafe-inline'", // Required for many CSS frameworks
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://mc.yandex.ru https://www.google-analytics.com https://region1.google-analytics.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  
  // HSTS - only in production and when behind HTTPS
  if (process.env.NODE_ENV === "production") {
    const forwardedProto = request.headers.get("x-forwarded-proto");
    if (forwardedProto === "https" || process.env.APP_URL?.startsWith("https")) {
      response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }
  }

  // Add nonce for use in templates
  response.headers.set("x-nonce", nonce);

  return response;
}