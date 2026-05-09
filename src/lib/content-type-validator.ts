import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Allowed content types for different API endpoints
 */
const ALLOWED_CONTENT_TYPES: Record<string, string[]> = {
  // JSON APIs
  "/api/auth/": ["application/json"],
  "/api/admin/": ["application/json"],
  "/api/pages/": ["application/json", "application/x-www-form-urlencoded", "multipart/form-data"],
  "/api/agent/": ["application/json"],
  "/api/spellcheck/": ["application/json"],
  
  // File upload
  "/api/media/upload/": ["multipart/form-data"],
  
  // Webhooks (raw text for signature verification)
  "/api/webhooks/": ["application/json", "text/plain"],
  
  // Health checks (no body)
  "/api/health/": ["*/*"],
};

/**
 * Default allowed content types for POST/PUT/PATCH requests
 */
const DEFAULT_ALLOWED_TYPES = ["application/json", "application/x-www-form-urlencoded", "multipart/form-data"];

/**
 * Check if content type is allowed for a given path
 */
export function isContentTypeAllowed(path: string, contentType: string | null): { allowed: boolean; expected?: string[] } {
  // Find matching route pattern
  let allowedTypes = DEFAULT_ALLOWED_TYPES;
  
  for (const [pattern, types] of Object.entries(ALLOWED_CONTENT_TYPES)) {
    if (path.startsWith(pattern)) {
      allowedTypes = types;
      break;
    }
  }

  // Allow */* for health checks and GET requests
  if (allowedTypes.includes("*/*")) {
    return { allowed: true };
  }

  // If no content-type header, check if it's a GET/DELETE request (no body)
  if (!contentType) {
    return { allowed: true };
  }

  // Parse content-type (remove charset and other parameters)
  const baseType = contentType.split(";")[0].trim().toLowerCase();

  // Check if content type is allowed
  const isAllowed = allowedTypes.some(allowed => {
    if (allowed === "*/*") return true;
    return baseType === allowed || baseType.startsWith(allowed.replace("/*", ""));
  });

  return {
    allowed: isAllowed,
    expected: allowedTypes,
  };
}

/**
 * Validate Content-Type header for API requests
 */
export function validateContentType(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Skip validation for GET, HEAD, OPTIONS requests
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return null;
  }

  const contentType = request.headers.get("content-type");
  const { allowed, expected } = isContentTypeAllowed(pathname, contentType);

  if (!allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: `Invalid Content-Type. Expected: ${expected?.join(", ") || "application/json"}`,
      },
      { status: 415 } // Unsupported Media Type
    );
  }

  return null;
}