import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "employee.invited"
  | "account.password_changed"
  | "subscription.tier_changed"
  | "integration.connected"
  | "integration.disconnected"
  | "workflow.adopted"
  | "specialist.assigned";

/**
 * Records a sensitive action to the audit trail. Best-effort: a failure here
 * (e.g. hitting a database that hasn't had the `metadata` column patch
 * applied yet via /api/admin/migrate) must never break the action it's
 * logging, so errors are swallowed rather than thrown.
 */
export async function logAudit(params: {
  organizationId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId ?? undefined,
        userId: params.userId ?? undefined,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? undefined,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log entry", params.action, error);
  }
}

const ACTION_LABELS: Record<AuditAction, string> = {
  "employee.invited": "Invited an employee",
  "account.password_changed": "Changed password",
  "subscription.tier_changed": "Changed subscription plan",
  "integration.connected": "Connected an integration",
  "integration.disconnected": "Disconnected an integration",
  "workflow.adopted": "Adopted a workflow",
  "specialist.assigned": "Assigned a specialist",
};

export function describeAuditAction(action: string): string {
  return ACTION_LABELS[action as AuditAction] ?? action;
}
