import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { actionWhere } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { OPEN_ACTION_STATUSES } from "@/lib/safety/pack";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ActionStatusBadge, dueLabel, fmtDate, fmtDateTime, Photos, SeverityBadge } from "@/components/safety/ui";
import { ActionControls, ActionPlanEditor } from "@/components/safety/ActionControls";
import { ActionProgress } from "@/components/safety/ActionProgress";

const STEPS = ["PROPOSED", "APPROVED", "IN_PROGRESS", "COMPLETED", "VERIFIED"];

export default async function ActionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireViewer();
  const { id } = await params;
  const a = await prisma.correctiveAction.findFirst({ where: { id, ...actionWhere(v) }, include: { report: { select: { id: true, number: true, title: true } } } });
  if (!a) notFound();

  const people = v.isSafetyTeam ? await prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }) : [];
  const ids = [a.ownerId, a.proposedById, a.approvedById, a.verifiedById].filter((x): x is string => Boolean(x));
  const named = await prisma.employee.findMany({ where: { id: { in: ids } }, include: { user: { select: { name: true } } } });
  const nm = (i: string | null) => (i ? named.find((n) => n.id === i)?.user.name ?? "The safety team" : null);
  const due = dueLabel(a.dueDate, OPEN_ACTION_STATUSES.includes(a.status));
  const isOwnerViewer = v.employeeId !== null && a.ownerId === v.employeeId;
  // Stages the viewer may move back to: the safety team any earlier one (or reopen), the owner one step of their own progress.
  const backTo = v.isSafetyTeam ? (a.status === "CANCELLED" ? STEPS.slice(0, 3) : STEPS.slice(0, Math.max(0, STEPS.indexOf(a.status)))) : isOwnerViewer && a.status === "IN_PROGRESS" ? ["APPROVED"] : isOwnerViewer && a.status === "COMPLETED" ? ["IN_PROGRESS"] : [];

  return (
    <div className="min-h-full bg-surface-muted">
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-8 sm:py-8">
      <div>
        <Link href="/dashboard/actions" className="text-xs font-medium text-ink-500 hover:text-ink-800">← Actions</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="tabular-nums text-xs text-ink-400">A-{a.number}</span>
          <ActionStatusBadge status={a.status} />
          <SeverityBadge severity={a.priority} />
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{a.title}</h1>
        {!a.report && a.inspectionId && v.isSafetyTeam && <p className="mt-1 text-sm text-ink-500">From a failed item on <Link href={`/dashboard/inspections/${a.inspectionId}`} className="text-orchid-deep hover:text-oxblood">an inspection</Link></p>}
        {a.report && <p className="mt-1 text-sm text-ink-500">From <Link href={`/dashboard/reports/${a.report.id}`} className="text-orchid-deep hover:text-oxblood">SR-{String(a.report.number).padStart(4, "0")} · {a.report.title}</Link></p>}
      </div>

      <Card tone="plain">
        <CardBody className="py-4">
          <ActionProgress actionId={a.id} status={a.status} backTo={backTo} />
        </CardBody>
      </Card>

      <Card tone="plain">
        <CardHeader title="Details" />
        <CardBody className="space-y-3">
          {a.description && <p className="whitespace-pre-wrap text-sm text-ink-800">{a.description}</p>}
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-ink-500">Owner</dt><dd>{nm(a.ownerId) ?? "No owner"}</dd></div>
            <div><dt className="text-xs text-ink-500">Due</dt><dd className={due.overdue ? "font-medium text-danger" : ""}>{a.dueDate ? `${fmtDate(a.dueDate)} · ${due.text}` : "No due date"}</dd></div>
            <div><dt className="text-xs text-ink-500">Proposed by</dt><dd>{nm(a.proposedById) ?? "—"}</dd></div>
            <div><dt className="text-xs text-ink-500">Approved</dt><dd>{a.approvedAt ? `${nm(a.approvedById) ?? "The safety team"} · ${fmtDate(a.approvedAt)}` : "Not yet"}</dd></div>
            <div><dt className="text-xs text-ink-500">Verified</dt><dd>{a.verifiedAt ? `${nm(a.verifiedById) ?? "The safety team"} · ${fmtDate(a.verifiedAt)}` : "Not yet"}</dd></div>
          </dl>
          {v.isSafetyTeam && !["VERIFIED", "CANCELLED"].includes(a.status) && (
            <details className="group border-t border-ink-100 pt-3">
              <summary className="cursor-pointer list-none text-xs font-medium text-orchid-deep hover:text-oxblood [&::-webkit-details-marker]:hidden">Change owner or due date</summary>
              <div className="mt-3"><ActionPlanEditor actionId={a.id} ownerId={a.ownerId} dueDate={a.dueDate ? a.dueDate.toISOString().slice(0, 10) : null} people={people.map((p) => ({ id: p.id, name: p.user.name, hint: p.jobTitle }))} /></div>
            </details>
          )}
        </CardBody>
      </Card>

      {(a.completionNotes || (Array.isArray(a.evidence) && a.evidence.length > 0)) && (
        <Card tone="plain">
          <CardHeader title={["COMPLETED", "VERIFIED"].includes(a.status) ? "Completion evidence" : "Earlier completion notes"} subtitle={a.completedAt ? `Marked done ${fmtDateTime(a.completedAt)}` : "From before it was moved back"} />
          <CardBody className="space-y-3">
            <p className="whitespace-pre-wrap text-sm text-ink-800">{a.completionNotes}</p>
            <Photos items={a.evidence} />
          </CardBody>
        </Card>
      )}

      <section aria-labelledby="next-step">
        <h2 id="next-step" className="mb-2 text-sm font-semibold text-ink-900">Next step</h2>
        <ActionControls
          actionId={a.id}
          status={a.status}
          ownerId={a.ownerId}
          ownerName={nm(a.ownerId)}
          dueDate={a.dueDate ? a.dueDate.toISOString().slice(0, 10) : null}
          isSafetyTeam={v.isSafetyTeam}
          isOwner={isOwnerViewer}
          people={people.map((p) => ({ id: p.id, name: p.user.name, hint: p.jobTitle }))}
        />
      </section>
    </div>
    </div>
  );
}
