import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logAuditEvent, extractIp, extractUserAgent } from "@/lib/audit-logger";

/**
 * Application error types
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error categories for logging
 */
export enum ErrorCategory {
  VALIDATION = "VALIDATION",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMIT = "RATE_LIMIT",
  SECURITY = "SECURITY",
  DATABASE = "DATABASE",
  EXTERNAL = "EXTERNAL",
  UNKNOWN = "UNKNOWN",
}

/**
 * Categorize error for logging
 */
export function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  
  if (message.includes("validation") || message.includes("parse") || message.includes("zod")) {
    return ErrorCategory.VALIDATION;
  }
  if (message.includes("unauthorized") || message.includes("credentials") || message.includes("login")) {
    return ErrorCategory.AUTHENTICATION;
  }
  if (message.includes("forbidden") || message.includes("permission") || message.includes("admin")) {
    return ErrorCategory.AUTHORIZATION;
  }
  if (message.includes("not found") || message.includes("no such")) {
    return ErrorCategory.NOT_FOUND;
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return ErrorCategory.RATE_LIMIT;
  }
  if (message.includes("csrf") || message.includes("signature") || message.includes("security")) {
    return ErrorCategory.SECURITY;
  }
  if (message.includes("database") || message.includes("prisma") || message.includes("sql")) {
    return ErrorCategory.DATABASE;
  }
  if (message.includes("fetch") || message.includes("network") || message.includes("timeout")) {
    return ErrorCategory.EXTERNAL;
  }
  
  return ErrorCategory.UNKNOWN;
}

/**
 * Format error response based on environment
 */
export function formatErrorResponse(
  error: Error,
  category: ErrorCategory,
  isProduction: boolean
) {
  const isOperational = error instanceof AppError && (error as AppError).isOperational;
  
  // For operational errors, we can show the message
  // For programming errors, we hide details in production
  const message = isOperational || !isProduction 
    ? error.message 
    : "An internal error occurred";

  const response: Record<string, unknown> = {
    ok: false,
    message,
    category,
    timestamp: new Date().toISOString(),
  };

  // In development, include more details
  if (!isProduction) {
    response.stack = error.stack;
    response.details = {
      name: error.name,
      category,
    };
  }

  return response;
}

/**
 * Get appropriate HTTP status code from error
 */
export function getErrorStatusCode(error: Error): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  
  const message = error.message.toLowerCase();
  if (message.includes("invalid") || message.includes("bad request")) return 400;
  if (message.includes("unauthorized") || message.includes("credentials")) return 401;
  if (message.includes("forbidden")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("conflict") || message.includes("already exists")) return 409;
  if (message.includes("rate limit") || message.includes("too many")) return 429;
  
  return 500;
}

/**
 * Log error with context
 */
export async function logError(
  error: Error,
  category: ErrorCategory,
  request: NextRequest,
  additionalData?: Record<string, unknown>
) {
  const ip = extractIp(request.headers);
  const userAgent = extractUserAgent(request.headers);
  const path = request.nextUrl.pathname;
  const method = request.method;

  // Log to console with context
  console.error(`[Error] ${category}:`, {
    message: error.message,
    path,
    method,
    ip,
    userAgent: userAgent ? `${userAgent.substring(0, 50)}...` : undefined,
    timestamp: new Date().toISOString(),
    ...additionalData,
  });

  // Log security-related errors to audit
  if (category === ErrorCategory.SECURITY) {
    await logAuditEvent("security.csrf_blocked", {
      ipAddress: ip,
      userAgent,
      action: `${method} ${path}`,
      errorMessage: error.message,
      success: false,
      metadata: additionalData,
    });
  }
}

/**
 * Global error handler for API routes
 */
export async function handleError(
  error: Error,
  request: NextRequest
): Promise<NextResponse> {
  const category = categorizeError(error);
  const statusCode = getErrorStatusCode(error);
  const isProduction = process.env.NODE_ENV === "production";

  // Log the error
  await logError(error, category, request);

  // Format response
  const response = formatErrorResponse(error, category, isProduction);

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Wrap an API handler with error handling
 */
export function withErrorHandler<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  operationName?: string
) {
  return async (...args: Parameters<T>): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    
    try {
      return await handler(...args);
    } catch (error) {
      if (operationName) {
        await logAuditEvent("security.invalid_input", {
          ipAddress: extractIp(request.headers),
          userAgent: extractUserAgent(request.headers),
          action: operationName,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          success: false,
        });
      }
      return handleError(error as Error, request);
    }
  };
}