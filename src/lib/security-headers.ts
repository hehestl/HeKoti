import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security headers for HTML and API responses.
 * CSP nonce/CSP string must come from middleware (single source per request).
 */

export function applySecurityHeaders(
  request: NextRequest,
  response: NextResponse,
  csp: string,
): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    const forwardedProto = request.headers.get("x-forwarded-proto");
    if (forwardedProto === "https" || process.env.APP_URL?.startsWith("https")) {
      response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }
  }

  return response;
}
