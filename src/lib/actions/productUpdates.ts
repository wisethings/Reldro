"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { sendBulkEmail, productUpdateEmailHtml, escapeHtml } from "@/lib/email";
import { logAudit } from "@/lib/audit";

export type ProductUpdateState = { error?: string; sent?: number; failed?: number; total?: number } | undefined;

const AUDIENCES = ["employees", "admins", "leads"] as const;
type Audience = (typeof AUDIENCES)[number];

function textToHtml(input: string) {
  return input
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

/**
 * Platform admin only: composes a one-off announcement and sends it to
 * whichever audiences are checked. No scheduling or drafts - this is a
 * "write it and send it now" tool, per the manual-trigger scope.
 */
export async function sendProductUpdate(_prevState: ProductUpdateState, formData: FormData): Promise<ProductUpdateState> {
  const session = await requireRole(["PLATFORM_ADMIN"]);

  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const audiences = formData
    .getAll("audience")
    .map(String)
    .filter((a): a is Audience => (AUDIENCES as readonly string[]).includes(a));

  if (!subject || !message) return { error: "Subject and message are required." };
  if (audiences.length === 0) return { error: "Pick at least one audience." };

  const emails = new Set<string>();

  if (audiences.includes("employees")) {
    const users = await prisma.user.findMany({
      where: { organizationId: { not: null }, role: { in: ["COMPANY_ADMIN", "EMPLOYEE"] } },
      select: { email: true },
    });
    users.forEach((u) => emails.add(u.email.toLowerCase()));
  }
  if (audiences.includes("admins")) {
    const admins = await prisma.user.findMany({ where: { role: "COMPANY_ADMIN" }, select: { email: true } });
    admins.forEach((u) => emails.add(u.email.toLowerCase()));
  }
  if (audiences.includes("leads")) {
    const leads = await prisma.demoRequest.findMany({ select: { email: true } });
    leads.forEach((l) => emails.add(l.email.toLowerCase()));
  }

  const recipients = Array.from(emails);
  if (recipients.length === 0) return { error: "No recipients matched the selected audience." };

  const html = productUpdateEmailHtml({ subject: escapeHtml(subject), bodyHtml: textToHtml(message) });
  const { sent, failed, errors } = await sendBulkEmail({ recipients, subject, html });

  await logAudit({
    userId: session.sub,
    action: "product_update.sent",
    entityType: "ProductUpdate",
    metadata: { subject, audiences, total: recipients.length, sent, failed },
  });

  if (sent === 0 && failed > 0) {
    return { error: errors[0] ? `Send failed: ${errors[0]}` : "Send failed for all recipients." };
  }

  return { sent, failed, total: recipients.length };
}
