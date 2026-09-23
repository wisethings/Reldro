"use server";

import { prisma } from "@/lib/prisma";
import { sendEmail, demoRequestNotificationHtml, demoRequestConfirmationHtml } from "@/lib/email";

export type DemoRequestFormState = { success?: boolean; error?: string } | undefined;

/**
 * Public, unauthenticated - the entry point for a sales-led signup. No
 * organization or account is created here; a platform admin reviews the
 * request and provisions the workspace from Platform Admin > Demo requests.
 */
export async function submitDemoRequest(_prevState: DemoRequestFormState, formData: FormData): Promise<DemoRequestFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const companySize = String(formData.get("companySize") ?? "").trim() || undefined;
  const message = String(formData.get("message") ?? "").trim() || undefined;

  if (!name || !email || !companyName) return { error: "Name, work email, and company are required." };
  if (!email.includes("@")) return { error: "Enter a valid email address." };

  await prisma.demoRequest.create({
    data: { name, email, companyName, companySize, message },
  });

  const notifyEmail = process.env.SALES_NOTIFICATION_EMAIL || "platform@reldro.com";
  await sendEmail({
    to: notifyEmail,
    subject: `New demo request: ${companyName}`,
    html: demoRequestNotificationHtml({ name, email, companyName, companySize, message }),
  });
  await sendEmail({
    to: email,
    subject: "Thanks for your interest in Reldro",
    html: demoRequestConfirmationHtml({ name, companyName }),
  });

  return { success: true };
}
