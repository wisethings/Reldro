import "server-only";
import { Resend } from "resend";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
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

export function expertHelpRequestEmailHtml({
  requesterName,
  orgName,
  title,
  objective,
  challenges,
  engagementModel,
  urgency,
  timeline,
  budget,
  ccEmails,
}: {
  requesterName: string;
  orgName: string;
  title: string;
  objective: string;
  challenges: string;
  engagementModel?: string;
  urgency?: string;
  timeline?: string;
  budget?: number;
  ccEmails: string[];
}) {
  const row = (label: string, value?: string) =>
    value ? `<tr><td style="padding: 6px 16px 6px 0; color: #6B5A55; font-size: 13px; white-space: nowrap;">${label}</td><td style="padding: 6px 0; font-size: 13px; color: #2A0A0C;">${value}</td></tr>` : "";

  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; color: #2A0A0C;">
      <h2 style="margin-bottom: 4px;">We've received your request</h2>
      <p style="color: #6B5A55;">${orgName} · Expert help</p>
      <p>Hi ${requesterName},</p>
      <p>Thanks for the detail. A member of the Reldro team will review this and reach out by email within one business day to discuss next steps and match you with a specialist.</p>
      <table style="width: 100%; background: #F7F4EC; border-radius: 12px; padding: 16px; margin: 16px 0; border-collapse: collapse;">
        ${row("Request", title)}
        ${row("Objective", objective)}
        ${row("Current situation", challenges)}
        ${row("Engagement model", engagementModel)}
        ${row("Urgency", urgency)}
        ${row("Timeline", timeline)}
        ${row("Budget", budget ? `$${budget.toLocaleString()}` : undefined)}
        ${row("Also looped in", ccEmails.length > 0 ? ccEmails.join(", ") : undefined)}
      </table>
      <p style="color: #8C7F6C; font-size: 12px; margin-top: 24px;">You can track this request any time from Expert Help in your Reldro dashboard.</p>
    </div>
  `;
}

export function demoRequestNotificationHtml({
  name,
  email,
  companyName,
  companySize,
  message,
}: {
  name: string;
  email: string;
  companyName: string;
  companySize?: string;
  message?: string;
}) {
  // This form is public and unauthenticated - every field here is escaped
  // before going into an internal inbox, or anyone could inject arbitrary
  // HTML (fake links, spoofed banners) into staff email.
  const row = (label: string, value?: string) =>
    value ? `<tr><td style="padding: 6px 16px 6px 0; color: #6B5A55; font-size: 13px; white-space: nowrap;">${label}</td><td style="padding: 6px 0; font-size: 13px; color: #2A0A0C;">${escapeHtml(value)}</td></tr>` : "";

  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; color: #2A0A0C;">
      <h2 style="margin-bottom: 4px;">New demo request</h2>
      <p style="color: #6B5A55;">${escapeHtml(companyName)}</p>
      <table style="width: 100%; background: #F7F4EC; border-radius: 12px; padding: 16px; margin: 16px 0; border-collapse: collapse;">
        ${row("Name", name)}
        ${row("Email", email)}
        ${row("Company", companyName)}
        ${row("Company size", companySize)}
        ${row("Message", message)}
      </table>
      <p style="color: #8C7F6C; font-size: 12px; margin-top: 24px;">Provision this organization from Platform Admin > Demo requests once you've connected.</p>
    </div>
  `;
}

export function demoRequestConfirmationHtml({ name, companyName }: { name: string; companyName: string }) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #2A0A0C;">
      <h2 style="margin-bottom: 4px;">Thanks for your interest in Reldro</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>We received your request on behalf of ${escapeHtml(companyName)}. A member of our team will reach out by email shortly to schedule a walkthrough and get your workspace set up.</p>
      <p style="color: #8C7F6C; font-size: 12px; margin-top: 24px;">If you weren't expecting this, you can ignore this email.</p>
    </div>
  `;
}

export function orgProvisionedEmailHtml({ name, orgName, loginUrl, tempPassword }: { name: string; orgName: string; loginUrl: string; tempPassword: string }) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #2A0A0C;">
      <h2 style="margin-bottom: 4px;">Your Reldro workspace is ready</h2>
      <p style="color: #6B5A55;">${orgName}</p>
      <p>Hi ${name},</p>
      <p>Following up on our conversation - your Reldro workspace is set up. Log in with the temporary password below, then change it from your account settings.</p>
      <table style="width: 100%; background: #F7F4EC; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <tr><td style="padding: 4px 16px; color: #6B5A55; font-size: 13px;">Temporary password</td></tr>
        <tr><td style="padding: 0 16px 12px; font-family: monospace; font-size: 16px; font-weight: 600;">${tempPassword}</td></tr>
      </table>
      <a href="${loginUrl}" style="display: inline-block; background: #2A0A0C; color: #EFEBE0; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-weight: 500;">Log in to Reldro</a>
      <p style="color: #8C7F6C; font-size: 12px; margin-top: 24px;">If you weren't expecting this, you can ignore this email.</p>
    </div>
  `;
}

export function specialistApplicationNotificationHtml({
  name,
  email,
  headline,
  yearsExperience,
  industries,
  functions,
}: {
  name: string;
  email: string;
  headline: string;
  yearsExperience: number;
  industries: string[];
  functions: string[];
}) {
  // Public and unauthenticated, same as demoRequestNotificationHtml - escape
  // every applicant-typed field before it reaches an internal inbox.
  const row = (label: string, value?: string) =>
    value ? `<tr><td style="padding: 6px 16px 6px 0; color: #6B5A55; font-size: 13px; white-space: nowrap;">${label}</td><td style="padding: 6px 0; font-size: 13px; color: #2A0A0C;">${escapeHtml(value)}</td></tr>` : "";

  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; color: #2A0A0C;">
      <h2 style="margin-bottom: 4px;">New specialist application</h2>
      <p style="color: #6B5A55;">${escapeHtml(name)}</p>
      <table style="width: 100%; background: #F7F4EC; border-radius: 12px; padding: 16px; margin: 16px 0; border-collapse: collapse;">
        ${row("Name", name)}
        ${row("Email", email)}
        ${row("Headline", headline)}
        ${row("Experience", `${yearsExperience} years`)}
        ${row("Industries", industries.length > 0 ? industries.join(", ") : undefined)}
        ${row("Functions", functions.length > 0 ? functions.join(", ") : undefined)}
      </table>
      <p style="color: #8C7F6C; font-size: 12px; margin-top: 24px;">Review and approve this application from Platform Admin > Specialists.</p>
    </div>
  `;
}

export function specialistApplicationReceivedHtml({
  name,
  loginUrl,
  tempPassword,
}: {
  name: string;
  loginUrl: string;
  tempPassword: string;
}) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #2A0A0C;">
      <h2 style="margin-bottom: 4px;">Thanks for applying to Reldro</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>We've received your specialist application. Our team reviews every application by hand - once approved, you'll start showing up as a match for expert-help requests.</p>
      <p>Your account is already set up, so you can log in now to review or edit your profile while we take a look:</p>
      <table style="width: 100%; background: #F7F4EC; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <tr><td style="padding: 4px 16px; color: #6B5A55; font-size: 13px;">Temporary password</td></tr>
        <tr><td style="padding: 0 16px 12px; font-family: monospace; font-size: 16px; font-weight: 600;">${tempPassword}</td></tr>
      </table>
      <a href="${loginUrl}" style="display: inline-block; background: #2A0A0C; color: #EFEBE0; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-weight: 500;">Log in to Reldro</a>
      <p style="color: #8C7F6C; font-size: 12px; margin-top: 24px;">If you weren't expecting this, you can ignore this email.</p>
    </div>
  `;
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

export function projectMemberAddedEmailHtml({
  name,
  projectTitle,
  projectUrl,
}: {
  name: string;
  projectTitle: string;
  projectUrl: string;
}) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #2A0A0C;">
      <h2 style="margin-bottom: 4px;">You've been added to a project</h2>
      <p>Hi ${name},</p>
      <p>You've been added to <strong>${projectTitle}</strong>, an expert-help engagement in Reldro. You can see the plan, tasks, and message the specialist directly from there.</p>
      <a href="${projectUrl}" style="display: inline-block; background: #2A0A0C; color: #EFEBE0; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-weight: 500;">Open the project</a>
    </div>
  `;
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
