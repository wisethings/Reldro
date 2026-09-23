import "server-only";
import { prisma } from "@/lib/prisma";
import { computePriorityScore, opportunityQuadrant } from "@/lib/scoring";
import { getAIProvider } from "@/lib/ai/provider";
import { getRealAdoptionMetrics } from "@/lib/queries/adoption";
import { DEPLOYED_STATUSES } from "@/lib/workflowLifecycle";

/**
 * The Reldro Recommendation Assistant.
 *
 * This intentionally is NOT a thin wrapper around a chat completion. It
 * reads the organization's actual platform data (opportunities, adoption
 * metrics, workflows, learning) and answers a fixed set of adoption
 * questions from that data, the same way a human ops analyst would query
 * the platform. A model provider (see `provider.ts`) can be layered on top
 * later purely to polish phrasing — the analysis itself stays data-driven.
 */

export type AssistantAnswer = {
  answer: string;
  bullets?: string[];
  citedIds?: string[];
};

type Intent =
  | "next-opportunity"
  | "department-gap"
  | "learning-recommendation"
  | "prioritize-workflows"
  | "hire-specialist"
  | "implementation-effort"
  | "top-value"
  | "adoption-trend"
  | "general";

function detectIntent(question: string): Intent {
  const q = question.toLowerCase();
  if (/(where|what).*(adopt|use ai).*(next)?/.test(q) && /next|should/.test(q)) return "next-opportunity";
  if (/why.*(lower|behind|trail)/.test(q)) return "department-gap";
  if (/(learn|training|skill)/.test(q) && /(team|department|should)/.test(q)) return "learning-recommendation";
  if (/(prioriti[sz]e|which workflows)/.test(q)) return "prioritize-workflows";
  if (/(hire|specialist|outside help|consultant)/.test(q)) return "hire-specialist";
  if (/(implement|effort|take to)/.test(q)) return "implementation-effort";
  if (/(highest.value|top.value|biggest impact|best roi)/.test(q)) return "top-value";
  if (/(trend|improving|progress|over time)/.test(q)) return "adoption-trend";
  return "general";
}

export async function answerAssistantQuestion(
  organizationId: string,
  question: string
): Promise<AssistantAnswer> {
  const intent = detectIntent(question);

  switch (intent) {
    case "next-opportunity":
      return answerNextOpportunity(organizationId);
    case "department-gap":
      return answerDepartmentGap(organizationId, question);
    case "learning-recommendation":
      return answerLearningRecommendation(organizationId, question);
    case "prioritize-workflows":
      return answerPrioritizeWorkflows(organizationId);
    case "hire-specialist":
      return answerHireSpecialist(organizationId);
    case "implementation-effort":
      return answerImplementationEffort(organizationId, question);
    case "top-value":
      return answerTopValue(organizationId);
    case "adoption-trend":
      return answerAdoptionTrend(organizationId, question);
    default:
      return answerGeneral(organizationId, question);
  }
}

async function answerNextOpportunity(organizationId: string): Promise<AssistantAnswer> {
  const opportunities = await prisma.opportunity.findMany({
    where: { organizationId, status: { in: ["IDENTIFIED", "PLANNED"] } },
    include: { department: true },
  });
  const ranked = opportunities
    .map((o) => ({
      o,
      score: computePriorityScore({
        businessImpactScore: o.businessImpactScore,
        adoptionPotentialScore: o.adoptionPotentialScore,
        frequencyScore: o.frequencyScore,
        riskScore: o.riskScore,
        complexity: o.complexity,
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (ranked.length === 0) {
    return { answer: "There are no unaddressed opportunities right now — nice work. Check Initiatives to see what's in flight." };
  }

  return {
    answer: `Based on impact, effort, and adoption potential, these are the highest-priority opportunities to tackle next:`,
    bullets: ranked.map(
      ({ o, score }) =>
        `${o.title} (${o.department?.name ?? "Cross-functional"}) — priority score ${score}/100, est. $${(o.estAnnualValue / 1000).toFixed(0)}k/yr`
    ),
    citedIds: ranked.map((r) => r.o.id),
  };
}

async function answerDepartmentGap(organizationId: string, question: string): Promise<AssistantAnswer> {
  const latestMonth = await prisma.adoptionMetricSnapshot.findFirst({
    where: { organizationId, department: { not: null } },
    orderBy: { month: "desc" },
    select: { month: true },
  });
  if (!latestMonth) return answerGeneral(organizationId, question);

  const snapshots = await prisma.adoptionMetricSnapshot.findMany({
    where: { organizationId, month: latestMonth.month, department: { not: null } },
    orderBy: { adoptionPct: "desc" },
  });
  if (snapshots.length < 2) return answerGeneral(organizationId, question);

  const top = snapshots[0];
  const bottom = snapshots[snapshots.length - 1];
  const mentioned = snapshots.find((s) => question.toLowerCase().includes((s.department ?? "").toLowerCase()));
  const laggard = mentioned ?? bottom;

  return {
    answer: `${laggard.department} is adopting AI more slowly than ${top.department} (${laggard.adoptionPct}% vs ${top.adoptionPct}% active usage). The gap tends to come down to workflow integration and training completion rather than awareness.`,
    bullets: [
      `${top.department}: ${top.adoptionPct}% adoption, workflow integration score ${top.workflowIntegrationScore}/100`,
      `${laggard.department}: ${laggard.adoptionPct}% adoption, workflow integration score ${laggard.workflowIntegrationScore}/100`,
      `Recommended action: assign ${laggard.department}'s top workflow opportunities and a short learning path before adding new tools.`,
    ],
  };
}

async function answerLearningRecommendation(organizationId: string, question: string): Promise<AssistantAnswer> {
  const departments = await prisma.department.findMany({ where: { organizationId } });
  const mentioned = departments.find((d) => question.toLowerCase().includes(d.name.toLowerCase()));
  const dept = mentioned ?? departments[0];
  if (!dept) return answerGeneral(organizationId, question);

  const courses = await prisma.course.findMany({
    where: { department: dept.name },
    include: { lessons: true },
    take: 3,
  });

  if (courses.length === 0) {
    return { answer: `There isn't a tailored learning path for ${dept.name} yet. Start from the Learn tab and assign a general AI fundamentals path.` };
  }

  return {
    answer: `For ${dept.name}, start with these practical, workflow-tied lessons rather than generic AI training:`,
    bullets: courses.map((c) => `${c.title} — ${c.lessons.length} lessons`),
    citedIds: courses.map((c) => c.id),
  };
}

async function answerPrioritizeWorkflows(organizationId: string): Promise<AssistantAnswer> {
  const opportunities = await prisma.opportunity.findMany({ where: { organizationId } });
  const quickWins = opportunities.filter(
    (o) =>
      opportunityQuadrant({
        businessImpactScore: o.businessImpactScore,
        adoptionPotentialScore: o.adoptionPotentialScore,
        frequencyScore: o.frequencyScore,
        riskScore: o.riskScore,
        complexity: o.complexity,
      }) === "quick-win"
  );

  if (quickWins.length === 0) {
    return { answer: "No high-impact, low-effort opportunities are open right now — check the full opportunity matrix for major projects worth scoping." };
  }

  return {
    answer: `Start with your "high impact, low effort" quadrant — ${quickWins.length} opportunities can likely be adopted with training alone, no specialist required:`,
    bullets: quickWins.slice(0, 5).map((o) => `${o.title} — ${o.estHoursSavedMonthly} hrs/mo saved`),
    citedIds: quickWins.map((o) => o.id),
  };
}

async function answerHireSpecialist(organizationId: string): Promise<AssistantAnswer> {
  const candidates = await prisma.opportunity.findMany({
    where: { organizationId, recommendedSpecialist: true, status: { in: ["IDENTIFIED", "PLANNED"] } },
    orderBy: { estAnnualValue: "desc" },
    take: 3,
  });

  if (candidates.length === 0) {
    return { answer: "Nothing in your current backlog is flagged as needing outside expertise — your team can likely implement the open opportunities with training and the workflow library." };
  }

  return {
    answer: `${candidates.length} open opportunities are complex enough that a specialist would materially speed up implementation:`,
    bullets: candidates.map((o) => `${o.title} — complexity ${o.complexity.toLowerCase()}, est. $${(o.estAnnualValue / 1000).toFixed(0)}k/yr value`),
    citedIds: candidates.map((o) => o.id),
  };
}

async function answerImplementationEffort(organizationId: string, question: string): Promise<AssistantAnswer> {
  const workflows = await prisma.workflow.findMany({
    include: { steps: true },
    take: 50,
  });
  const mentioned = workflows.find((w) => question.toLowerCase().includes(w.title.toLowerCase()));
  const workflow = mentioned ?? workflows[0];
  if (!workflow) return answerGeneral(organizationId, question);

  return {
    answer: `${workflow.title} is rated ${workflow.difficulty.toLowerCase()} complexity and typically takes a team through ${workflow.steps.length} steps, saving about ${workflow.timeSavedMinutes} minutes per person per day once adopted.`,
    bullets: [
      `Tools required: ${workflow.toolsRequired.join(", ") || "none beyond existing stack"}`,
      `Skills required: ${workflow.skillsRequired.join(", ") || "AI fundamentals"}`,
      workflow.securityNotes ? `Security consideration: ${workflow.securityNotes}` : "No special security review flagged",
    ],
    citedIds: [workflow.id],
  };
}

async function answerTopValue(organizationId: string): Promise<AssistantAnswer> {
  const top = await prisma.opportunity.findMany({
    where: { organizationId },
    orderBy: { estAnnualValue: "desc" },
    take: 5,
    include: { department: true },
  });

  return {
    answer: "Here are your highest-value AI opportunities by estimated annual impact:",
    bullets: top.map((o) => `${o.title} (${o.department?.name ?? "Cross-functional"}) — $${(o.estAnnualValue / 1000).toFixed(0)}k/yr`),
    citedIds: top.map((o) => o.id),
  };
}

async function answerAdoptionTrend(organizationId: string, question: string): Promise<AssistantAnswer> {
  const snapshots = await prisma.adoptionMetricSnapshot.findMany({
    where: { organizationId, department: null },
    orderBy: { month: "asc" },
  });
  if (snapshots.length === 0) return answerGeneral(organizationId, question);

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const delta = last.aiAdoptionScore - first.aiAdoptionScore;
  const direction = delta > 0 ? "improved" : delta < 0 ? "declined" : "held steady";

  return {
    answer: `Your AI Adoption Score has ${direction} from ${first.aiAdoptionScore} to ${last.aiAdoptionScore} over the last ${snapshots.length} months (${delta >= 0 ? "+" : ""}${delta} points).`,
    bullets: snapshots.map((s) => `${s.month.toLocaleString("en-US", { month: "short", year: "numeric" })}: ${s.aiAdoptionScore}`),
  };
}

function fallbackGeneralAnswer(
  orgName: string,
  adoptionScore: number | string,
  opportunityCount: number
): AssistantAnswer {
  return {
    answer: `${orgName} has an AI Adoption Score of ${adoptionScore}/100 with ${opportunityCount} identified opportunities. Try asking things like "where should we adopt AI next?", "why is Finance behind Marketing?", or "should we hire a specialist?"`,
  };
}

/**
 * Catch-all for questions that don't match one of the data-driven intents
 * above. When a real model provider is configured (OPENAI_API_KEY /
 * ANTHROPIC_API_KEY), this grounds the model in the org's actual platform
 * data and lets it answer the open-ended question in natural language. With
 * no provider configured it falls back to the same rule-based summary as
 * before — the mock provider never fabricates numbers.
 */
async function answerGeneral(organizationId: string, question: string): Promise<AssistantAnswer> {
  const [org, latestSnapshot, opportunityCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.adoptionMetricSnapshot.findFirst({
      where: { organizationId, department: null },
      orderBy: { month: "desc" },
    }),
    prisma.opportunity.count({ where: { organizationId } }),
  ]);
  const orgName = org?.name ?? "Your organization";
  const adoptionScore = latestSnapshot?.aiAdoptionScore ?? "—";

  const provider = getAIProvider();
  if (provider.name === "mock") return fallbackGeneralAnswer(orgName, adoptionScore, opportunityCount);

  try {
    const [metrics, departments, topOpportunities, adoptedWorkflows] = await Promise.all([
      getRealAdoptionMetrics(organizationId),
      prisma.department.findMany({ where: { organizationId } }),
      prisma.opportunity.findMany({
        where: { organizationId, status: { in: ["IDENTIFIED", "PLANNED"] } },
        orderBy: { estAnnualValue: "desc" },
        take: 5,
        include: { department: true },
      }),
      prisma.organizationWorkflow.findMany({
        where: { organizationId, status: { in: DEPLOYED_STATUSES } },
        include: { workflow: true },
        take: 10,
      }),
    ]);

    const context = [
      `Organization: ${orgName}`,
      `AI Adoption Score: ${adoptionScore}/100`,
      `Active users: ${metrics.activeUsers}/${metrics.totalUsers} (${metrics.adoptionPct}%)`,
      `Estimated monthly hours saved from AI: ${metrics.hoursSavedMonthly}`,
      `Departments: ${departments.map((d) => d.name).join(", ") || "none set up"}`,
      `Open high-value opportunities: ${
        topOpportunities
          .map((o) => `${o.title} (${o.department?.name ?? "cross-functional"}, ~$${Math.round(o.estAnnualValue / 1000)}k/yr)`)
          .join("; ") || "none open right now"
      }`,
      `Adopted workflows: ${adoptedWorkflows.map((w) => w.workflow.title).join(", ") || "none adopted yet"}`,
    ].join("\n");

    const system = [
      "You are the Reldro AI Adoption Assistant, embedded in a B2B SaaS platform that helps companies roll out AI tools.",
      "Answer the user's question using ONLY the organization data provided below — never invent numbers, names, or facts that aren't in it.",
      "If the data doesn't cover what's being asked, say so plainly and suggest what to check in the platform instead of guessing.",
      "Keep the answer to 2-4 short sentences, in a direct, practical tone — no filler, no generic AI advice.",
      "",
      "Organization data:",
      context,
    ].join("\n");

    const answer = await provider.generateText(question, system);
    if (!answer.trim()) return fallbackGeneralAnswer(orgName, adoptionScore, opportunityCount);
    return { answer: answer.trim() };
  } catch {
    return fallbackGeneralAnswer(orgName, adoptionScore, opportunityCount);
  }
}
