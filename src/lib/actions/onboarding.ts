"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth/guards";
import { computeOrgAdoptionScore, type OrgMaturityCategory } from "@/lib/scoring";
import { ORG_ASSESSMENT_QUESTIONS } from "@/lib/data/assessment-questions";
import { generateOpportunitiesForOrg } from "@/lib/opportunities/generate";

export type OnboardingPayload = {
  industry: string;
  size: string;
  revenueRange: string;
  geography: string;
  businessModel: string;
  goals: string[];
  integrationKeys: string[];
  departments: string[];
  responses: { key: string; score: number }[];
};

export async function completeOnboarding(payload: OnboardingPayload) {
  const session = await requireOrganization();

  const org = await prisma.organization.update({
    where: { id: session.organizationId },
    data: {
      industry: payload.industry,
      size: payload.size,
      revenueRange: payload.revenueRange,
      geography: payload.geography,
      businessModel: payload.businessModel,
      goals: payload.goals,
      onboardingDone: true,
      onboardingStep: 5,
    },
  });

  await Promise.all(
    payload.departments.map((name) =>
      prisma.department.upsert({
        where: { organizationId_name: { organizationId: org.id, name } },
        update: {},
        create: { organizationId: org.id, name },
      })
    )
  );

  await generateOpportunitiesForOrg(org.id);

  const integrations = await prisma.integration.findMany({ where: { key: { in: payload.integrationKeys } } });
  await Promise.all(
    integrations.map((integration) =>
      prisma.integrationConnection.upsert({
        where: { organizationId_integrationId: { organizationId: org.id, integrationId: integration.id } },
        update: { status: "CONNECTED", connectedAt: new Date(), lastSyncAt: new Date() },
        create: {
          organizationId: org.id,
          integrationId: integration.id,
          status: "CONNECTED",
          connectedAt: new Date(),
          lastSyncAt: new Date(),
          mockData: { recordsSynced: Math.floor(200 + Math.random() * 2000) },
        },
      })
    )
  );

  const categoryScores: Record<OrgMaturityCategory, number[]> = {
    literacy: [],
    usage: [],
    workflowIntegration: [],
    governance: [],
    measurement: [],
    leadershipAdoption: [],
  };
  for (const r of payload.responses) {
    const q = ORG_ASSESSMENT_QUESTIONS.find((question) => question.key === r.key);
    if (q) categoryScores[q.category].push(r.score);
  }
  const breakdown = Object.fromEntries(
    (Object.keys(categoryScores) as OrgMaturityCategory[]).map((cat) => {
      const values = categoryScores[cat];
      const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
      return [cat, avg];
    })
  ) as Record<OrgMaturityCategory, number>;
  const overallScore = computeOrgAdoptionScore(breakdown);

  const assessment = await prisma.assessment.create({
    data: {
      type: "ORGANIZATION",
      status: "COMPLETED",
      organizationId: org.id,
      overallScore,
      scoreBreakdown: breakdown,
      completedAt: new Date(),
      responses: {
        create: payload.responses.map((r) => {
          const q = ORG_ASSESSMENT_QUESTIONS.find((question) => question.key === r.key)!;
          return { category: q.category, questionKey: r.key, questionText: q.text, score: r.score };
        }),
      },
    },
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const existingSnapshot = await prisma.adoptionMetricSnapshot.findFirst({
    where: { organizationId: org.id, department: null, month: monthStart },
  });
  if (!existingSnapshot) {
    await prisma.adoptionMetricSnapshot.create({
      data: {
        organizationId: org.id,
        department: null,
        month: monthStart,
        activeUsers: 1,
        totalUsers: 1,
        adoptionPct: 100,
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

  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      tier: "STARTER",
      status: "TRIALING",
      seats: 25,
      pricePerMonth: 499,
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    },
  });

  void assessment;
  redirect("/dashboard/overview");
}
