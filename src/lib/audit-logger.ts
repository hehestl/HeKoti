import { prisma } from "@/lib/db";

export type AuditEventType =
  | "user.login.success"
  | "user.login.failure"
  | "user.logout"
  | "user.password.changed"
  | "user.email.changed"
  | "user.totp.enabled"
  | "user.totp.disabled"
  | "file.uploaded"
  | "file.deleted"
  | "page.created"
  | "page.updated"
  | "page.deleted"
  | "page.published"
  | "settings.updated"
  | "webhook.received"
  | "webhook.rejected"
  | "security.csrf_blocked"
  | "security.rate_limited"
  | "security.invalid_input";

export interface AuditEventData {
  // Core fields
  userId?: string;
  userEmail?: string;
  
  // Action details
  action?: string;
  resourceType?: string;
  resourceId?: string;
  
  // Request context
  ipAddress?: string;
  userAgent?: string;
  
  // Additional context
  metadata?: Record<string, unknown>;
  
  // Result
  success?: boolean;
  errorMessage?: string;
}

/**
 * Audit logger for security-relevant events
 */
export async function logAuditEvent(
  eventType: AuditEventType,
  data: AuditEventData
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        eventType,
        userId: data.userId,
        userEmail: data.userEmail,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata === undefined ? undefined : JSON.stringify(data.metadata),
        success: data.success ?? true,
        errorMessage: data.errorMessage,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    // Don't let audit logging failures break the main flow
    console.error(`[Audit] Failed to log ${eventType}:`, error);
  }
}

/**
 * Helper to extract IP from request
 */
export function extractIp(headers: Headers): string | undefined {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }
  return headers.get("x-real-ip") || undefined;
}

/**
 * Helper to extract user agent from request
 */
export function extractUserAgent(headers: Headers): string | undefined {
  return headers.get("user-agent") || undefined;
}