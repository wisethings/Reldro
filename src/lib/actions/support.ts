"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rateLimit";
import { emailShell, escapeHtml, getAppUrl, sendEmail } from "@/lib/email";

export type SupportMessageView = { id: string; fromStaff: boolean; senderName: string; body: string; createdAt: string };
export type SupportThread = { messages: SupportMessageView[]; unread: number; sampleWorkspace: boolean };

const view = (m: { id: string; fromStaff: boolean; senderName: string; body: string; createdAt: Date }): SupportMessageView => ({ id: m.id, fromStaff: m.fromStaff, senderName: m.senderName, body: m.body, createdAt: m.createdAt.toISOString() });

async function me() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) throw new Error("No organization.");
  const org = await prisma.organization.findUnique({ where: { id: session.organizationId }, select: { isDemo: true, name: true } });
  return { session, orgId: session.organizationId, org };
}

/** How many replies from the Reldro team this admin hasn't opened yet. Cheap enough to poll. */
export async function supportUnreadCount(): Promise<number> {
  const { session } = await me();
  return prisma.supportMessage.count({ where: { userId: session.sub, fromStaff: true, readAt: null } });
}

/** The admin's conversation with the Reldro team. Opening it marks the team's replies as read. */
export async function openSupportThread(): Promise<SupportThread> {
  const { session, org } = await me();
  await prisma.supportMessage.updateMany({ where: { userId: session.sub, fromStaff: true, readAt: null }, data: { readAt: new Date() } });
  const rows = await prisma.supportMessage.findMany({ where: { userId: session.sub }, orderBy: { createdAt: "asc" }, take: 200 });
  return { messages: rows.map(view), unread: 0, sampleWorkspace: Boolean(org?.isDemo) };
}

export async function sendSupportMessage(body: string): Promise<{ error?: string; message?: SupportMessageView }> {
  const { session, orgId, org } = await me();
  if (org?.isDemo) return { error: "Messages are turned off in the sample workspace." };
  const text = body.trim().slice(0, 2000);
  if (!text) return { error: "Write a message first." };
  if (!(await checkRateLimit(`support:${session.sub}`, 20, 60))) return { error: "You have sent a lot of messages in the last hour. Please wait a bit, or email us." };
  const row = await prisma.supportMessage.create({ data: { organizationId: orgId, userId: session.sub, fromStaff: false, senderName: session.name, body: text } });
  const to = process.env.SUPPORT_EMAIL;
  if (to) {
    await sendEmail({
      to,
      subject: `Reldro help question from ${session.name} at ${org?.name ?? "a customer"}`,
      html: emailShell({ bodyHtml: `<p>${escapeHtml(session.name)} at ${escapeHtml(org?.name ?? "a customer")} asked:</p><p style="white-space: pre-wrap">${escapeHtml(text)}</p>`, button: { label: "Open the conversation", url: `${getAppUrl()}/platform-admin/support/${session.sub}` }, footer: "Support inbox notification from Reldro." }),
    }).catch(() => {});
  }
  revalidatePath("/platform-admin/support");
  return { message: view(row) };
}

/** Reldro team side: reply to one admin. */
export async function replyToSupport(userId: string, body: string): Promise<{ error?: string }> {
  const session = await requireRole(["PLATFORM_ADMIN"]);
  const text = body.trim().slice(0, 4000);
  if (!text) return { error: "Write a reply first." };
  const admin = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true, email: true, name: true, organization: { select: { isDemo: true } } } });
  if (!admin?.organizationId) return { error: "That conversation no longer exists." };
  await prisma.supportMessage.updateMany({ where: { userId, fromStaff: false, readAt: null }, data: { readAt: new Date() } });
  await prisma.supportMessage.create({ data: { organizationId: admin.organizationId, userId, fromStaff: true, senderName: session.name || "Reldro support", body: text } });
  if (!admin.organization?.isDemo) {
    // The email only says there is a reply; the message itself is read inside the app.
    await sendEmail({
      to: admin.email,
      subject: "Reldro replied to your question",
      html: emailShell({ bodyHtml: `<p>Hi ${escapeHtml(admin.name.split(" ")[0] ?? "there")},</p><p>The Reldro team replied to your question. Sign in and open the help button to read the reply.</p>`, button: { label: "Open Reldro", url: `${getAppUrl()}/login` }, footer: "The reply itself is not included in this email." }),
    }).catch(() => {});
  }
  revalidatePath(`/platform-admin/support/${userId}`);
  revalidatePath("/platform-admin/support");
  return {};
}

export async function markSupportReadByStaff(userId: string) {
  await requireRole(["PLATFORM_ADMIN"]);
  await prisma.supportMessage.updateMany({ where: { userId, fromStaff: false, readAt: null }, data: { readAt: new Date() } });
}
