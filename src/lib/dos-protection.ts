import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Maximum request body size (1MB for JSON, 10MB for file uploads)
 */
const MAX_JSON_SIZE = 1024 * 1024; // 1MB
const MAX_FORM_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Maximum JSON depth to prevent stack overflow attacks
 */
const MAX_JSON_DEPTH = 100;

/**
 * Check if request body size is within limits
 */
export function checkRequestSize(request: NextRequest): NextResponse | null {
  const contentLength = request.headers.get("content-length");
  const contentType = request.headers.get("content-type") || "";
  
  if (!contentLength) return null;
  
  const size = parseInt(contentLength, 10);
  if (isNaN(size)) return null;
  
  const isFileUpload = contentType.includes("multipart/form-data");
  const maxSize = isFileUpload ? MAX_FORM_SIZE : MAX_JSON_SIZE;
  
  if (size > maxSize) {
    return NextResponse.json(
      {
        ok: false,
        message: `Request body too large. Maximum size is ${maxSize / 1024 / 1024}MB.`,
      },
      { status: 413 }
    );
  }
  
  return null;
}

/**
 * Safely parse JSON with depth limit
 */
export function safeJsonParse(text: string): { data: unknown; error?: never } | { data?: never; error: string } {
  try {
    let depth = 0;
    
    // Check depth by counting braces/brackets
    for (const char of text) {
      if (char === "{" || char === "[") {
        depth++;
        if (depth > MAX_JSON_DEPTH) {
          return { error: `JSON depth exceeds maximum (${MAX_JSON_DEPTH})` };
        }
      } else if (char === "}" || char === "]") {
        depth--;
      }
    }
    
    const data = JSON.parse(text);
    return { data };
  } catch (e) {
    return { error: `Invalid JSON: ${e instanceof Error ? e.message : "Unknown error"}` };
  }
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
}

/**
 * In-memory rate limit store (use Redis in production)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for a given key
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(key);
  
  if (!existing || now > existing.resetTime) {
    // Reset the window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }
  
  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
    };
  }
  
  existing.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime,
  };
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = "Operation timed out"
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
  
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Middleware to protect against DoS attacks
 */
export function dosProtectionMiddleware(request: NextRequest): NextResponse | null {
  // Check request size
  const sizeError = checkRequestSize(request);
  if (sizeError) {
    return sizeError;
  }
  
  // For JSON requests, we'll validate depth when parsing
  // This is handled in the route handlers using safeJsonParse
  
  return null;
}