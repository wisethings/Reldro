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
import { getSkillMasteryEvidence } from "@/lib/queries/skillMastery";
import { getCertificationReadiness } from "@/lib/queries/certifications";
import { getPointsBalance, getRecentPointsTransactions } from "@/lib/rewards";
import { RecognitionForm } from "@/components/team/RecognitionForm";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

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
  let isSameDepartmentPeer = false;
  if (!isSelf && !isCompanyAdmin && session.employeeId) {
    const me = await prisma.employee.findUnique({ where: { id: session.employeeId } });
    isDeptAdminOfThem = Boolean(me?.isDepartmentAdmin && me.departmentId === employee.departmentId);
    isSameDepartmentPeer = Boolean(me?.departmentId && me.departmentId === employee.departmentId);
  }
  if (!isSelf && !isCompanyAdmin && !isDeptAdminOfThem && !isSameDepartmentPeer) redirect("/dashboard/overview");
  const canManage = isCompanyAdmin || isDeptAdminOfThem;

  const [profile, milestones, skillEvidence, certifications, pointsBalance, recentPoints] = await Promise.all([
    getEmployeeAiProfile(session.organizationId, employeeId),
    getEmployeeMilestones(employeeId),
    getSkillMasteryEvidence(employeeId),
    getCertificationReadiness(employeeId),
    getPointsBalance(employeeId),
    getRecentPointsTransactions(employeeId, 5),
  ]);
  const earnedCertifications = certifications.filter((c) => c.earned).length;
  const recognitions = await prisma.recognition.findMany({
    where: { toEmployeeId: employeeId },
    include: { fromUser: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

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
        {!isSelf && (canManage || isSameDepartmentPeer) && (
          <div className="mt-3">
            <RecognitionForm toEmployeeId={employeeId} mode={canManage ? "manager" : "peer"} />
          </div>
        )}
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-center gap-6">
          <ScoreRing value={profile.fluency?.overallScore ?? 0} size={100} label="/ 100" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
              AI Fluency
              <InfoTooltip text="How effectively this person uses AI, based on their self-assessment. AI Adoption, whether they use it at all, is shown separately in their workflow and lesson activity below." />
            </p>
            <p className="text-xs text-ink-500">
              {profile.fluency ? `Last assessed ${profile.fluency.assessedAt.toLocaleDateString()}` : "No assessment completed yet"}
            </p>
            <p className="mt-2 text-sm text-ink-700">
              <span className="font-medium text-ink-900">{CAPABILITY_LEVEL_LABEL[level]}:</span> {CAPABILITY_LEVEL_DESCRIPTION[level]}
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

      <Card>
        <CardHeader title="AI points" subtitle="Earned from real progress, never for logins or time in the app" />
        <CardBody className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-2xl font-semibold text-ink-900">{pointsBalance.toLocaleString()}</p>
            <p className="text-xs text-ink-500">{earnedCertifications} certification{earnedCertifications === 1 ? "" : "s"} earned</p>
          </div>
          {recentPoints.length > 0 && (
            <div className="min-w-0 flex-1 space-y-1">
              {recentPoints.map((t) => (
                <p key={t.id} className="truncate text-xs text-ink-600">
                  <span className={t.amount >= 0 ? "font-medium text-sage-deep" : "font-medium text-ink-500"}>
                    {t.amount >= 0 ? "+" : ""}{t.amount}
                  </span>{" "}
                  {t.reason}
                </p>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

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
          <CardHeader title="Skills" subtitle="Why is this score what it is? See the evidence for each." />
          <CardBody className="space-y-4">
            {(Object.keys(profile.fluency.breakdown) as EmployeeSkillCategory[]).map((cat) => {
              const evidence = skillEvidence.find((e) => e.skill === cat);
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-700">{EMPLOYEE_SKILL_LABELS[cat]}</span>
                    <span className="font-medium text-ink-900">{profile.fluency!.breakdown[cat]}</span>
                  </div>
                  <ProgressBar value={profile.fluency!.breakdown[cat]} className="mt-1.5" />
                  {evidence && (
                    <ul className="mt-1.5 space-y-0.5">
                      {evidence.evidenceLines.map((line, i) => (
                        <li key={i} className="text-xs text-ink-500">· {line}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Certifications" subtitle="Real, checkable requirements - not a time-based badge" />
        <CardBody className="space-y-4">
          {certifications.map((cert) => (
            <div key={cert.key} className="border-b border-ink-100 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink-900">{cert.title}</p>
                {cert.earned ? (
                  <Badge tone="green">Earned {cert.earnedAt?.toLocaleDateString()}</Badge>
                ) : (
                  <Badge tone="neutral">{cert.percentComplete}% ready</Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-ink-500">{cert.description}</p>
              {!cert.earned && (
                <ul className="mt-2 space-y-1">
                  {cert.checklist.map((item, i) => (
                    <li key={i} className={`text-xs ${item.met ? "text-sage-deep" : "text-ink-500"}`}>
                      {item.met ? "✓" : "△"} {item.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </CardBody>
      </Card>

      {recognitions.length > 0 && (
        <Card>
          <CardHeader title="Recognition" />
          <CardBody className="divide-y divide-ink-200 p-0">
            {recognitions.map((r) => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-ink-800">
                    <span className="font-medium">{r.fromUser.name}</span> recognized {r.type === "MANAGER" ? "as a manager" : "as a peer"}
                  </p>
                  <span className="text-xs text-ink-400">{r.createdAt.toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-sm text-ink-600">&ldquo;{r.message}&rdquo;</p>
                {r.pointsAwarded > 0 && <p className="mt-1 text-xs text-sage-deep">+{r.pointsAwarded} points</p>}
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
