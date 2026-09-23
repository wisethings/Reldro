import "server-only";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { RewardCategory } from "@prisma/client";

/**
 * Reward system core. The only thing companies can tune is the point value
 * (and monthly cap) per rule via PointsRule - which behaviors exist is fixed
 * to this list, deliberately excluding anything not tied to demonstrated
 * capability or adoption (logins, time in app, raw AI usage volume, opening
 * a lesson). An employee's balance is never stored directly - it's always
 * the sum of PointsTransaction, so it can't drift from its own history.
 */
export const POINTS_RULE_DEFAULTS: { key: string; label: string; points: number; monthlyCap?: number }[] = [
  { key: "course_completed", label: "Complete a learning path", points: 50 },
  { key: "simulation_completed", label: "Complete a simulation attempt", points: 25, monthlyCap: 10 },
  { key: "simulation_passed", label: "Pass a simulation (first time)", points: 50 },
  { key: "simulation_score_90", label: "Score 90+ on a simulation", points: 50 },
  { key: "simulation_improved_15", label: "Improve a simulation score by 15+ points", points: 25, monthlyCap: 5 },
  { key: "certification_ai_practitioner", label: "Earn AI Practitioner certification", points: 100 },
  { key: "certification_ai_workflow_builder", label: "Earn AI Workflow Builder certification", points: 150 },
  { key: "certification_ai_champion", label: "Earn AI Champion certification", points: 250 },
  { key: "workflow_first_adopted", label: "Use your first AI workflow", points: 100 },
  { key: "workflow_three_adopted", label: "Use 3 different AI workflows", points: 150 },
  { key: "manager_recognition", label: "Recognized by a manager", points: 50 },
  { key: "peer_recognition", label: "Recognized by a peer", points: 25, monthlyCap: 4 },
];

/** Idempotent - safe to call on every relevant page load or before every award, same pattern as ensureGlobalToolCatalog(). */
export async function ensureDefaultPointsRules(organizationId: string) {
  await prisma.pointsRule.createMany({
    data: POINTS_RULE_DEFAULTS.map((r) => ({
      organizationId,
      key: r.key,
      label: r.label,
      points: r.points,
      monthlyCap: r.monthlyCap,
    })),
    skipDuplicates: true,
  });
}

export const REWARD_CATALOG_DEFAULTS: { name: string; description: string; category: RewardCategory; pointCost: number }[] = [
  { name: "$25 Learning Credit", description: "Put toward a course, book, or certification of your choice.", category: "LEARNING_CREDIT", pointCost: 500 },
  { name: "Company Merchandise", description: "A branded item from the company store.", category: "MERCHANDISE", pointCost: 750 },
  { name: "Conference Credit", description: "Toward registration for an industry conference.", category: "EXPERIENCE", pointCost: 1000 },
  { name: "Professional Development Budget", description: "A one-time budget for a course, workshop, or coaching.", category: "LEARNING_CREDIT", pointCost: 1500 },
  { name: "Charitable Donation", description: "A donation made in your name to a cause you choose.", category: "DONATION", pointCost: 500 },
  { name: "Extra PTO Day", description: "One additional paid day off.", category: "PTO", pointCost: 2000 },
];

/** Idempotent - safe to call on every page load, same pattern as ensureGlobalToolCatalog(). Companies can deactivate or add their own items afterward; this only tops up what's missing by name. */
export async function ensureDefaultRewardCatalog(organizationId: string) {
  const existing = await prisma.rewardItem.findMany({ where: { organizationId }, select: { name: true } });
  const existingNames = new Set(existing.map((r) => r.name));
  const missing = REWARD_CATALOG_DEFAULTS.filter((r) => !existingNames.has(r.name));
  if (missing.length === 0) return;
  await prisma.rewardItem.createMany({
    data: missing.map((r) => ({
      organizationId,
      name: r.name,
      description: r.description,
      category: r.category,
      pointCost: r.pointCost,
    })),
  });
}

export async function getPointsBalance(employeeId: string): Promise<number> {
  const agg = await prisma.pointsTransaction.aggregate({ where: { employeeId }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

export async function getRecentPointsTransactions(employeeId: string, limit = 5) {
  return prisma.pointsTransaction.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" }, take: limit });
}

export type NextRewardGap = { name: string; pointCost: number; pointsAway: number };

export async function getNextRewardGap(employeeId: string, organizationId: string): Promise<NextRewardGap | null> {
  await ensureDefaultRewardCatalog(organizationId);
  const [balance, items] = await Promise.all([
    getPointsBalance(employeeId),
    prisma.rewardItem.findMany({ where: { organizationId, active: true }, orderBy: { pointCost: "asc" } }),
  ]);
  const next = items.find((i) => i.pointCost > balance);
  return next ? { name: next.name, pointCost: next.pointCost, pointsAway: next.pointCost - balance } : null;
}

export type RewardsDashboardStats = {
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  outstandingBalance: number;
  redemptionCount: number;
  recognitionCount: number;
  participatingEmployees: number;
  totalEmployees: number;
};

/** Real aggregates only - no attributed causality (e.g. no invented "ROI" figure) since this platform doesn't have the longitudinal control data to honestly claim one. */
export async function getRewardsDashboardStats(organizationId: string): Promise<RewardsDashboardStats> {
  const [issuedAgg, redeemedAgg, balanceAgg, redemptionCount, recognitionCount, totalEmployees, participatingEmployees] = await Promise.all([
    prisma.pointsTransaction.aggregate({ where: { organizationId, amount: { gt: 0 } }, _sum: { amount: true } }),
    prisma.pointsTransaction.aggregate({ where: { organizationId, amount: { lt: 0 } }, _sum: { amount: true } }),
    prisma.pointsTransaction.aggregate({ where: { organizationId }, _sum: { amount: true } }),
    prisma.rewardRedemption.count({ where: { employee: { organizationId } } }),
    prisma.recognition.count({ where: { organizationId } }),
    prisma.employee.count({ where: { organizationId } }),
    prisma.pointsTransaction.groupBy({ by: ["employeeId"], where: { organizationId } }).then((rows) => rows.length),
  ]);

  return {
    totalPointsIssued: issuedAgg._sum.amount ?? 0,
    totalPointsRedeemed: Math.abs(redeemedAgg._sum.amount ?? 0),
    outstandingBalance: balanceAgg._sum.amount ?? 0,
    redemptionCount,
    recognitionCount,
    participatingEmployees,
    totalEmployees,
  };
}

export type TeamRewardsSummary = { pointsEarnedThisMonth: number; certificationsEarned: number; recognitionsReceived: number };

export async function getTeamRewardsSummary(employeeIds: string[]): Promise<TeamRewardsSummary> {
  if (employeeIds.length === 0) return { pointsEarnedThisMonth: 0, certificationsEarned: 0, recognitionsReceived: 0 };
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [pointsAgg, certificationsEarned, recognitionsReceived] = await Promise.all([
    prisma.pointsTransaction.aggregate({
      where: { employeeId: { in: employeeIds }, amount: { gt: 0 }, createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.employeeCertification.count({ where: { employeeId: { in: employeeIds } } }),
    prisma.recognition.count({ where: { toEmployeeId: { in: employeeIds } } }),
  ]);

  return {
    pointsEarnedThisMonth: pointsAgg._sum.amount ?? 0,
    certificationsEarned,
    recognitionsReceived,
  };
}

export async function getPointsBalances(employeeIds: string[]): Promise<Map<string, number>> {
  if (employeeIds.length === 0) return new Map();
  const grouped = await prisma.pointsTransaction.groupBy({
    by: ["employeeId"],
    where: { employeeId: { in: employeeIds } },
    _sum: { amount: true },
  });
  return new Map(grouped.map((g) => [g.employeeId, g._sum.amount ?? 0]));
}

/**
 * Awards points for a real, already-happened behavior. Returns false (no
 * transaction written) when the rule is disabled, missing, at its monthly
 * cap, or - when a dedupeKey is given - has already been paid out once for
 * this exact rule+entity combination, so one-time achievement bonuses can't
 * be farmed by repeating the same action.
 */
export async function awardPoints(params: {
  employeeId: string;
  organizationId: string;
  ruleKey: string;
  reason: string;
  entityType?: string;
  entityId?: string;
  dedupeKey?: string;
}): Promise<boolean> {
  await ensureDefaultPointsRules(params.organizationId);

  const rule = await prisma.pointsRule.findUnique({
    where: { organizationId_key: { organizationId: params.organizationId, key: params.ruleKey } },
  });
  if (!rule || !rule.enabled || rule.points <= 0) return false;

  if (params.dedupeKey) {
    const existing = await prisma.pointsTransaction.findFirst({
      where: {
        employeeId: params.employeeId,
        ruleKey: params.ruleKey,
        entityType: params.entityType,
        entityId: params.entityId,
      },
      select: { id: true },
    });
    if (existing) return false;
  }

  if (rule.monthlyCap) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const countThisMonth = await prisma.pointsTransaction.count({
      where: { employeeId: params.employeeId, ruleKey: params.ruleKey, createdAt: { gte: startOfMonth } },
    });
    if (countThisMonth >= rule.monthlyCap) return false;
  }

  await prisma.pointsTransaction.create({
    data: {
      employeeId: params.employeeId,
      organizationId: params.organizationId,
      amount: rule.points,
      reason: params.reason,
      ruleKey: params.ruleKey,
      entityType: params.entityType,
      entityId: params.entityId,
    },
  });

  await logAudit({
    organizationId: params.organizationId,
    action: "reward.points_awarded",
    entityType: params.entityType ?? "Employee",
    entityId: params.entityId ?? params.employeeId,
    metadata: { employeeId: params.employeeId, points: rule.points, reason: params.reason },
  });

  return true;
}
