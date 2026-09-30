import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { fmtDate, NoAccess } from "@/components/safety/ui";
import { QualificationEditForm, RemoveQualificationButton, StatusBadge, type QualStatus } from "@/components/safety/QualificationTable";

export default async function QualificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await requireViewer();
  if (!v.isSafetyTeam && !v.isSupervisor) return <NoAccess what="qualification records" />;
  const q = await prisma.qualification.findFirst({ where: { id, organizationId: v.organizationId } });
  if (!q) notFound();
  const emp = await prisma.employee.findUnique({ where: { id: q.employeeId }, include: { user: { select: { name: true, email: true } }, department: true } });
  if (!emp) notFound();
  if (!v.isSafetyTeam && (!v.siteId || emp.siteId !== v.siteId)) return <NoAccess what="this person's qualifications" />;
  const site = emp.siteId ? await prisma.site.findUnique({ where: { id: emp.siteId }, select: { name: true } }) : null;
  const now = new Date();
  const status: QualStatus = q.expiresOn && q.expiresOn < now ? "expired" : q.expiresOn && q.expiresOn <= new Date(Date.now() + 30 * 86400_000) ? "soon" : "current";
  // History: every record of this qualification for this person, newest first.
  const history = await prisma.qualification.findMany({ where: { organizationId: v.organizationId, employeeId: q.employeeId, name: q.name }, orderBy: [{ issuedOn: "desc" }, { createdAt: "desc" }] });
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
  const stat = (d: Date | null): QualStatus => (d && d < now ? "expired" : d && d <= new Date(Date.now() + 30 * 86400_000) ? "soon" : "current");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
      <Link href="/dashboard/training?tab=qualifications" className="text-xs font-medium text-ink-500 hover:text-ink-800">← Qualifications</Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{q.name}</h1>
          <p className="mt-1 text-sm text-ink-600"><span className="font-semibold text-ink-900">{emp.user.name}</span> · {emp.jobTitle}{site ? ` · ${site.name}` : ""}{emp.department ? ` · ${emp.department.name}` : ""}</p>
        </div>
        <StatusBadge status={status} />
      </header>

      <section aria-labelledby="qual-details" className="expand-panel overflow-hidden">
        <div className="border-b border-ink-100 px-4 py-3 sm:px-5"><h2 id="qual-details" className="text-sm font-semibold text-ink-900">Details</h2><p className="text-xs text-ink-500">Change the name or dates. Saved changes apply straight away.</p></div>
        <div className="space-y-4 px-4 py-5 sm:px-5">
          <QualificationEditForm id={q.id} name={q.name} issuedIso={iso(q.issuedOn)} expiresIso={iso(q.expiresOn)} />
          <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
            <p className="text-xs text-ink-500">Recorded {fmtDate(q.createdAt)}</p>
            <RemoveQualificationButton id={q.id} label={`${emp.user.name}, ${q.name}`} />
          </div>
        </div>
      </section>

      <section aria-labelledby="qual-history" className="surface overflow-hidden">
        <div className="border-b border-ink-100 px-4 py-3 sm:px-5"><h2 id="qual-history" className="text-sm font-semibold text-ink-900">History</h2><p className="text-xs text-ink-500">Every record of {q.name} for {emp.user.name}.</p></div>
        <ul className="divide-y divide-ink-100">
          {history.map((h) => (
            <li key={h.id} className="flex min-h-[2.75rem] flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
              <div className="min-w-0 text-sm">
                {h.id === q.id ? <span className="font-semibold text-ink-900">This record</span> : <Link href={`/dashboard/training/qualifications/${h.id}`} className="font-medium text-orchid-deep hover:text-oxblood">View record</Link>}
                <span className="ml-2 text-xs text-ink-500">{h.issuedOn ? `Issued ${fmtDate(h.issuedOn)}` : "No issue date"} · {h.expiresOn ? `Expires ${fmtDate(h.expiresOn)}` : "No expiry"}</span>
              </div>
              <StatusBadge status={stat(h.expiresOn)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
