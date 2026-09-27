"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { sendEmail, specialistApplicationNotificationHtml, specialistApplicationReceivedHtml } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { INDUSTRIES, DEPARTMENT_OPTIONS } from "@/lib/data/catalog";

export type SpecialistApplicationState = { success?: boolean; error?: string; tempPassword?: string } | undefined;

const ENGAGEMENT_TYPES = ["advisory", "implementation", "augmentation"] as const;

const MAX_HEADLINE_LENGTH = 150;
const MAX_BIO_LENGTH = 4000;
const MAX_NOTABLE_PROJECTS_LENGTH = 4000;
const MAX_LIST_ENTRIES = 20;
const MAX_LIST_ENTRY_LENGTH = 60;

function generateTempPassword() {
  return `Reldro-${Math.random().toString(36).slice(2, 8)}!`;
}

function parseUrl(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function parseBoundedList(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim().slice(0, MAX_LIST_ENTRY_LENGTH))
        .filter(Boolean),
    ),
  ).slice(0, MAX_LIST_ENTRIES);
}

/**
 * Public, unauthenticated intake form for prospective specialists. Creates
 * the User + Specialist right away (a platform admin only flips `approved`
 * from Platform Admin > Specialists) so an applicant can log in and
 * review/edit their own profile while it's pending - they just won't
 * surface as a match until approved.
 */
export async function applyAsSpecialist(_prevState: SpecialistApplicationState, formData: FormData): Promise<SpecialistApplicationState> {
  const ip = await getClientIp();
  const allowed = await checkRateLimit(`specialist_apply:${ip}`, 5, 60);
  if (!allowed) {
    return { error: "Too many applications submitted from this device recently. Please try again later or contact us directly." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const headline = String(formData.get("headline") ?? "").trim().slice(0, MAX_HEADLINE_LENGTH);
  const bio = String(formData.get("bio") ?? "").trim().slice(0, MAX_BIO_LENGTH);
  const yearsExperience = Number(formData.get("yearsExperience") ?? "");
  const location = String(formData.get("location") ?? "").trim().slice(0, MAX_LIST_ENTRY_LENGTH) || undefined;
  const availability = String(formData.get("availability") ?? "").trim().slice(0, MAX_LIST_ENTRY_LENGTH) || "Pending review";
  const hourlyRateRaw = String(formData.get("hourlyRate") ?? "").trim();
  const hourlyRate = hourlyRateRaw ? Number(hourlyRateRaw) : undefined;
  const projectRateMinRaw = String(formData.get("projectRateMin") ?? "").trim();
  const projectRateMin = projectRateMinRaw ? Number(projectRateMinRaw) : undefined;
  const projectRateMaxRaw = String(formData.get("projectRateMax") ?? "").trim();
  const projectRateMax = projectRateMaxRaw ? Number(projectRateMaxRaw) : undefined;
  const linkedinUrl = parseUrl(String(formData.get("linkedinUrl") ?? ""));
  const portfolioUrl = parseUrl(String(formData.get("portfolioUrl") ?? ""));
  const notableProjects = String(formData.get("notableProjects") ?? "").trim().slice(0, MAX_NOTABLE_PROJECTS_LENGTH) || undefined;
  const industries = formData
    .getAll("industries")
    .map(String)
    .filter((v): v is string => (INDUSTRIES as readonly string[]).includes(v));
  const functions = formData
    .getAll("functions")
    .map(String)
    .filter((v): v is string => (DEPARTMENT_OPTIONS as readonly string[]).includes(v));
  const preferredEngagementTypes = formData
    .getAll("engagementTypes")
    .map(String)
    .filter((v): v is (typeof ENGAGEMENT_TYPES)[number] => (ENGAGEMENT_TYPES as readonly string[]).includes(v));
  const tools = parseBoundedList(String(formData.get("tools") ?? ""));
  const certifications = parseBoundedList(String(formData.get("certifications") ?? ""));

  if (!name || !email || !headline || !bio) return { error: "Name, email, headline, and bio are required." };
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (!Number.isFinite(yearsExperience) || yearsExperience < 0) return { error: "Enter your years of experience." };
  if (industries.length === 0) return { error: "Select at least one industry you specialize in." };
  if (functions.length === 0) return { error: "Select at least one function you specialize in." };
  if (hourlyRate !== undefined && (!Number.isFinite(hourlyRate) || hourlyRate < 0)) return { error: "Enter a valid hourly rate." };
  if (projectRateMin !== undefined && (!Number.isFinite(projectRateMin) || projectRateMin < 0)) return { error: "Enter a valid minimum project rate." };
  if (projectRateMax !== undefined && (!Number.isFinite(projectRateMax) || projectRateMax < 0)) return { error: "Enter a valid maximum project rate." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists. Log in instead, or contact us to update it." };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "SPECIALIST",
      specialist: {
        create: {
          headline,
          bio,
          yearsExperience,
          location,
          hourlyRate,
          projectRateMin,
          projectRateMax,
          linkedinUrl,
          portfolioUrl,
          notableProjects,
          preferredEngagementTypes,
          availability,
          approved: false,
          tags: {
            create: [
              ...industries.map((value) => ({ type: "INDUSTRY" as const, value })),
              ...functions.map((value) => ({ type: "FUNCTION" as const, value })),
              ...tools.map((value) => ({ type: "TOOL" as const, value })),
              ...certifications.map((value) => ({ type: "CERTIFICATION" as const, value })),
            ],
          },
        },
      },
    },
  });

  const notifyEmail = process.env.SALES_NOTIFICATION_EMAIL || "platform@reldro.com";
  await sendEmail({
    to: notifyEmail,
    subject: `New specialist application: ${name}`,
    html: specialistApplicationNotificationHtml({ name, email, headline, yearsExperience, industries, functions, linkedinUrl, portfolioUrl }),
  });

  const host = (await headers()).get("host");
  const { sent } = await sendEmail({
    to: email,
    subject: "Thanks for applying to Reldro",
    html: specialistApplicationReceivedHtml({ name, loginUrl: `https://${host}/login`, tempPassword }),
  });

  return sent ? { success: true } : { success: true, tempPassword };
}
