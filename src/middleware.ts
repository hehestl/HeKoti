import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createCspContext } from "@/lib/csp";
import { applySecurityHeaders } from "@/lib/security-headers";
import { validateContentType } from "@/lib/content-type-validator";

/**
 * CSRF Protection Middleware
 * 
 * Implements double-submit cookie pattern for CSRF protection.
 * For state-changing requests (POST, PUT, PATCH, DELETE), requires
 * a CSRF token that matches a cookie value.
 */

// Paths that are exempt from CSRF checking (public APIs, health checks)
const CSRF_EXEMPT_PATHS = [
  "/api/health",
  "/api/webhooks/incoming", // Has its own signature verification
  "/api/auth/login",
  "/api/auth/logout",
];

// HTTP methods that require CSRF protection
const CSRF_PROTECTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

function isExemptPath(path: string): boolean {
  return CSRF_EXEMPT_PATHS.some((exempt) => path.startsWith(exempt));
}

function isProtectedMethod(method: string): boolean {
  return CSRF_PROTECTED_METHODS.includes(method);
}

/**
 * CSRF secret key (derived from WEBHOOK_SECRET if not set)
 * In production, set CSRF_SECRET in environment
 */
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.WEBHOOK_SECRET || "hekoti-csrf-default-change-me";
const textEncoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function signCsrfRandom(randomHex: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(CSRF_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(randomHex));
  return bytesToHex(new Uint8Array(signature));
}

/**
 * Generate a CSRF token using HMAC-SHA256
 * Token format: randomBytes.hmacSignature
 */
async function generateCsrfToken(): Promise<string> {
  const randomHex = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const signature = await signCsrfRandom(randomHex);
  return `${randomHex}.${signature}`;
}

/**
 * Verify a CSRF token
 */
async function verifyCsrfToken(token: string, cookieToken: string): Promise<boolean> {
  if (!token || !cookieToken) return false;

  const [tokenRandom, tokenSignature] = token.split(".");
  const [cookieRandom, cookieSignature] = cookieToken.split(".");

  if (!tokenRandom || !tokenSignature || !cookieRandom || !cookieSignature) return false;
  if (!/^[0-9a-f]{64}$/i.test(tokenRandom) || !/^[0-9a-f]{64}$/i.test(cookieRandom)) return false;

  const expectedTokenSignature = await signCsrfRandom(tokenRandom);
  const expectedCookieSignature = await signCsrfRandom(cookieRandom);
  return (
    constantTimeEqual(tokenRandom, cookieRandom) &&
    constantTimeEqual(tokenSignature, expectedTokenSignature) &&
    constantTimeEqual(cookieSignature, expectedCookieSignature)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;

  const { csp } = createCspContext();

  // Set CSRF cookie for all responses (used by frontend)
  let response = NextResponse.next();

  response = applySecurityHeaders(request, response, csp);

  // Validate Content-Type for state-changing requests
  const contentTypeError = validateContentType(request);
  if (contentTypeError) {
    return contentTypeError;
  }
  
  // Set CSRF cookie if not present
  if (!request.cookies.get("csrf_token")) {
    const token = await generateCsrfToken();
    response.cookies.set("csrf_token", token, {
      httpOnly: false, // Must be readable by JavaScript for double-submit
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  // Skip CSRF check for exempt paths or non-protected methods
  if (isExemptPath(pathname) || !isProtectedMethod(method)) {
    return response;
  }

  // Get token from header or query parameter
  const headerToken = request.headers.get("x-csrf-token");
  const queryToken = searchParams.get("csrf_token");
  const cookieToken = request.cookies.get("csrf_token")?.value;

  // Verify CSRF token
  if (!headerToken && !queryToken) {
    return NextResponse.json(
      { ok: false, message: "CSRF token missing. Include x-csrf-token header or csrf_token query parameter." },
      { status: 403 }
    );
  }

  const tokenToVerify = headerToken || queryToken;

  if (!cookieToken || !tokenToVerify || !(await verifyCsrfToken(tokenToVerify, cookieToken))) {
    return NextResponse.json(
      { ok: false, message: "Invalid CSRF token." },
      { status: 403 }
    );
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|public/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};