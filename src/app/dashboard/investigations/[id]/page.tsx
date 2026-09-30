import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canSeeInvestigation } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { categoryLabel, getPack } from "@/lib/safety/pack";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionStatusBadge, InvestigationStatusBadge, NoAccess, SeverityBadge, fmtDate } from "@/components/safety/ui";
import { InvestigationForm } from "@/components/safety/InvestigationForm";
import { QuestionsPanel, StatementsPanel } from "@/components/safety/InvestigationExtras";
import { LeadSelect } from "@/components/safety/LeadSelect";

export default async function InvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireViewer();
  const { id } = await params;
  const inv = await prisma.investigation.findFirst({
    where: { id, organizationId: v.organizationId },
    include: { report: { include: { site: true, actions: true, incident: { select: { status: true } } } }, statements: { orderBy: { createdAt: "asc" } }, questions: { orderBy: { createdAt: "asc" } } },
  });
  if (!inv) notFound();
  if (!canSeeInvestigation(v, inv)) return <NoAccess what="this investigation" />;

  const pack = getPack();
  const people = v.isSafetyTeam ? await prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }) : [];
  const lead = inv.leadId ? (people.find((p) => p.id === inv.leadId) ?? (await prisma.employee.findUnique({ where: { id: inv.leadId }, include: { user: { select: { name: true } } } }))) : null;
  const r = inv.report;
  const photos = Array.isArray(r.attachments) ? (r.attachments as unknown[]).length : 0;

  const actionsLive = r.actions.filter((a) => a.status !== "CANCELLED");
  const answered = inv.questions.filter((q) => q.answer.trim()).length;
  const checks = [
    { key: "facts", label: "Facts recorded", done: Boolean(inv.facts.trim()), group: "findings" },
    { key: "sequence", label: "Sequence of events", done: Boolean(inv.sequenceNotes.trim()), group: "findings" },
    { key: "factors", label: "Contributing factors", done: inv.contributingFactors.length > 0, detail: inv.contributingFactors.length ? `${inv.contributingFactors.length} selected` : undefined, group: "findings" },
    { key: "root", label: "Root-cause reasoning", done: Boolean(inv.rootCauseNotes.trim()), detail: inv.rootCauseNotes.trim() ? undefined : "Written by the investigator", group: "findings" },
    { key: "questions", label: "Questions answered", done: inv.questions.length > 0 && answered === inv.questions.length, detail: inv.questions.length ? `${answered} of ${inv.questions.length}` : "None yet", group: "questions" },
    { key: "statements", label: "Statements collected", done: inv.statements.length > 0, detail: inv.statements.length ? String(inv.statements.length) : r.injuryInvolved ? "Injury recorded: add one" : undefined, group: "statements" },
    { key: "photos", label: "Photos on the report", done: photos > 0, group: "report" },
    { key: "actions", label: "Corrective actions with owner and date", done: actionsLive.length > 0 && actionsLive.every((a) => a.ownerId && a.dueDate), detail: actionsLive.length === 0 ? "None proposed" : undefined, group: "report" },
  ];
  const doneCount = checks.filter((c) => c.done).length;
  const findings = checks.filter((c) => c.group === "findings");
  const findingsDone = findings.filter((c) => c.done).length;
  const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  const Progress = ({ done, total, complete }: { done: number; total: number; complete?: boolean }) => (
    <span className={`inline-flex items-center gap-1.5 text-xs tabular-nums ${complete ?? done === total ? "text-sage-deep" : "text-ink-600"}`}>
      {(complete ?? done === total) && total > 0 && <span aria-hidden>✓</span>}{done} of {total}
    </span>
  );
  const SectionHead = ({ n, title, subtitle, tint, right }: { n: number; title: string; subtitle?: string; tint: string; right?: React.ReactNode }) => (
    <div className="flex items-center gap-3 border-b border-ink-200/60 bg-surface-muted px-4 py-3 sm:px-5">
      <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${tint}`}>{n}</span>
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-ink-900">{title}</h2>{subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}</div>
      {right}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
      <header>
        <Link href="/dashboard/investigations" className="text-xs font-medium text-ink-500 hover:text-ink-800">← Investigations</Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-ink-500">SR-{String(r.number).padStart(4, "0")}</span>
          <SeverityBadge severity={r.severity} suggested={!r.severityConfirmedAt} />
          <InvestigationStatusBadge status={inv.status} />
          <Badge tone="teal">{categoryLabel(r.category, pack)}</Badge>
        </div>
        <h1 className="mt-2 text-2xl font-semibold leading-tight text-ink-900">{r.title}</h1>
        <p className="mt-1.5 text-sm text-ink-600">
          {r.site?.name ?? "Site not given"} · {fmtDate(r.occurredAt)} · <Link href={`/dashboard/reports/${r.id}`} className="font-medium text-orchid-deep hover:text-oxblood">View the report{r.incident && r.incident.status !== "RESOLVED" ? " and incident response" : ""}</Link>
        </p>
        <p className="mt-4 rounded-lg bg-surface-muted px-4 py-3 text-xs leading-relaxed text-ink-600">
          This review looks at what happened and which conditions contributed, so they can be fixed. It is not about finding fault. Only the safety team and the investigation lead can see it. AI drafts help with wording and questions. The findings and reasoning are yours.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-8">
          <section aria-labelledby="findings" className="overflow-hidden rounded-xl border border-ink-200/80 bg-white">
            <SectionHead n={1} title="Findings" subtitle="What happened, and why the conditions existed." tint="bg-orchid-soft text-orchid-deep" right={<Progress done={findingsDone} total={findings.length} />} />
            <div className="px-4 py-5 sm:px-5">
              <InvestigationForm
                investigationId={inv.id}
                reportId={r.id}
                initial={{ facts: inv.facts, sequenceNotes: inv.sequenceNotes, factors: inv.contributingFactors, rootCauseNotes: inv.rootCauseNotes, lessonText: inv.lessonText, shareLesson: inv.shareLesson }}
                factors={pack.contributingFactors}
                status={inv.status}
                isSafetyTeam={v.isSafetyTeam}
              />
            </div>
          </section>

          <section aria-labelledby="questions" className="overflow-hidden rounded-xl border border-ink-200/80 bg-white">
            <SectionHead n={2} title="Questions" subtitle="Collect answers from supervisors, workers, and managers." tint="bg-sky-soft text-sky-deep" right={inv.questions.length > 0 ? <Progress done={answered} total={inv.questions.length} /> : undefined} />
            <div className="px-4 py-5 sm:px-5">
              <QuestionsPanel investigationId={inv.id} reportId={r.id} canEdit={inv.status !== "COMPLETE" || v.isSafetyTeam} questions={inv.questions.map((q) => ({ id: q.id, text: q.text, answer: q.answer, aiDrafted: q.aiDrafted }))} />
            </div>
          </section>

          <section aria-labelledby="statements" className="overflow-hidden rounded-xl border border-ink-200/80 bg-white">
            <SectionHead n={3} title="Statements" subtitle="What people involved or nearby said, in their own words." tint="bg-gold-soft text-gold-deep" right={<span className="text-xs tabular-nums text-ink-600">{inv.statements.length} recorded</span>} />
            <div className="px-4 py-5 sm:px-5">
              <StatementsPanel investigationId={inv.id} statements={inv.statements.map((s) => ({ id: s.id, providedBy: s.providedBy, content: s.content, addedByName: s.addedByName, createdAt: s.createdAt.toISOString() }))} />
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card tone="muted">
            <CardBody className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Lead</h2>
              {v.isSafetyTeam ? (
                <LeadSelect investigationId={inv.id} leadId={inv.leadId} people={people.map((p) => ({ id: p.id, name: p.user.name }))} />
              ) : (
                <p className="flex items-center gap-2 text-sm text-ink-800">{lead && <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-orchid-soft text-[10px] font-semibold text-orchid-deep">{initials(lead.user.name)}</span>}{lead?.user.name ?? "No lead assigned"}</p>
              )}
            </CardBody>
          </Card>

          <Card tone="muted">
            <CardBody className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Evidence check</h2>
                <span className="text-xs tabular-nums text-ink-600">{doneCount} of {checks.length}</span>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={checks.length} aria-valuenow={doneCount} aria-label="Evidence recorded" className="h-1.5 overflow-hidden rounded-full bg-ink-200/70">
                <div className={`h-full rounded-full ${doneCount === checks.length ? "bg-sage-deep" : "bg-orchid-deep"}`} style={{ width: `${(doneCount / checks.length) * 100}%` }} />
              </div>
              <ul className="space-y-2">
                {checks.map((c) => (
                  <li key={c.key} className="flex items-start gap-2.5 text-[13px]">
                    <span aria-hidden className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${c.done ? "bg-sage-deep text-white" : "border border-amber-deep/60 bg-white text-transparent"}`}>{c.done ? "✓" : "·"}</span>
                    <span className={c.done ? "text-ink-700" : "text-ink-900"}>
                      {c.label}
                      {c.detail && <span className={`block text-xs ${c.done ? "text-ink-500" : "text-amber-deep"}`}>{c.detail}</span>}
                      <span className="sr-only">{c.done ? " (done)" : " (missing)"}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] leading-snug text-ink-500">Simple checks on what is recorded. These are not AI.{doneCount === checks.length ? " Nothing obvious is missing. That does not mean the investigation is complete." : ""}</p>
            </CardBody>
          </Card>

          <Card tone="muted">
            <CardBody className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Linked corrective actions</h2>
              {r.actions.length === 0 ? (
                <p className="text-sm text-ink-500">None yet. Add them from the report.</p>
              ) : (
                <ul className="space-y-2">
                  {r.actions.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-2 text-[13px]">
                      <Link href={`/dashboard/actions/${a.id}`} className="min-w-0 text-ink-900 hover:text-orchid-deep"><span className="font-mono text-xs text-ink-500">A-{a.number}</span> <span className="line-clamp-2">{a.title}</span></Link>
                      <ActionStatusBadge status={a.status} />
                    </li>
                  ))}
                </ul>
              )}
              <Link href={`/dashboard/reports/${r.id}`} className="inline-block text-xs font-medium text-orchid-deep hover:text-oxblood">Manage corrective actions on the report →</Link>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
