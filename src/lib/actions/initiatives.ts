"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export type CreateInitiativeState = { error?: string } | undefined;

export async function createInitiative(_prevState: CreateInitiativeState, formData: FormData): Promise<CreateInitiativeState> {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;

  const name = String(formData.get("name") ?? "").trim();
  const goalDescription = String(formData.get("goalDescription") ?? "").trim();
  const startDateInput = String(formData.get("startDate") ?? "");
  const endDateInput = String(formData.get("endDate") ?? "");

  if (!name || !goalDescription || !startDateInput || !endDateInput) {
    return { error: "Name, goal, start date, and end date are required." };
  }

  const startDate = new Date(startDateInput);
  const endDate = new Date(endDateInput);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return { error: "Target end date must be after the start date." };
  }

  const departments = formData.getAll("departments").map(String).filter(Boolean);
  const memberIds = formData.getAll("memberIds").map(String).filter(Boolean);

  const kpiLabels = formData.getAll("kpiLabel").map(String);
  const kpiBaselines = formData.getAll("kpiBaseline").map(String);
  const kpiTargets = formData.getAll("kpiTarget").map(String);
  const kpiUnits = formData.getAll("kpiUnit").map(String);
  const kpis = kpiLabels
    .map((label, i) => ({
      label: label.trim(),
      baseline: Number(kpiBaselines[i]) || 0,
      current: Number(kpiBaselines[i]) || 0,
      target: Number(kpiTargets[i]) || 0,
      unit: (kpiUnits[i] ?? "").trim(),
    }))
    .filter((k) => k.label);

  const employees = memberIds.length
    ? await prisma.employee.findMany({ where: { id: { in: memberIds }, organizationId } })
    : [];

  const initiative = await prisma.initiative.create({
    data: {
      organizationId,
      name,
      goalDescription,
      startDate,
      endDate,
      departments,
      kpis: kpis as unknown as Prisma.InputJsonValue,
      members: employees.length ? { create: employees.map((e) => ({ employeeId: e.id })) } : undefined,
    },
  });

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "initiative.created",
    entityType: "Initiative",
    entityId: initiative.id,
    metadata: { name },
  });

  revalidatePath("/dashboard/initiatives");
  redirect(`/dashboard/initiatives/${initiative.id}`);
}

export async function deleteInitiative(initiativeId: string) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const initiative = await prisma.initiative.findUnique({ where: { id: initiativeId } });
  if (!initiative || initiative.organizationId !== session.organizationId) throw new Error("Initiative not found.");

  await prisma.initiative.delete({ where: { id: initiativeId } });
  revalidatePath("/dashboard/initiatives");
}
