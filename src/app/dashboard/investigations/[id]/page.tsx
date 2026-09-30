import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canSeeInvestigation } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { categoryLabel, getPack } from "@/lib/safety/pack";
import { findEvidenceGaps } from "@/lib/safety/ai";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { InvestigationStatusBadge, NoAccess, SeverityBadge, fmtDate } from "@/components/safety/ui";
import { InvestigationForm } from "@/components/safety/InvestigationForm";
import { QuestionsPanel, StatementsPanel } from "@/components/safety/InvestigationExtras";
import { LeadSelect } from "@/components/safety/LeadSelect";

export default async function InvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireViewer();
  const { id } = await params;
  const inv = await prisma.investigation.findFirst({
    where: { id, organizationId: v.organizationId },
    include: { report: { include: { site: true, actions: true } }, statements: { orderBy: { createdAt: "asc" } }, questions: { orderBy: { createdAt: "asc" } } },
  });
  if (!inv) notFound();
  if (!canSeeInvestigation(v, inv)) return <NoAccess what="this investigation" />;

  const pack = getPack();
  const people = v.isSafetyTeam ? await prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }) : [];
  const lead = inv.leadId ? (people.find((p) => p.id === inv.leadId) ?? (await prisma.employee.findUnique({ where: { id: inv.leadId }, include: { user: { select: { name: true } } } }))) : null;
  const r = inv.report;
  const photos = Array.isArray(r.attachments) ? (r.attachments as unknown[]).length : 0;

  const { gaps } = findEvidenceGaps({
    photoCount: photos,
    statementCount: inv.statements.length,
    hasFacts: Boolean(inv.facts.trim()),
    hasSequence: Boolean(inv.sequenceNotes.trim()),
    factorCount: inv.contributingFactors.length,
    hasRootCauseNotes: Boolean(inv.rootCauseNotes.trim()),
    unansweredQuestions: inv.questions.filter((q) => !q.answer.trim()).length,
    actions: r.actions.filter((a) => a.status !== "CANCELLED").map((a) => ({ ownerId: a.ownerId, dueDate: a.dueDate })),
    injuryInvolved: r.injuryInvolved,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div>
        <Link href="/dashboard/investigations" className="text-xs font-medium text-ink-500 hover:text-ink-800">← Investigations</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-ink-400">SR-{String(r.number).padStart(4, "0")}</span>
          <SeverityBadge severity={r.severity} />
          <InvestigationStatusBadge status={inv.status} />
          <Badge>{categoryLabel(r.category, pack)}</Badge>
        </div>
        <h1 className="mt-2 text-xl font-semibold text-ink-900">{r.title}</h1>
        <p className="mt-1 text-sm text-ink-500">
          {r.site?.name ?? "No site"} · {fmtDate(r.occurredAt)} · <Link href={`/dashboard/reports/${r.id}`} className="text-orchid-deep hover:text-oxblood">View the original report</Link>
        </p>
      </div>

      <div className="rounded-lg bg-surface-sunken px-4 py-3 text-xs text-ink-600">
        This workspace is for understanding what happened and why, so the conditions can be fixed. It is limited to the safety team and the investigation lead. Reldro drafts help with wording and questions; the findings and root-cause reasoning are yours.
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr,18rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Findings" />
            <CardBody>
              <InvestigationForm
                investigationId={inv.id}
                reportId={r.id}
                initial={{ facts: inv.facts, sequenceNotes: inv.sequenceNotes, factors: inv.contributingFactors, rootCauseNotes: inv.rootCauseNotes, lessonText: inv.lessonText, shareLesson: inv.shareLesson }}
                factors={pack.contributingFactors}
                status={inv.status}
                isSafetyTeam={v.isSafetyTeam}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Questions" subtitle="Collect answers from supervisors, workers and managers." />
            <CardBody>
              <QuestionsPanel investigationId={inv.id} reportId={r.id} canEdit={inv.status !== "COMPLETE" || v.isSafetyTeam} questions={inv.questions.map((q) => ({ id: q.id, text: q.text, answer: q.answer, aiDrafted: q.aiDrafted }))} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Statements" />
            <CardBody>
              <StatementsPanel investigationId={inv.id} statements={inv.statements.map((s) => ({ id: s.id, providedBy: s.providedBy, content: s.content, addedByName: s.addedByName, createdAt: s.createdAt.toISOString() }))} />
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader title="Lead" />
            <CardBody>
              {v.isSafetyTeam ? (
                <LeadSelect investigationId={inv.id} leadId={inv.leadId} people={people.map((p) => ({ id: p.id, name: p.user.name }))} />
              ) : (
                <p className="text-sm text-ink-800">{lead?.user.name ?? "Not assigned"}</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Evidence check" subtitle="Simple checks on what's recorded. Not AI." />
            <CardBody>
              {gaps.length === 0 ? (
                <p className="text-sm text-sage-deep">Nothing obviously missing. That doesn't mean the investigation is complete.</p>
              ) : (
                <ul className="space-y-1.5 text-sm text-ink-700">
                  {gaps.map((g) => (
                    <li key={g} className="flex gap-2"><span aria-hidden>•</span>{g}</li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Linked actions" />
            <CardBody>
              {r.actions.length === 0 ? (
                <p className="text-sm text-ink-500">None yet. Add them from the report.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {r.actions.map((a) => (
                    <li key={a.id}><Link href={`/dashboard/actions/${a.id}`} className="text-orchid-deep hover:text-oxblood">A-{a.number} {a.title}</Link></li>
                  ))}
                </ul>
              )}
              <Link href={`/dashboard/reports/${r.id}`} className="mt-3 inline-block text-xs font-medium text-ink-600 hover:text-ink-900">Manage actions on the report →</Link>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
