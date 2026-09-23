import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { ScoreRing, ProgressBar } from "@/components/ui/Progress";
import { getEmployeeAiProfile, getEmployeeMilestones } from "@/lib/queries/employeeProfile";
import { EMPLOYEE_SKILL_LABELS, type EmployeeSkillCategory } from "@/lib/scoring";
import { CAPABILITY_LEVEL_LABEL, CAPABILITY_LEVEL_DESCRIPTION } from "@/lib/employeeCapability";

export default async function EmployeeProfilePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const { employeeId } = await params;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true, department: true },
  });
  if (!employee || employee.organizationId !== session.organizationId) notFound();

  const isSelf = session.employeeId === employeeId;
  const isCompanyAdmin = session.role === "COMPANY_ADMIN";
  let isDeptAdminOfThem = false;
  if (!isSelf && !isCompanyAdmin && session.employeeId) {
    const me = await prisma.employee.findUnique({ where: { id: session.employeeId } });
    isDeptAdminOfThem = Boolean(me?.isDepartmentAdmin && me.departmentId === employee.departmentId);
  }
  if (!isSelf && !isCompanyAdmin && !isDeptAdminOfThem) redirect("/dashboard/overview");

  const [profile, milestones] = await Promise.all([
    getEmployeeAiProfile(session.organizationId, employeeId),
    getEmployeeMilestones(employeeId),
  ]);

  const level = profile.capabilityLevel;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/dashboard/team" className="text-xs font-medium text-ink-500 hover:text-ink-800">
          ← Team
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{employee.user.name}</h1>
            <p className="mt-1 text-sm text-ink-500">
              {employee.jobTitle} · {employee.department?.name ?? "No department"}
            </p>
          </div>
          <Badge tone="brand">{CAPABILITY_LEVEL_LABEL[level]}</Badge>
        </div>
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-center gap-6">
          <ScoreRing value={profile.fluency?.overallScore ?? 0} size={100} label="/ 100" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900">AI Fluency</p>
            <p className="text-xs text-ink-500">
              {profile.fluency ? `Last assessed ${profile.fluency.assessedAt.toLocaleDateString()}` : "No assessment completed yet"}
            </p>
            <p className="mt-2 text-sm text-ink-700">
              <span className="font-medium text-ink-900">{CAPABILITY_LEVEL_LABEL[level]}</span> — {CAPABILITY_LEVEL_DESCRIPTION[level]}
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active last 30 days" value={profile.activeLast30Days ? "Yes" : "No"} />
        <StatTile label="Lessons completed" value={profile.lessonsCompleted} />
        <StatTile label="Workflows used" value={profile.workflowsUsed.length} />
        <StatTile label="Est. hours saved/mo" value={profile.estimatedHoursSavedMonthly} helpText="Attributed from workflows they use" />
      </div>

      {profile.estimatedAnnualValueContributed > 0 && (
        <Card>
          <CardBody>
            <p className="text-xs text-ink-500">Estimated annual value contributed</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">${profile.estimatedAnnualValueContributed.toLocaleString()}</p>
            <p className="mt-1 text-xs text-ink-400">
              This person's share of captured value across the deployed workflows they actually use.
            </p>
          </CardBody>
        </Card>
      )}

      {profile.fluency && (
        <Card>
          <CardHeader title="Skills" />
          <CardBody className="space-y-3">
            {(Object.keys(profile.fluency.breakdown) as EmployeeSkillCategory[]).map((cat) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{EMPLOYEE_SKILL_LABELS[cat]}</span>
                  <span className="font-medium text-ink-900">{profile.fluency!.breakdown[cat]}</span>
                </div>
                <ProgressBar value={profile.fluency!.breakdown[cat]} className="mt-1.5" />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {profile.workflowsUsed.length > 0 && (
        <Card>
          <CardHeader title="Workflows used" />
          <CardBody className="flex flex-wrap gap-1.5">
            {profile.workflowsUsed.map((w) => (
              <Link key={w.id} href={`/dashboard/workflows/${w.id}`}>
                <Badge tone="neutral">{w.title}</Badge>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="AI journey" subtitle="Real milestones, dated from the activity that earned them" />
        <CardBody className="space-y-3">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm font-medium ${m.achievedAt ? "text-ink-900" : "text-ink-400"}`}>{m.title}</p>
                <p className="text-xs text-ink-500">{m.description}</p>
              </div>
              {m.achievedAt ? (
                <span className="shrink-0 text-xs text-ink-500">{m.achievedAt.toLocaleDateString()}</span>
              ) : (
                <Badge tone="neutral">Not yet</Badge>
              )}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
