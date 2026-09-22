import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { adoptWorkflow } from "@/lib/actions/workflows";
import { RequestExpertHelpForm } from "@/components/specialists/RequestExpertHelpForm";

const DIFFICULTY_TONE = { LOW: "green", MEDIUM: "amber", HIGH: "red" } as const;

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const { id } = await params;

  const [workflow, orgWorkflow, courses] = await Promise.all([
    prisma.workflow.findUnique({ where: { id }, include: { steps: { orderBy: { order: "asc" } } } }),
    prisma.organizationWorkflow.findUnique({
      where: { organizationId_workflowId: { organizationId: session.organizationId, workflowId: id } },
    }),
    prisma.course.findMany({ where: { workflowId: id }, include: { lessons: true } }),
  ]);
  if (!workflow) notFound();

  const status = orgWorkflow?.status ?? "NOT_ADOPTED";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <Link href="/dashboard/workflows" className="text-xs font-medium text-ink-500 hover:text-ink-800">
          ← Workflow library
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{workflow.title}</h1>
            <p className="mt-1 text-sm text-ink-500">{workflow.department}</p>
          </div>
          <form action={adoptWorkflow.bind(null, workflow.id)}>
            <button className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
              {status === "ADOPTED" ? "Re-confirm adoption" : "Adopt workflow"}
            </button>
          </form>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone={DIFFICULTY_TONE[workflow.difficulty]}>{workflow.difficulty.toLowerCase()} difficulty</Badge>
          <Badge>{workflow.skillLevel} skill level</Badge>
          <Badge tone={status === "ADOPTED" ? "green" : "neutral"}>{status.replace("_", " ").toLowerCase()}</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Time saved" value={`${workflow.timeSavedMinutes} min/day`} />
        <Stat label="Tools required" value={workflow.toolsRequired.join(", ") || "None"} />
        <Stat label="Skills required" value={workflow.skillsRequired.join(", ") || "AI fundamentals"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Current process" />
          <CardBody>
            <p className="text-sm text-ink-700">{workflow.currentProcess}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="AI-enabled process" />
          <CardBody>
            <p className="text-sm text-ink-700">{workflow.aiProcess}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Step-by-step process" />
        <CardBody className="space-y-4 p-0 divide-y divide-ink-200">
          {workflow.steps.map((step) => (
            <div key={step.id} className="flex gap-4 px-5 py-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                {step.order}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink-900">{step.title}</p>
                  {step.humanCheckpoint && <Badge tone="amber">Human checkpoint</Badge>}
                </div>
                <p className="mt-1 text-sm text-ink-600">{step.description}</p>
                {step.aiPrompt && (
                  <div className="mt-2 rounded-lg bg-ink-50 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Example AI prompt</p>
                    <p className="mt-1 font-mono text-xs text-ink-700">{step.aiPrompt}</p>
                  </div>
                )}
                <div className="mt-2 flex gap-3 text-xs font-medium text-orchid-deep">
                  {courses[0] && <Link href={`/dashboard/learn?course=${courses[0].id}`}>Learn</Link>}
                  <span className="text-ink-300">·</span>
                  <span className="text-ink-400">Practice</span>
                  <span className="text-ink-300">·</span>
                  <span className="text-ink-400">Implement</span>
                </div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {(workflow.securityNotes || workflow.trainingNotes) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {workflow.securityNotes && (
            <Card>
              <CardHeader title="Security considerations" />
              <CardBody>
                <p className="text-sm text-ink-700">{workflow.securityNotes}</p>
              </CardBody>
            </Card>
          )}
          {workflow.trainingNotes && (
            <Card>
              <CardHeader title="Training requirements" />
              <CardBody>
                <p className="text-sm text-ink-700">{workflow.trainingNotes}</p>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader title="Implementation checklist" />
        <CardBody>
          <ul className="space-y-2">
            {["Review current process with the team", "Confirm access to required tools", "Assign an owner for rollout", ...workflow.steps.slice(0, 3).map((s) => `Train employees on: ${s.title}`), "Measure adoption after 30 days"].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-ink-700">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-ink-300" />
                {item}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {courses.length > 0 && (
        <Card>
          <CardHeader title="Recommended learning" />
          <CardBody className="divide-y divide-ink-200 p-0">
            {courses.map((c) => (
              <Link key={c.id} href={`/dashboard/learn?course=${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-ink-50">
                <span className="text-sm font-medium text-ink-900">{c.title}</span>
                <span className="text-xs text-ink-500">{c.lessons.length} lessons</span>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}

      {workflow.difficulty === "HIGH" && (
        <Card>
          <CardHeader title="Consider expert help" subtitle="High-complexity workflows implement faster with outside expertise" />
          <CardBody>
            <RequestExpertHelpForm workflowId={workflow.id} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
