"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audit, requireViewer } from "@/lib/safety/context";
import { sendEmail, escapeHtml } from "@/lib/email";
import { getPack, SEVERITY_ORDER, SITE_KINDS } from "@/lib/safety/pack";

export type SettingsFormState = { error?: string; success?: string } | undefined;

export async function saveSite(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const v = await requireViewer();
  if (!v.isSafetyTeam) return { error: "Only the safety team can manage sites." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the site a name." };
  const id = String(formData.get("siteId") ?? "");
  const kind = SITE_KINDS.some((k) => k.key === String(formData.get("kind"))) ? String(formData.get("kind")) : "JOBSITE";
  let safetyLeadId: string | null = String(formData.get("safetyLeadId") ?? "") || null;
  if (safetyLeadId) {
    const lead = await prisma.employee.findFirst({ where: { id: safetyLeadId, organizationId: v.organizationId } });
    if (!lead) safetyLeadId = null;
  }
  const data = { name: name.slice(0, 120), address: String(formData.get("address") ?? "").trim().slice(0, 300), kind, safetyLeadId, active: formData.get("active") !== "off" };
  if (id) {
    const site = await prisma.site.findFirst({ where: { id, organizationId: v.organizationId } });
    if (!site) return { error: "Site not found." };
    await prisma.site.update({ where: { id }, data });
  } else {
    await prisma.site.create({ data: { ...data, organizationId: v.organizationId } });
  }
  await audit(v, "safety.settings_changed", "Site", id || name, { saved: true });
  revalidatePath("/dashboard/sites");
  return { success: id ? "Site updated." : "Site added." };
}

export async function setSiteActive(siteId: string, active: boolean) {
  const v = await requireViewer();
  if (!v.isSafetyTeam) throw new Error("Only the safety team can manage sites.");
  const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: v.organizationId } });
  if (!site) throw new Error("Site not found.");
  await prisma.site.update({ where: { id: siteId }, data: { active } });
  await audit(v, "safety.settings_changed", "Site", siteId, { active });
  revalidatePath("/dashboard/sites");
}

/** Only company admins can change who is on the safety team or supervises a site, so a safety lead can't promote themselves. */
export async function setPersonRoles(employeeId: string, changes: { siteId?: string | null; isSafetyLead?: boolean; isSupervisor?: boolean }) {
  const v = await requireViewer();
  if (!v.isAdmin) throw new Error("Only company admins can change roles.");
  const emp = await prisma.employee.findFirst({ where: { id: employeeId, organizationId: v.organizationId } });
  if (!emp) throw new Error("Person not found.");
  const data: { siteId?: string | null; isSafetyLead?: boolean; isDepartmentAdmin?: boolean } = {};
  if (changes.siteId !== undefined) {
    if (changes.siteId) {
      const site = await prisma.site.findFirst({ where: { id: changes.siteId, organizationId: v.organizationId } });
      if (!site) throw new Error("Site not found.");
    }
    data.siteId = changes.siteId;
  }
  if (changes.isSafetyLead !== undefined) data.isSafetyLead = changes.isSafetyLead;
  if (changes.isSupervisor !== undefined) data.isDepartmentAdmin = changes.isSupervisor;
  await prisma.employee.update({ where: { id: employeeId }, data });
  await audit(v, "safety.settings_changed", "Employee", employeeId, data as Record<string, unknown>);
  revalidatePath("/dashboard/training");
  revalidatePath("/dashboard/sites");
}

export async function createEscalationRule(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const v = await requireViewer();
  if (!v.isAdmin) return { error: "Only company admins can change escalation rules." };
  const pack = getPack();
  const minSeverity = String(formData.get("minSeverity") ?? "");
  if (!SEVERITY_ORDER.includes(minSeverity as (typeof SEVERITY_ORDER)[number])) return { error: "Choose a severity." };
  const category = String(formData.get("category") ?? "") || null;
  if (category && !pack.categories.some((c) => c.key === category)) return { error: "Unknown category." };
  const siteId = String(formData.get("siteId") ?? "") || null;
  const ownerId = String(formData.get("ownerId") ?? "") || null;
  const escalateToId = String(formData.get("escalateToId") ?? "") || null;
  const hours = Math.round(Number(formData.get("respondWithinHours")));
  if (!(hours >= 1 && hours <= 720)) return { error: "Response time must be between 1 and 720 hours." };
  for (const [label, id] of [["Owner", ownerId], ["Escalate-to person", escalateToId]] as const) {
    if (id) {
      const e = await prisma.employee.findFirst({ where: { id, organizationId: v.organizationId } });
      if (!e) return { error: `${label} not found.` };
    }
  }
  if (siteId) {
    const s = await prisma.site.findFirst({ where: { id: siteId, organizationId: v.organizationId } });
    if (!s) return { error: "Site not found." };
  }
  const openIncident = formData.get("openIncident") === "on";
  if (openIncident && !ownerId) {
    // An incident needs somebody to lead it, so a rule that opens one must name that person.
    return { error: "To open an incident response automatically, choose who leads it in “Assign to”." };
  }
  await prisma.escalationRule.create({ data: { organizationId: v.organizationId, minSeverity, category, siteId, ownerId, escalateToId, respondWithinHours: hours, openIncident } });
  await audit(v, "safety.settings_changed", "EscalationRule", minSeverity, { created: true });
  revalidatePath("/dashboard/settings");
  return { success: "Rule added." };
}

export async function deleteEscalationRule(ruleId: string) {
  const v = await requireViewer();
  if (!v.isAdmin) throw new Error("Only company admins can change escalation rules.");
  const rule = await prisma.escalationRule.findFirst({ where: { id: ruleId, organizationId: v.organizationId } });
  if (!rule) throw new Error("Rule not found.");
  await prisma.escalationRule.delete({ where: { id: ruleId } });
  await audit(v, "safety.settings_changed", "EscalationRule", ruleId, { deleted: true });
  revalidatePath("/dashboard/settings");
}

/** Optional, paid safety setup or advisor help. A request is recorded for the Reldro team; nothing is bought by asking. */
export async function requestSetupSupport(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const v = await requireViewer();
  if (!v.isAdmin) return { error: "Only company admins can request support." };
  const need = String(formData.get("need") ?? "").trim();
  if (!need) return { error: "Tell us briefly what you'd like help with." };
  await audit(v, "setup_support.requested", "Organization", v.organizationId, { need: need.slice(0, 1000), by: v.name });
  const to = process.env.SUPPORT_EMAIL;
  if (to) {
    await sendEmail({ to, subject: "Optional setup support requested", html: `<p>${escapeHtml(v.name)} asked for setup support:</p><p>${escapeHtml(need)}</p>` });
  }
  revalidatePath("/dashboard/settings");
  return { success: "Request recorded. Someone from Reldro will follow up about scope and pricing. Asking doesn't commit you to anything." };
}

/** First-run setup: one site (with the admin as its safety lead), optional starter checklists, then mark onboarding done. */
export async function completeSafetyOnboarding(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const v = await requireViewer();
  if (!v.isAdmin) return { error: "Only company admins can finish setup." };
  const siteName = String(formData.get("siteName") ?? "").trim();
  if (!siteName) return { error: "Name your first site." };

  const site = await prisma.site.create({
    data: { organizationId: v.organizationId, name: siteName.slice(0, 120), address: String(formData.get("address") ?? "").trim().slice(0, 300), kind: "JOBSITE" },
  });
  if (formData.get("starterTemplates") === "on") {
    const pack = getPack();
    for (const t of pack.inspectionTemplates) {
      await prisma.inspectionTemplate.create({
        data: { organizationId: v.organizationId, name: t.name, kind: t.kind, frequencyDays: t.frequencyDays, items: t.items.map((it, i) => ({ id: `i${i + 1}`, label: it.label, critical: Boolean(it.critical) })) },
      });
    }
  }
  const emergencyInstructions = String(formData.get("emergencyInstructions") ?? "").trim().slice(0, 600);
  await prisma.organization.update({ where: { id: v.organizationId }, data: { onboardingDone: true, onboardingStep: 1, ...(emergencyInstructions ? { emergencyInstructions } : {}) } });
  await audit(v, "safety.settings_changed", "Site", site.id, { onboarding: true });
  redirect("/dashboard/overview");
}

export async function saveEmergencyInstructions(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const v = await requireViewer();
  if (!v.isAdmin) return { error: "Only company admins can change this." };
  const text = String(formData.get("emergencyInstructions") ?? "").trim().slice(0, 600);
  await prisma.organization.update({ where: { id: v.organizationId }, data: { emergencyInstructions: text } });
  await audit(v, "safety.settings_changed", "Organization", v.organizationId, { emergencyInstructions: true });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/reports/new");
  return { success: text ? "Saved. Reporters will see this before they submit." : "Cleared. Reporters will see the default message." };
}
