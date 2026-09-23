import "server-only";
import { Resend } from "resend";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

let client: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/** Sends a real email when Resend is configured; no-ops (and reports so) otherwise. */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<{ sent: boolean }> {
  const resend = getResend();
  if (!resend) return { sent: false };

  const from = process.env.EMAIL_FROM || "Reldro <onboarding@resend.dev>";
  await resend.emails.send({ from, to, subject, html });
  return { sent: true };
}

export function inviteEmailHtml({ name, orgName, loginUrl, tempPassword }: { name: string; orgName: string; loginUrl: string; tempPassword: string }) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #2A0A0C;">
      <h2 style="margin-bottom: 4px;">You're invited to Reldro</h2>
      <p style="color: #6B5A55;">${orgName} added you to their AI adoption workspace.</p>
      <p>Hi ${name},</p>
      <p>Your account is ready. Log in with the temporary password below, then change it from your account settings.</p>
      <table style="width: 100%; background: #F7F4EC; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <tr><td style="padding: 4px 16px; color: #6B5A55; font-size: 13px;">Temporary password</td></tr>
        <tr><td style="padding: 0 16px 12px; font-family: monospace; font-size: 16px; font-weight: 600;">${tempPassword}</td></tr>
      </table>
      <a href="${loginUrl}" style="display: inline-block; background: #2A0A0C; color: #EFEBE0; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-weight: 500;">Log in to Reldro</a>
      <p style="color: #8C7F6C; font-size: 12px; margin-top: 24px;">If you weren't expecting this, you can ignore this email.</p>
    </div>
  `;
}
