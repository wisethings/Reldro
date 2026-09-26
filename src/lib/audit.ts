import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "employee.invited"
  | "account.password_changed"
  | "account.locked"
  | "initiative.created"
  | "subscription.tier_changed"
  | "integration.connected"
  | "integration.disconnected"
  | "workflow.adopted"
  | "workflow.stage_changed"
  | "workflow.owner_assigned"
  | "specialist.assigned"
  | "expert_help.requested"
  | "tool.status_changed"
  | "reward.points_awarded"
  | "reward.redeemed"
  | "reward.recognition_given"
  | "reward.rules_updated"
  | "certification.earned"
  | "product_update.sent"
  | "project.member_added"
  | "project.member_removed";

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
  "account.locked": "Account locked after repeated failed login attempts",
  "initiative.created": "Created an initiative",
  "subscription.tier_changed": "Changed subscription plan",
  "integration.connected": "Connected an integration",
  "integration.disconnected": "Disconnected an integration",
  "workflow.adopted": "Adopted a workflow",
  "workflow.stage_changed": "Changed a workflow's deployment stage",
  "workflow.owner_assigned": "Assigned a workflow owner",
  "specialist.assigned": "Assigned a specialist",
  "expert_help.requested": "Requested expert help",
  "tool.status_changed": "Changed a tool's approval status",
  "reward.points_awarded": "Earned AI points",
  "reward.redeemed": "Redeemed a reward",
  "reward.recognition_given": "Gave recognition",
  "reward.rules_updated": "Updated reward rules",
  "certification.earned": "Earned a certification",
  "product_update.sent": "Sent a product update email",
  "project.member_added": "Added a team member to a project",
  "project.member_removed": "Removed a team member from a project",
};

export function describeAuditAction(action: string): string {
  return ACTION_LABELS[action as AuditAction] ?? action;
}
