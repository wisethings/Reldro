import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { actionWhere } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { actionStatusInfo, OPEN_ACTION_STATUSES } from "@/lib/safety/pack";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ActionStatusBadge, dueLabel, fmtDate, fmtDateTime, Photos, SeverityBadge } from "@/components/safety/ui";
import { ActionControls } from "@/components/safety/ActionControls";

const STEPS = ["PROPOSED", "APPROVED", "IN_PROGRESS", "COMPLETED", "VERIFIED"];

export default async function ActionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireViewer();
  const { id } = await params;
  const a = await prisma.correctiveAction.findFirst({ where: { id, ...actionWhere(v) }, include: { report: { select: { id: true, number: true, title: true } } } });
  if (!a) notFound();

  const people = v.isSafetyTeam ? await prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }) : [];
  const ids = [a.ownerId, a.proposedById, a.approvedById, a.verifiedById].filter((x): x is string => Boolean(x));
  const named = await prisma.employee.findMany({ where: { id: { in: ids } }, include: { user: { select: { name: true } } } });
  const nm = (i: string | null) => (i ? named.find((n) => n.id === i)?.user.name ?? "Someone" : null);
  const due = dueLabel(a.dueDate, OPEN_ACTION_STATUSES.includes(a.status));
  const stepIndex = STEPS.indexOf(a.status);

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <Link href="/dashboard/actions" className="text-xs font-medium text-ink-500 hover:text-ink-800">← Actions</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-ink-400">A-{a.number}</span>
          <ActionStatusBadge status={a.status} />
          <SeverityBadge severity={a.priority} />
        </div>
        <h1 className="mt-2 text-xl font-semibold text-ink-900">{a.title}</h1>
        {!a.report && a.inspectionId && v.isSafetyTeam && <p className="mt-1 text-sm text-ink-500">From a failed item on <Link href={`/dashboard/inspections/${a.inspectionId}`} className="text-orchid-deep hover:text-oxblood">an inspection</Link></p>}
        {a.report && <p className="mt-1 text-sm text-ink-500">From <Link href={`/dashboard/reports/${a.report.id}`} className="text-orchid-deep hover:text-oxblood">SR-{String(a.report.number).padStart(4, "0")} · {a.report.title}</Link></p>}
      </div>

      <ol className="grid grid-cols-5 gap-1 text-center text-[11px] font-medium" aria-label="Progress">
        {STEPS.map((s, i) => {
          const reached = a.status !== "CANCELLED" && stepIndex >= i;
          return (
            <li key={s} className={`rounded-md px-1 py-1.5 ${reached ? "bg-sage text-sage-deep" : "bg-surface-sunken text-ink-400"}`}>{actionStatusInfo(s).label.replace("Done, awaiting check", "Done")}</li>
          );
        })}
      </ol>
      {a.status === "CANCELLED" && <p className="rounded-lg bg-surface-sunken px-4 py-3 text-sm text-ink-600">This action was cancelled.</p>}
      {a.status === "COMPLETED" && <p className="rounded-lg bg-orchid-soft px-4 py-3 text-sm text-orchid-deep">Marked done. It isn't counted as fixed until the safety team verifies it.</p>}

      <Card>
        <CardHeader title="Details" />
        <CardBody className="space-y-3">
          {a.description && <p className="whitespace-pre-wrap text-sm text-ink-800">{a.description}</p>}
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-ink-500">Owner</dt><dd>{nm(a.ownerId) ?? "Unassigned"}</dd></div>
            <div><dt className="text-xs text-ink-500">Due</dt><dd className={due.overdue ? "font-medium text-danger" : ""}>{a.dueDate ? `${fmtDate(a.dueDate)} · ${due.text}` : "No due date"}</dd></div>
            <div><dt className="text-xs text-ink-500">Proposed by</dt><dd>{nm(a.proposedById) ?? "—"}</dd></div>
            <div><dt className="text-xs text-ink-500">Approved</dt><dd>{a.approvedAt ? `${nm(a.approvedById) ?? "Someone"} · ${fmtDate(a.approvedAt)}` : "Not yet"}</dd></div>
            <div><dt className="text-xs text-ink-500">Verified complete</dt><dd>{a.verifiedAt ? `${nm(a.verifiedById) ?? "Someone"} · ${fmtDate(a.verifiedAt)}` : "Not yet"}</dd></div>
          </dl>
        </CardBody>
      </Card>

      {(a.completionNotes || (Array.isArray(a.evidence) && a.evidence.length > 0)) && (
        <Card>
          <CardHeader title="Completion evidence" subtitle={a.completedAt ? `Marked done ${fmtDateTime(a.completedAt)}` : undefined} />
          <CardBody className="space-y-3">
            <p className="whitespace-pre-wrap text-sm text-ink-800">{a.completionNotes}</p>
            <Photos items={a.evidence} />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Next step" />
        <CardBody>
          <ActionControls
            actionId={a.id}
            status={a.status}
            ownerId={a.ownerId}
            dueDate={a.dueDate ? a.dueDate.toISOString().slice(0, 10) : null}
            isSafetyTeam={v.isSafetyTeam}
            isOwner={v.employeeId !== null && a.ownerId === v.employeeId}
            people={people.map((p) => ({ id: p.id, name: p.user.name }))}
          />
          {["VERIFIED", "CANCELLED"].includes(a.status) && !v.isSafetyTeam && <p className="text-sm text-ink-500">Nothing more to do here.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
