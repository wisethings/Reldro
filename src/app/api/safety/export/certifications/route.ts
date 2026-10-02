import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFreshSession } from "@/lib/auth/guards";
import { loadViewer } from "@/lib/safety/access";
import { logAudit } from "@/lib/audit";
import { requirementsFor, STATE_LABEL } from "@/lib/safety/certifications";
import { qualStatus } from "@/lib/safety/dates";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // Prevent spreadsheet formula injection from user-entered text.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/** ?kind=records (every certification record) or ?kind=gaps (required certifications that are missing, expired or expiring). Safety team only. */
export async function GET(request: NextRequest) {
  const session = await getFreshSession();
  if (!session?.organizationId || session.role === "PLATFORM_ADMIN" || session.role === "SPECIALIST") return new NextResponse("Unauthorized", { status: 401 });
  const v = await loadViewer(session);
  if (!v.isSafetyTeam) return new NextResponse("Forbidden", { status: 403 });

  const kind = request.nextUrl.searchParams.get("kind") === "gaps" ? "gaps" : "records";
  const [people, sites, crews, types, records] = await Promise.all([
    prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
    prisma.site.findMany({ where: { organizationId: v.organizationId }, select: { id: true, name: true } }),
    prisma.department.findMany({ where: { organizationId: v.organizationId }, select: { id: true, name: true } }),
    prisma.certificationType.findMany({ where: { organizationId: v.organizationId }, orderBy: { name: "asc" } }),
    prisma.qualification.findMany({ where: { organizationId: v.organizationId } }),
  ]);
  const siteName = new Map(sites.map((s) => [s.id, s.name]));
  const crewName = new Map(crews.map((c) => [c.id, c.name]));
  const person = new Map(people.map((p) => [p.id, p]));

  let header: string[];
  let rows: unknown[][];
  if (kind === "records") {
    const label = { expired: "Expired", soon: "Expiring soon", current: "Current" } as const;
    const category = new Map(types.map((t) => [t.id, t.category]));
    header = ["Person", "Job title", "Site", "Crew", "Certification", "Category", "Certificate number", "Issuing body", "Issued", "Expires", "Status", "Verified", "Notes"];
    rows = records
      .filter((r) => person.has(r.employeeId))
      .sort((a, b) => (person.get(a.employeeId)!.user.name).localeCompare(person.get(b.employeeId)!.user.name) || a.name.localeCompare(b.name))
      .map((r) => {
        const p = person.get(r.employeeId)!;
        return [p.user.name, p.jobTitle, siteName.get(p.siteId ?? "") ?? "", crewName.get(p.departmentId ?? "") ?? "", r.name, category.get(r.typeId ?? "") ?? "", r.certificateNumber, r.issuingBody, day(r.issuedOn), day(r.expiresOn), label[qualStatus(r.expiresOn)], r.verifiedAt ? day(r.verifiedAt) : "No", r.notes];
      });
  } else {
    const name = new Map(types.map((t) => [t.id, t.name]));
    const reqs = requirementsFor(types, people.map((p) => ({ id: p.id, siteId: p.siteId, departmentId: p.departmentId })), records).filter((r) => r.state !== "valid");
    header = ["Person", "Job title", "Site", "Crew", "Required certification", "Status", "Expires"];
    rows = reqs
      .sort((a, b) => person.get(a.employeeId)!.user.name.localeCompare(person.get(b.employeeId)!.user.name) || (name.get(a.typeId) ?? "").localeCompare(name.get(b.typeId) ?? ""))
      .map((r) => {
        const p = person.get(r.employeeId)!;
        return [p.user.name, p.jobTitle, siteName.get(p.siteId ?? "") ?? "", crewName.get(p.departmentId ?? "") ?? "", name.get(r.typeId) ?? "", STATE_LABEL[r.state], day(r.record?.expiresOn ?? null)];
      });
  }

  await logAudit({ organizationId: v.organizationId, userId: v.userId, action: "safety.exported", entityType: "Qualification", metadata: { kind, rows: rows.length } });
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="certifications-${kind}.csv"`, "Cache-Control": "no-store" } });
}
