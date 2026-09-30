import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import { loadViewer, type Viewer } from "./access";
import { logAudit, type AuditAction } from "@/lib/audit";

/** Session + org + resolved permissions in one call, for pages and actions alike. */
export async function requireViewer(): Promise<Viewer> {
  const session = await requireSession();
  if (!session.organizationId || session.role === "PLATFORM_ADMIN" || session.role === "SPECIALIST") redirect("/login");
  return loadViewer(session);
}

export async function addReportEvent(params: {
  reportId: string;
  type: string;
  message: string;
  actor?: { name: string; employeeId: string | null } | null;
  restricted?: boolean;
  toReporter?: boolean;
  attachments?: { name: string; dataUri: string }[];
}) {
  await prisma.reportEvent.create({
    data: {
      reportId: params.reportId,
      type: params.type,
      message: params.message,
      actorName: params.actor?.name ?? "",
      actorId: params.actor?.employeeId ?? null,
      restricted: params.restricted ?? false,
      toReporter: params.toReporter ?? false,
      attachments: params.attachments ?? [],
    },
  });
}

export async function audit(v: Viewer, action: AuditAction, entityType: string, entityId: string, metadata?: Record<string, unknown>) {
  await logAudit({ organizationId: v.organizationId, userId: v.userId, action, entityType, entityId, metadata });
}

/**
 * Audit entry for something an anonymous reporter did. Deliberately stores no user, so the
 * activity log can never be used to work out who filed an anonymous report.
 */
export async function auditAnonymous(organizationId: string, action: AuditAction, entityType: string, entityId: string, metadata?: Record<string, unknown>) {
  await logAudit({ organizationId, userId: null, action, entityType, entityId, metadata });
}

/** Next per-organization sequence number, retried by callers on the (rare) unique-constraint race. */
export async function nextReportNumber(organizationId: string) {
  const max = await prisma.safetyReport.aggregate({ where: { organizationId }, _max: { number: true } });
  return (max._max.number ?? 0) + 1;
}

export async function nextActionNumber(organizationId: string) {
  const max = await prisma.correctiveAction.aggregate({ where: { organizationId }, _max: { number: true } });
  return (max._max.number ?? 0) + 1;
}

/** Validates client-compressed image data URIs before they are stored on a report or an action. */
export function cleanAttachments(values: FormDataEntryValue[], max = 3): { name: string; dataUri: string }[] {
  return values
    .map(String)
    .filter((v) => v.startsWith("data:image/") && v.length < 1_200_000)
    .slice(0, max)
    .map((dataUri, i) => ({ name: `Photo ${i + 1}`, dataUri }));
}

export const isoOrNull = (v: FormDataEntryValue | null): Date | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};
