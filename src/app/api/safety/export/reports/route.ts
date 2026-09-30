import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFreshSession } from "@/lib/auth/guards";
import { loadViewer } from "@/lib/safety/access";
import { logAudit } from "@/lib/audit";
import { categoryLabel, reportTypeLabel, severityInfo } from "@/lib/safety/pack";
import { REPORT_LIST_FIELDS } from "@/lib/safety/selects";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // Prevent spreadsheet formula injection from user-entered text.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(request: NextRequest) {
  const session = await getFreshSession();
  if (!session?.organizationId || session.role === "PLATFORM_ADMIN" || session.role === "SPECIALIST") return new NextResponse("Unauthorized", { status: 401 });
  const v = await loadViewer(session);
  if (!v.isSafetyTeam) return new NextResponse("Forbidden", { status: 403 });

  const days = Math.min(3650, Math.max(1, Number(request.nextUrl.searchParams.get("days")) || 90));
  const since = new Date(Date.now() - days * 86400_000);
  const reports = await prisma.safetyReport.findMany({ where: { organizationId: v.organizationId, createdAt: { gte: since } }, select: { ...REPORT_LIST_FIELDS, site: true, incident: { select: { status: true } } }, orderBy: { number: "asc" } });

  // Reporter names are deliberately not exported; confidential and anonymous reports stay that way.
  // The free-text title and description are exported as written, so they can still contain names people typed.
  const header = ["Reference", "Reported", "Occurred", "Kind", "Topic", "Seriousness", "Seriousness confirmed", "Status", "Incident response", "Site", "Location detail", "Injury involved", "Title", "Description"];
  const rows = reports.map((r) => [`SR-${String(r.number).padStart(4, "0")}`, r.createdAt.toISOString(), r.occurredAt.toISOString(), reportTypeLabel(r.type), categoryLabel(r.category), severityInfo(r.severity).label, r.severityConfirmedAt ? "Yes" : "No (suggested)", r.status, r.incident ? r.incident.status : "", r.site?.name ?? "", r.locationNote, r.injuryInvolved ? "Yes" : "No", r.title, r.description]);
  await logAudit({ organizationId: v.organizationId, userId: v.userId, action: "safety.exported", entityType: "SafetyReport", metadata: { days, rows: rows.length } });

  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="safety-reports-${days}d.csv"` } });
}
