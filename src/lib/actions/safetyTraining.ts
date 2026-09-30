"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit, isoOrNull, requireViewer } from "@/lib/safety/context";

export type TrainingFormState = { error?: string; success?: string } | undefined;

export async function createToolboxTalk(_prev: TrainingFormState, formData: FormData): Promise<TrainingFormState> {
  const v = await requireViewer();
  if (!v.isSafetyTeam && !v.isSupervisor) return { error: "Only the safety team or a supervisor can create toolbox talks." };
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) return { error: "A title and the talk content are required." };
  let siteId: string | null = String(formData.get("siteId") ?? "") || null;
  if (!v.isSafetyTeam) siteId = v.siteId; // supervisors talk to their own site
  if (siteId) {
    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: v.organizationId } });
    if (!site) siteId = null;
  }
  await prisma.toolboxTalk.create({
    data: {
      organizationId: v.organizationId,
      title: title.slice(0, 160),
      topic: String(formData.get("topic") ?? "").trim().slice(0, 160),
      content: content.slice(0, 8000),
      sourceMaterial: String(formData.get("sourceMaterial") ?? "").trim().slice(0, 6000),
      siteId,
      scheduledFor: isoOrNull(formData.get("scheduledFor")) ?? new Date(),
      aiDrafted: formData.get("aiDrafted") === "1",
      createdByName: v.name,
    },
  });
  revalidatePath("/dashboard/training");
  revalidatePath("/dashboard/overview");
  return { success: "Toolbox talk published." };
}

export async function deleteToolboxTalk(talkId: string) {
  const v = await requireViewer();
  const talk = await prisma.toolboxTalk.findFirst({ where: { id: talkId, organizationId: v.organizationId } });
  if (!talk) throw new Error("Talk not found.");
  if (!v.isSafetyTeam && !(v.isSupervisor && talk.siteId === v.siteId)) throw new Error("You can't delete this talk.");
  await prisma.toolboxTalk.delete({ where: { id: talkId } });
  revalidatePath("/dashboard/training");
}

export async function acknowledgeTalk(talkId: string) {
  const v = await requireViewer();
  if (!v.employeeId) throw new Error("Only employees can acknowledge talks.");
  const talk = await prisma.toolboxTalk.findFirst({ where: { id: talkId, organizationId: v.organizationId } });
  if (!talk) throw new Error("Talk not found.");
  await prisma.talkAcknowledgement.upsert({
    where: { talkId_employeeId: { talkId, employeeId: v.employeeId } },
    update: {},
    create: { talkId, employeeId: v.employeeId },
  });
  revalidatePath("/dashboard/training");
  revalidatePath("/dashboard/overview");
}

export async function addQualification(_prev: TrainingFormState, formData: FormData): Promise<TrainingFormState> {
  const v = await requireViewer();
  if (!v.isSafetyTeam && !v.isSupervisor) return { error: "Only the safety team or a supervisor can record qualifications." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name the qualification." };
  const employee = await prisma.employee.findFirst({ where: { id: String(formData.get("employeeId") ?? ""), organizationId: v.organizationId } });
  if (!employee) return { error: "Choose a person." };
  if (!v.isSafetyTeam && employee.siteId !== v.siteId) return { error: "Supervisors can record qualifications for people at their own site." };
  await prisma.qualification.create({
    data: {
      organizationId: v.organizationId,
      employeeId: employee.id,
      name: name.slice(0, 120),
      issuedOn: isoOrNull(formData.get("issuedOn")),
      expiresOn: isoOrNull(formData.get("expiresOn")),
    },
  });
  revalidatePath("/dashboard/training");
  revalidatePath("/dashboard/overview");
  return { success: "Qualification recorded." };
}

export async function deleteQualification(id: string) {
  const v = await requireViewer();
  const q = await prisma.qualification.findFirst({ where: { id, organizationId: v.organizationId }, include: { } });
  if (!q) throw new Error("Not found.");
  if (!v.isSafetyTeam) {
    const emp = await prisma.employee.findUnique({ where: { id: q.employeeId }, select: { siteId: true } });
    if (!(v.isSupervisor && emp?.siteId === v.siteId)) throw new Error("You can't remove this qualification.");
  }
  await prisma.qualification.delete({ where: { id } });
  revalidatePath("/dashboard/training");
}
