import "server-only";
import crypto from "node:crypto";
import { sendEmail, inviteEmailHtml, getAppUrl, isEmailConfigured } from "@/lib/email";

export type InviteDelivery = {
  emailSent?: boolean;
  /** Set when the email couldn't be sent, so the admin can pass the password on themselves. */
  tempPassword?: string;
  /** Why it couldn't be sent: "not configured" vs. a real provider error. */
  emailError?: string;
};

export function generateTempPassword() {
  return `Reldro-${crypto.randomBytes(5).toString("base64url")}!`;
}

export async function deliverInvite(params: {
  to: string;
  name: string;
  orgName: string;
  subject: string;
  tempPassword: string;
}): Promise<InviteDelivery> {
  const { to, name, orgName, subject, tempPassword } = params;
  const { sent, error } = await sendEmail({
    to,
    subject,
    html: inviteEmailHtml({ name, orgName, loginUrl: `${getAppUrl()}/login`, tempPassword }),
  });
  if (sent) return { emailSent: true };
  return {
    tempPassword,
    emailError: isEmailConfigured() ? (error ?? "The email provider rejected the message.") : "Email isn't configured in this environment.",
  };
}
