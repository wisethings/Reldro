"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/actionResult";
import { requireRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { deliverInvite, generateTempPassword, type InviteDelivery } from "@/lib/invites";
import { logAudit } from "@/lib/audit";
import { seatUsage } from "@/lib/seats";

export type ProvisionOrgState = ({ error?: string } & InviteDelivery) | undefined;

const MAX_SEATS = 100_000;

/** Reads a seat count from a form field: empty means "no limit", anything else must be a whole number from 1 up. */
function parseSeats(raw: string): { ok: true; seats: number | null } | { ok: false; error: string } {
  const text = raw.trim();
  if (!text) return { ok: true, seats: null };
  if (!/^\d+$/.test(text)) return { ok: false, error: "Seats must be a whole number, or empty for no limit." };
  const n = Number(text);
  if (n < 1 || n > MAX_SEATS) return { ok: false, error: `Seats must be between 1 and ${MAX_SEATS.toLocaleString("en-US")}.` };
  return { ok: true, seats: n };
}

/**
 * Sales-led provisioning: a platform admin creates the organization and its
 * first COMPANY_ADMIN account after a demo conversation, rather than a
 * prospect self-registering. Mirrors the employee-invite pattern (temp
 * password emailed, or shown here if the email could not be sent).
 */
export async function provisionOrganization(_prevState: ProvisionOrgState, formData: FormData): Promise<ProvisionOrgState> {
  const staff = await requireRole(["PLATFORM_ADMIN"]);

  const companyName = String(formData.get("companyName") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const size = String(formData.get("size") ?? "").trim();
  const geography = String(formData.get("geography") ?? "").trim();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();
  const seats = parseSeats(String(formData.get("seats") ?? ""));

  if (!companyName || !adminName || !adminEmail) {
    return { error: "Company name, admin name, and admin email are required." };
  }
  if (!adminEmail.includes("@")) return { error: "Enter a valid admin email address." };
  if (!seats.ok) return { error: seats.error };

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) return { error: "An account with that email already exists." };

  const org = await prisma.organization.create({
    data: { name: companyName, industry, size, revenueRange: "", geography, businessModel: "", goals: [], seatLimit: seats.seats },
  });

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.user.create({
    data: { name: adminName, email: adminEmail, passwordHash, role: "COMPANY_ADMIN", organizationId: org.id },
  });

  const delivery = await deliverInvite({
    to: adminEmail,
    name: adminName,
    orgName: org.name,
    subject: "Your Reldro workspace is ready",
    tempPassword,
  });
  await logAudit({ organizationId: org.id, userId: staff.sub, action: "platform.org_provisioned", entityType: "Organization", entityId: org.id, metadata: { company: org.name, adminEmail, seats: seats.seats } });

  revalidatePath("/platform-admin/organizations");
  revalidatePath("/platform-admin");
  return delivery;
}

async function orgOrFail(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true, isDemo: true, seatLimit: true, suspendedAt: true } });
  if (!org) return fail("That organization no longer exists.");
  return org;
}

function refresh(orgId: string) {
  revalidatePath(`/platform-admin/organizations/${orgId}`);
  revalidatePath("/platform-admin/organizations");
  revalidatePath("/platform-admin");
  revalidatePath("/platform-admin/activity");
}

/** Sets how many people the workspace may have. Empty text removes the limit. */
export async function setSeatLimit(orgId: string, raw: string): Promise<void> {
  const staff = await requireRole(["PLATFORM_ADMIN"]);
  const org = await orgOrFail(orgId);
  const parsed = parseSeats(raw);
  if (!parsed.ok) return fail(parsed.error);
  const { used } = await seatUsage(orgId);
  if (parsed.seats !== null && parsed.seats < used) return fail(`${used} people already have accounts here. Remove some of them first, or set ${used} or more.`);
  if (parsed.seats === org.seatLimit) return;
  await prisma.organization.update({ where: { id: orgId }, data: { seatLimit: parsed.seats } });
  await logAudit({ organizationId: orgId, userId: staff.sub, action: "platform.seats_changed", entityType: "Organization", entityId: orgId, metadata: { from: org.seatLimit, to: parsed.seats } });
  refresh(orgId);
}

/** Locks (or reopens) a workspace. While suspended nobody in it can sign in, and sessions that are already open stop working on their next request. */
export async function setSuspended(orgId: string, suspend: boolean, reason: string): Promise<void> {
  const staff = await requireRole(["PLATFORM_ADMIN"]);
  const org = await orgOrFail(orgId);
  const note = reason.trim().slice(0, 300);
  if (suspend) {
    if (org.isDemo) return fail("The sample workspace can't be suspended.");
    if (org.suspendedAt) return fail("This workspace is already suspended.");
    if (!note) return fail("Add a short reason so the next person on the team knows why.");
    await prisma.organization.update({ where: { id: orgId }, data: { suspendedAt: new Date() } });
    await logAudit({ organizationId: orgId, userId: staff.sub, action: "platform.org_suspended", entityType: "Organization", entityId: orgId, metadata: { reason: note } });
  } else {
    if (!org.suspendedAt) return fail("This workspace isn't suspended.");
    await prisma.organization.update({ where: { id: orgId }, data: { suspendedAt: null } });
    await logAudit({ organizationId: orgId, userId: staff.sub, action: "platform.org_reactivated", entityType: "Organization", entityId: orgId, metadata: note ? { note } : undefined });
  }
  refresh(orgId);
}

export type ResendResult = ({ error?: string } & InviteDelivery) | undefined;

/** Sends a new temporary password to a company admin who has never signed in. Admins who have signed in are left alone. */
export async function resendAdminInvite(userId: string): Promise<ResendResult> {
  const staff = await requireRole(["PLATFORM_ADMIN"]);
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { organization: { select: { id: true, name: true, suspendedAt: true } } } });
  if (!user || user.role !== "COMPANY_ADMIN" || !user.organization) return { error: "That admin no longer exists." };
  if (user.lastLoginAt) return { error: "This admin has already signed in, so there is no pending invite." };

  const tempPassword = generateTempPassword();
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(tempPassword), failedLoginAttempts: 0, lockedUntil: null } });
  const delivery = await deliverInvite({
    to: user.email,
    name: user.name,
    orgName: user.organization.name,
    subject: "Your Reldro workspace is ready",
    tempPassword,
  });
  await logAudit({ organizationId: user.organization.id, userId: staff.sub, action: "platform.invite_resent", entityType: "User", entityId: user.id, metadata: { email: user.email, emailSent: Boolean(delivery.emailSent) } });
  refresh(user.organization.id);
  return delivery;
}
