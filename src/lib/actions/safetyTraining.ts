"use server";

import { fail } from "@/lib/actionResult";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit, isoOrNull, requireViewer } from "@/lib/safety/context";
import { suggestedExpiry } from "@/lib/safety/certifications";

export type TrainingFormState = { error?: string; success?: string } | undefined;

export async function createToolboxTalk(_prev: TrainingFormState, formData: FormData): Promise<TrainingFormState> {
  const v = await requireViewer();
  if (!v.isSafetyTeam && !v.isSupervisor) return { error: "Only the safety team or a supervisor can create toolbox talks." };
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) return { error: "A title and the talk content are required." };
  let siteId: string | null = String(formData.get("siteId") ?? "") || null;
  if (!v.isSafetyTeam) {
    // Supervisors talk to their own site only. Without a site they would be publishing to the whole company.
    if (!v.siteId) return { error: "Ask a company admin to assign you a home site before you create toolbox talks." };
    siteId = v.siteId;
  }
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
  if (!talk) return fail("Toolbox talk not found.");
  if (!v.isSafetyTeam && !(v.isSupervisor && v.siteId && talk.siteId === v.siteId)) return fail("You cannot delete this toolbox talk.");
  await prisma.toolboxTalk.delete({ where: { id: talkId } });
  revalidatePath("/dashboard/training");
}

export async function acknowledgeTalk(talkId: string) {
  const v = await requireViewer();
  if (!v.employeeId) return fail("Only employees can acknowledge toolbox talks.");
  const talk = await prisma.toolboxTalk.findFirst({ where: { id: talkId, organizationId: v.organizationId } });
  if (!talk) return fail("Toolbox talk not found.");
  if (talk.siteId) {
    // A talk addressed to one site is acknowledged by that site's people only.
    const me = await prisma.employee.findUnique({ where: { id: v.employeeId }, select: { siteId: true } });
    if (me?.siteId !== talk.siteId) return fail("This toolbox talk is for a different site.");
  }
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
  if (!v.isSafetyTeam && !v.isSupervisor) return { error: "Only the safety team or a supervisor can record certifications." };
  const employee = await prisma.employee.findFirst({ where: { id: String(formData.get("employeeId") ?? ""), organizationId: v.organizationId } });
  if (!employee) return { error: "Choose a person." };
  if (!v.isSafetyTeam && employee.siteId !== v.siteId) return { error: "Supervisors can record certifications for people at their own site only." };

  // A catalog entry sets the name, the issuing body and a suggested expiry; a free-text name still works for one-off certificates.
  const typeId = String(formData.get("typeId") ?? "");
  const type = typeId ? await prisma.certificationType.findFirst({ where: { id: typeId, organizationId: v.organizationId } }) : null;
  if (typeId && !type) return { error: "That certification is no longer in the catalog." };
  const name = (type?.name ?? String(formData.get("name") ?? "")).trim();
  if (!name) return { error: "Choose or name the certification." };

  const issuedOn = isoOrNull(formData.get("issuedOn"));
  let expiresOn = isoOrNull(formData.get("expiresOn"));
  if (!expiresOn && issuedOn && type?.validityMonths) expiresOn = suggestedExpiry(issuedOn, type.validityMonths);
  if (issuedOn && expiresOn && expiresOn < issuedOn) return { error: "The expiry date is before the issue date." };

  const created = await prisma.qualification.create({
    data: {
      organizationId: v.organizationId,
      employeeId: employee.id,
      name: name.slice(0, 120),
      typeId: type?.id ?? null,
      certificateNumber: String(formData.get("certificateNumber") ?? "").trim().slice(0, 80),
      issuingBody: (String(formData.get("issuingBody") ?? "").trim() || type?.issuingBody || "").slice(0, 120),
      notes: String(formData.get("notes") ?? "").trim().slice(0, 500),
      issuedOn,
      expiresOn,
      ...(v.isSafetyTeam && formData.get("verified") === "on" ? { verifiedAt: new Date(), verifiedById: v.userId } : {}),
    },
  });
  await audit(v, "safety.settings_changed", "Qualification", created.id, { recorded: true });
  revalidatePath("/dashboard/training");
  revalidatePath("/dashboard/overview");
  return { success: expiresOn && !formData.get("expiresOn") ? `Recorded. Expires ${expiresOn.toISOString().slice(0, 10)}.` : "Certification recorded." };
}

export async function deleteQualification(id: string) {
  const v = await requireViewer();
  const q = await prisma.qualification.findFirst({ where: { id, organizationId: v.organizationId }, include: { } });
  if (!q) return fail("Not found.");
  if (!v.isSafetyTeam) {
    const emp = await prisma.employee.findUnique({ where: { id: q.employeeId }, select: { siteId: true } });
    if (!(v.isSupervisor && v.siteId && emp?.siteId === v.siteId)) return fail("You cannot remove this certification.");
  }
  await prisma.qualification.delete({ where: { id } });
  revalidatePath("/dashboard/training");
}

/** Loads qualifications this person may manage: the safety team any, a supervisor only people at their own site. */
async function manageableQualifications(ids: string[]) {
  const v = await requireViewer();
  if (!v.isSafetyTeam && !v.isSupervisor) throw new Error("Only the safety team or a supervisor can change qualifications.");
  const rows = await prisma.qualification.findMany({ where: { id: { in: ids }, organizationId: v.organizationId } });
  if (rows.length === 0) throw new Error("Nothing selected.");
  if (!v.isSafetyTeam) {
    const emps = await prisma.employee.findMany({ where: { id: { in: rows.map((r) => r.employeeId) } }, select: { id: true, siteId: true } });
    const ok = new Set(emps.filter((e) => v.siteId && e.siteId === v.siteId).map((e) => e.id));
    if (rows.some((r) => !ok.has(r.employeeId))) throw new Error("You can only change certifications for people at your own site.");
  }
  return { v, rows };
}

export async function deleteQualifications(ids: string[]) {
  const { v, rows } = await manageableQualifications(ids);
  await prisma.qualification.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  await audit(v, "safety.settings_changed", "Qualification", rows[0].id, { removed: rows.length });
  revalidatePath("/dashboard/training");
  revalidatePath("/dashboard/overview");
}

/** Sets a new expiry date on several qualifications at once, for example after a group renewal. */
export async function setQualificationsExpiry(ids: string[], expiresOn: string) {
  const { v, rows } = await manageableQualifications(ids);
  const date = isoOrNull(expiresOn);
  if (!date) return fail("Choose a valid date.");
  await prisma.qualification.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { expiresOn: date, verifiedAt: null, verifiedById: null } });
  await audit(v, "safety.settings_changed", "Qualification", rows[0].id, { renewed: rows.length });
  revalidatePath("/dashboard/training");
  revalidatePath("/dashboard/overview");
}

export async function updateQualification(id: string, changes: { name: string; issuedOn: string; expiresOn: string; certificateNumber?: string; issuingBody?: string; notes?: string }) {
  const { v, rows } = await manageableQualifications([id]);
  const name = changes.name.trim().slice(0, 120);
  if (!name) return fail("Name the certification.");
  const issuedOn = isoOrNull(changes.issuedOn);
  const expiresOn = isoOrNull(changes.expiresOn);
  if (issuedOn && expiresOn && expiresOn < issuedOn) return fail("The expiry date is before the issue date.");
  await prisma.qualification.update({
    where: { id: rows[0].id },
    data: {
      name,
      issuedOn,
      expiresOn,
      ...(changes.certificateNumber !== undefined ? { certificateNumber: changes.certificateNumber.trim().slice(0, 80) } : {}),
      ...(changes.issuingBody !== undefined ? { issuingBody: changes.issuingBody.trim().slice(0, 120) } : {}),
      ...(changes.notes !== undefined ? { notes: changes.notes.trim().slice(0, 500) } : {}),
      // A changed certificate is no longer the one that was checked.
      ...(rows[0].expiresOn?.getTime() !== expiresOn?.getTime() || rows[0].issuedOn?.getTime() !== issuedOn?.getTime() || rows[0].certificateNumber !== (changes.certificateNumber ?? rows[0].certificateNumber).trim() ? { verifiedAt: null, verifiedById: null } : {}),
    },
  });
  await audit(v, "safety.settings_changed", "Qualification", id, { updated: true });
  revalidatePath("/dashboard/training");
  revalidatePath("/dashboard/overview");
  revalidatePath(`/dashboard/training/qualifications/${id}`);
}
