"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { awardPoints, ensureDefaultPointsRules, getPointsBalance } from "@/lib/rewards";
import type { RecognitionCategory, RewardCategory } from "@prisma/client";

export async function updatePointsRule(ruleId: string, input: { points: number; enabled: boolean; monthlyCap: number | null }) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;

  const rule = await prisma.pointsRule.findUnique({ where: { id: ruleId } });
  if (!rule || rule.organizationId !== organizationId) throw new Error("Rule not found");

  await prisma.pointsRule.update({
    where: { id: ruleId },
    data: { points: Math.max(0, Math.round(input.points)), enabled: input.enabled, monthlyCap: input.monthlyCap },
  });

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "reward.rules_updated",
    entityType: "PointsRule",
    entityId: ruleId,
    metadata: { key: rule.key, points: input.points, enabled: input.enabled, monthlyCap: input.monthlyCap },
  });

  revalidatePath("/dashboard/settings");
}

export async function addRewardCatalogItem(input: { name: string; description: string; category: RewardCategory; pointCost: number }) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;
  if (!input.name.trim()) throw new Error("Name is required");

  await prisma.rewardItem.create({
    data: {
      organizationId,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category,
      pointCost: Math.max(1, Math.round(input.pointCost)),
    },
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/rewards");
}

export async function setRewardCatalogItemActive(rewardItemId: string, active: boolean) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;
  const item = await prisma.rewardItem.findUnique({ where: { id: rewardItemId } });
  if (!item || item.organizationId !== organizationId) throw new Error("Reward not found");

  await prisma.rewardItem.update({ where: { id: rewardItemId }, data: { active } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/rewards");
}

export async function redeemReward(rewardItemId: string) {
  const session = await requireSession();
  if (!session.employeeId || !session.organizationId) throw new Error("No employee profile for this account");

  const item = await prisma.rewardItem.findUnique({ where: { id: rewardItemId } });
  if (!item || item.organizationId !== session.organizationId || !item.active) {
    throw new Error("This reward is no longer available.");
  }

  const balance = await getPointsBalance(session.employeeId);
  if (balance < item.pointCost) throw new Error("Not enough points for this reward yet.");

  await prisma.$transaction([
    prisma.rewardRedemption.create({
      data: { employeeId: session.employeeId, rewardItemId: item.id, pointCost: item.pointCost },
    }),
    prisma.pointsTransaction.create({
      data: {
        employeeId: session.employeeId,
        organizationId: session.organizationId,
        amount: -item.pointCost,
        reason: `Redeemed: ${item.name}`,
        entityType: "RewardItem",
        entityId: item.id,
      },
    }),
  ]);

  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: "reward.redeemed",
    entityType: "RewardItem",
    entityId: item.id,
    metadata: { employeeId: session.employeeId, pointCost: item.pointCost, name: item.name },
  });

  revalidatePath("/dashboard/rewards");
}

const RECOGNITION_CATEGORIES: RecognitionCategory[] = [
  "AI_ADOPTION",
  "WORKFLOW_INNOVATION",
  "LEARNING",
  "BUSINESS_IMPACT",
  "COLLABORATION",
  "AI_LEADERSHIP",
];

async function canManage(session: { employeeId?: string | null; role: string; organizationId?: string | null }, toEmployeeId: string) {
  if (session.role === "COMPANY_ADMIN") return true;
  if (!session.employeeId) return false;
  const [me, them] = await Promise.all([
    prisma.employee.findUnique({ where: { id: session.employeeId } }),
    prisma.employee.findUnique({ where: { id: toEmployeeId } }),
  ]);
  return Boolean(me?.isDepartmentAdmin && them && me.departmentId === them.departmentId);
}

export async function recognizeEmployee(input: {
  toEmployeeId: string;
  category: RecognitionCategory;
  message: string;
  awardPoints: boolean;
}) {
  const session = await requireSession();
  if (!session.organizationId) throw new Error("No organization for this account");
  if (!RECOGNITION_CATEGORIES.includes(input.category)) throw new Error("Invalid recognition category");
  if (!input.message.trim()) throw new Error("Add a short message explaining the recognition");

  const isManager = await canManage(session, input.toEmployeeId);
  if (!isManager) throw new Error("Only that employee's manager or an admin can give manager recognition");

  await ensureDefaultPointsRules(session.organizationId);
  const rule = await prisma.pointsRule.findUnique({
    where: { organizationId_key: { organizationId: session.organizationId, key: "manager_recognition" } },
  });
  const willAwardPoints = input.awardPoints && Boolean(rule?.enabled);

  const recognition = await prisma.recognition.create({
    data: {
      organizationId: session.organizationId,
      fromUserId: session.sub,
      toEmployeeId: input.toEmployeeId,
      type: "MANAGER",
      category: input.category,
      message: input.message.trim(),
      pointsAwarded: willAwardPoints ? (rule?.points ?? 0) : 0,
    },
  });

  if (willAwardPoints) {
    await awardPoints({
      employeeId: input.toEmployeeId,
      organizationId: session.organizationId,
      ruleKey: "manager_recognition",
      reason: `Manager recognition: ${input.message.trim().slice(0, 80)}`,
      entityType: "Recognition",
      entityId: recognition.id,
    });
  }

  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: "reward.recognition_given",
    entityType: "Recognition",
    entityId: recognition.id,
    metadata: { toEmployeeId: input.toEmployeeId, category: input.category, type: "MANAGER" },
  });

  revalidatePath(`/dashboard/team/${input.toEmployeeId}`);
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/my-team");
}

export async function sendPeerRecognition(input: { toEmployeeId: string; category: RecognitionCategory; message: string }) {
  const session = await requireSession();
  if (!session.employeeId || !session.organizationId) throw new Error("No employee profile for this account");
  if (session.employeeId === input.toEmployeeId) throw new Error("You can't recognize yourself");
  if (!RECOGNITION_CATEGORIES.includes(input.category)) throw new Error("Invalid recognition category");
  if (!input.message.trim()) throw new Error("Add a short message explaining the recognition");

  const [me, them] = await Promise.all([
    prisma.employee.findUnique({ where: { id: session.employeeId } }),
    prisma.employee.findUnique({ where: { id: input.toEmployeeId } }),
  ]);
  if (!them || them.organizationId !== session.organizationId) throw new Error("Employee not found");

  await ensureDefaultPointsRules(session.organizationId);
  const rule = await prisma.pointsRule.findUnique({
    where: { organizationId_key: { organizationId: session.organizationId, key: "peer_recognition" } },
  });

  const recognition = await prisma.recognition.create({
    data: {
      organizationId: session.organizationId,
      fromUserId: session.sub,
      toEmployeeId: input.toEmployeeId,
      type: "PEER",
      category: input.category,
      message: input.message.trim(),
    },
  });

  let pointsAwarded = false;
  if (rule?.enabled) {
    pointsAwarded = await awardPoints({
      employeeId: input.toEmployeeId,
      organizationId: session.organizationId,
      ruleKey: "peer_recognition",
      reason: `Peer recognition from ${me?.jobTitle ?? "a teammate"}: ${input.message.trim().slice(0, 80)}`,
      entityType: "Recognition",
      entityId: recognition.id,
    });
  }
  if (pointsAwarded && rule) {
    await prisma.recognition.update({ where: { id: recognition.id }, data: { pointsAwarded: rule.points } });
  }

  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: "reward.recognition_given",
    entityType: "Recognition",
    entityId: recognition.id,
    metadata: { toEmployeeId: input.toEmployeeId, category: input.category, type: "PEER" },
  });

  revalidatePath(`/dashboard/team/${input.toEmployeeId}`);
}
