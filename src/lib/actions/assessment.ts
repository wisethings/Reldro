"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/auth/guards";
import {
  computeOrgAdoptionScore,
  computeFluencyScore,
  type OrgMaturityCategory,
  type EmployeeSkillCategory,
} from "@/lib/scoring";
import { ORG_ASSESSMENT_QUESTIONS, EMPLOYEE_ASSESSMENT_QUESTIONS } from "@/lib/data/assessment-questions";

export async function submitOrgAssessment(responses: { key: string; score: number }[]) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;

  const byCategory: Record<OrgMaturityCategory, number[]> = {
    literacy: [],
    usage: [],
    workflowIntegration: [],
    governance: [],
    measurement: [],
    leadershipAdoption: [],
  };
  for (const r of responses) {
    const q = ORG_ASSESSMENT_QUESTIONS.find((question) => question.key === r.key);
    if (q) byCategory[q.category].push(r.score);
  }
  const breakdown = Object.fromEntries(
    (Object.keys(byCategory) as OrgMaturityCategory[]).map((cat) => {
      const values = byCategory[cat];
      const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
      return [cat, avg];
    })
  ) as Record<OrgMaturityCategory, number>;
  const overallScore = computeOrgAdoptionScore(breakdown);

  await prisma.assessment.create({
    data: {
      type: "ORGANIZATION",
      status: "COMPLETED",
      organizationId,
      overallScore,
      scoreBreakdown: breakdown,
      completedAt: new Date(),
      responses: {
        create: responses.map((r) => {
          const q = ORG_ASSESSMENT_QUESTIONS.find((question) => question.key === r.key)!;
          return { category: q.category, questionKey: r.key, questionText: q.text, score: r.score };
        }),
      },
    },
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const existing = await prisma.adoptionMetricSnapshot.findFirst({
    where: { organizationId, department: null, month: monthStart },
  });

  if (existing) {
    await prisma.adoptionMetricSnapshot.update({
      where: { id: existing.id },
      data: {
        aiAdoptionScore: overallScore,
        literacyScore: breakdown.literacy,
        usageScore: breakdown.usage,
        workflowIntegrationScore: breakdown.workflowIntegration,
        governanceScore: breakdown.governance,
        measurementScore: breakdown.measurement,
        leadershipScore: breakdown.leadershipAdoption,
      },
    });
  } else {
    const employeeCount = await prisma.employee.count({ where: { organizationId } });
    await prisma.adoptionMetricSnapshot.create({
      data: {
        organizationId,
        department: null,
        month: monthStart,
        activeUsers: Math.round(employeeCount * 0.3),
        totalUsers: employeeCount,
        adoptionPct: 30,
        hoursSavedMonthly: 0,
        aiAdoptionScore: overallScore,
        literacyScore: breakdown.literacy,
        usageScore: breakdown.usage,
        workflowIntegrationScore: breakdown.workflowIntegration,
        governanceScore: breakdown.governance,
        measurementScore: breakdown.measurement,
        leadershipScore: breakdown.leadershipAdoption,
      },
    });
  }

  revalidatePath("/dashboard/assessment");
  revalidatePath("/dashboard/overview");
}

export async function submitEmployeeAssessment(responses: { key: string; score: number }[]) {
  const session = await requireSession();
  if (!session.employeeId) throw new Error("No employee profile for this account");

  const byCategory: Record<EmployeeSkillCategory, number[]> = {
    fundamentals: [],
    prompting: [],
    workflowDesign: [],
    evaluation: [],
    automation: [],
  };
  for (const r of responses) {
    const q = EMPLOYEE_ASSESSMENT_QUESTIONS.find((question) => question.key === r.key);
    if (q) byCategory[q.category].push(r.score);
  }
  const breakdown = Object.fromEntries(
    (Object.keys(byCategory) as EmployeeSkillCategory[]).map((cat) => {
      const values = byCategory[cat];
      const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
      return [cat, avg];
    })
  ) as Record<EmployeeSkillCategory, number>;
  const fluencyScore = computeFluencyScore(breakdown);

  await prisma.assessment.create({
    data: {
      type: "EMPLOYEE",
      status: "COMPLETED",
      employeeId: session.employeeId,
      organizationId: session.organizationId,
      overallScore: fluencyScore,
      scoreBreakdown: breakdown,
      completedAt: new Date(),
      responses: {
        create: responses.map((r) => {
          const q = EMPLOYEE_ASSESSMENT_QUESTIONS.find((question) => question.key === r.key)!;
          return { category: q.category, questionKey: r.key, questionText: q.text, score: r.score };
        }),
      },
    },
  });

  await prisma.employee.update({
    where: { id: session.employeeId },
    data: { aiFluencyScore: fluencyScore },
  });

  revalidatePath("/dashboard/assessment");
  revalidatePath("/dashboard/overview");
}
