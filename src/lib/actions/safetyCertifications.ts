"use server";

import { fail } from "@/lib/actionResult";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit, requireViewer } from "@/lib/safety/context";

export type CertTypeInput = {
  id?: string;
  name: string;
  category: string;
  issuingBody: string;
  validityMonths: string;
  requiredScope: string;
  requiredSiteIds: string[];
  requiredCrewIds: string[];
};

function refresh() {
  revalidatePath("/dashboard/training");
  revalidatePath("/dashboard/overview");
}

/** Creates or updates a certification in the catalog. The safety team defines what the company tracks and who must hold it. */
export async function saveCertificationType(input: CertTypeInput) {
  const v = await requireViewer();
  if (!v.isSafetyTeam) return fail("Only the safety team can change which certifications are tracked.");
  const name = input.name.trim().slice(0, 120);
  if (!name) return fail("Name the certification.");
  const months = input.validityMonths.trim() === "" ? null : Number(input.validityMonths);
  if (months !== null && (!Number.isInteger(months) || months < 1 || months > 600)) return fail("Validity is a whole number of months between 1 and 600, or leave it blank if it does not expire.");
  const scope = ["NONE", "ALL", "SELECTED"].includes(input.requiredScope) ? input.requiredScope : "NONE";

  // Only ids that belong to this company, so a crafted request cannot reference another company's sites or crews.
  const [sites, crews] = await Promise.all([
    prisma.site.findMany({ where: { organizationId: v.organizationId, id: { in: input.requiredSiteIds } }, select: { id: true } }),
    prisma.department.findMany({ where: { organizationId: v.organizationId, id: { in: input.requiredCrewIds } }, select: { id: true } }),
  ]);
  if (scope === "SELECTED" && sites.length + crews.length === 0) return fail("Choose at least one site or crew, or set it to everyone.");

  const data = {
    name,
    category: input.category.trim().slice(0, 80),
    issuingBody: input.issuingBody.trim().slice(0, 120),
    validityMonths: months,
    requiredScope: scope,
    requiredSiteIds: scope === "SELECTED" ? sites.map((s) => s.id) : [],
    requiredCrewIds: scope === "SELECTED" ? crews.map((c) => c.id) : [],
  };
  const clash = await prisma.certificationType.findFirst({ where: { organizationId: v.organizationId, name: { equals: name, mode: "insensitive" }, ...(input.id ? { NOT: { id: input.id } } : {}) }, select: { id: true } });
  if (clash) return fail("A certification with that name already exists.");

  if (input.id) {
    const existing = await prisma.certificationType.findFirst({ where: { id: input.id, organizationId: v.organizationId } });
    if (!existing) return fail("Certification not found.");
    await prisma.certificationType.update({ where: { id: existing.id }, data });
    // Keep the display name on its records in step with the catalog.
    if (existing.name !== name) await prisma.qualification.updateMany({ where: { typeId: existing.id }, data: { name } });
    await audit(v, "safety.settings_changed", "CertificationType", existing.id, { updated: true });
  } else {
    const created = await prisma.certificationType.create({ data: { organizationId: v.organizationId, ...data } });
    // Free-text records that already use this name start counting toward it.
    await prisma.qualification.updateMany({ where: { organizationId: v.organizationId, typeId: null, name: { equals: name, mode: "insensitive" } }, data: { typeId: created.id, name } });
    await audit(v, "safety.settings_changed", "CertificationType", created.id, { created: true });
  }
  refresh();
}

/** Removes a certification from the catalog. People's records stay, as free-text records. */
export async function deleteCertificationType(id: string) {
  const v = await requireViewer();
  if (!v.isSafetyTeam) return fail("Only the safety team can change which certifications are tracked.");
  const type = await prisma.certificationType.findFirst({ where: { id, organizationId: v.organizationId } });
  if (!type) return fail("Certification not found.");
  await prisma.certificationType.delete({ where: { id } });
  await audit(v, "safety.settings_changed", "CertificationType", id, { deleted: true, name: type.name });
  refresh();
}

/** A safety lead confirms they have seen the certificate itself. Supervisors can record but not verify. */
export async function verifyQualification(id: string, verified: boolean) {
  const v = await requireViewer();
  if (!v.isSafetyTeam) return fail("Only the safety team can verify certificates.");
  const q = await prisma.qualification.findFirst({ where: { id, organizationId: v.organizationId } });
  if (!q) return fail("Not found.");
  await prisma.qualification.update({ where: { id }, data: verified ? { verifiedAt: new Date(), verifiedById: v.userId } : { verifiedAt: null, verifiedById: null } });
  await audit(v, "safety.settings_changed", "Qualification", id, { verified });
  refresh();
  revalidatePath(`/dashboard/training/qualifications/${id}`);
}
