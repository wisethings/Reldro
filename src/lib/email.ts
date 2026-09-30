import "server-only";
import { Resend } from "resend";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * The app's own public origin, for building links embedded in outbound
 * emails (login links, project links) and OAuth redirect URIs (Slack).
 * Deliberately NOT derived from the request's Host header: several callers
 * of this (the employee-invite flow) are reachable by an unauthenticated or lower-trust caller who could
 * set that header to anything, turning "https://${host}/login" into a
 * phishing link mailed out under Reldro's own name to a real inbox with a
 * real temporary password. Set APP_URL to override for local dev or a
 * preview deploy; otherwise this is the known production domain.
 */
export function getAppUrl(): string {
  return process.env.APP_URL || "https://app.reldro.com";
}

/** Escapes text interpolated into an HTML email template - required for any field a user (especially an unauthenticated one) typed themselves. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let client: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/** Sends a real email when Resend is configured; no-ops (and reports so) otherwise. */
export async function sendEmail({
  to,
  cc,
  subject,
  html,
}: {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
}): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) return { sent: false, error: "RESEND_API_KEY is not set" };

  const from = process.env.EMAIL_FROM || "Reldro <onboarding@resend.dev>";
  const { error } = await resend.emails.send({ from, to, cc: cc && cc.length > 0 ? cc : undefined, subject, html });
  if (error) {
    console.error(`sendEmail failed (to=${to}, from=${from}):`, error);
    return { sent: false, error: error.message };
  }
  return { sent: true };
}

/**
 * Sends one email per recipient (each only sees their own address) via
 * Resend's batch endpoint, chunked to its 100-per-call limit. Used for
 * one-to-many sends (product update announcements) where sendEmail's
 * single `to` would mean one call per recipient.
 */
export async function sendBulkEmail({
  recipients,
  subject,
  html,
}: {
  recipients: string[];
  subject: string;
  html: string;
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  const resend = getResend();
  if (!resend) return { sent: 0, failed: recipients.length, errors: ["RESEND_API_KEY is not set"] };
  if (recipients.length === 0) return { sent: 0, failed: 0, errors: [] };

  const from = process.env.EMAIL_FROM || "Reldro <onboarding@resend.dev>";
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    // Resend's batch send defaults to "strict" validation: one malformed
    // address (e.g. from an unauthenticated form's loose email check) fails
    // the *entire* chunk of up to 100, silently dropping every valid
    // recipient in it. "permissive" sends the valid ones and reports only
    // the bad indices, so one bad row doesn't cost 99 good sends.
    const { data, error } = await resend.batch.send(
      chunk.map((to) => ({ from, to, subject, html })),
      { batchValidation: "permissive" }
    );
    if (error) {
      failed += chunk.length;
      errors.push(error.message);
      console.error(`sendBulkEmail batch failed (${chunk.length} recipients):`, error);
    } else {
      const chunkErrors = data?.errors ?? [];
      sent += chunk.length - chunkErrors.length;
      failed += chunkErrors.length;
      for (const e of chunkErrors) errors.push(`${chunk[e.index]}: ${e.message}`);
    }
  }

  return { sent, failed, errors };
}

export function productUpdateEmailHtml({ subject, bodyHtml }: { subject: string; bodyHtml: string }) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #2A0A0C;">
      <h2 style="margin-bottom: 4px;">${subject}</h2>
      <p style="color: #6B5A55; font-size: 13px;">An update from the Reldro team</p>
      <div style="margin-top: 16px; font-size: 14px; line-height: 1.6;">${bodyHtml}</div>
      <p style="color: #8C7F6C; font-size: 12px; margin-top: 32px;">You're receiving this because you have a Reldro account.</p>
    </div>
  `;
}

export function inviteEmailHtml({ name, orgName, loginUrl, tempPassword }: { name: string; orgName: string; loginUrl: string; tempPassword: string }) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #2A0A0C;">
      <h2 style="margin-bottom: 4px;">You're invited to Reldro</h2>
      <p style="color: #6B5A55;">${escapeHtml(orgName)} added you to their AI Transformation Platform.</p>
      <p>Hi ${escapeHtml(name)},</p>
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
