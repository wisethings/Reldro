"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { sendEmail, specialistApplicationNotificationHtml, specialistApplicationReceivedHtml } from "@/lib/email";

export type SpecialistApplicationState = { success?: boolean; error?: string; tempPassword?: string } | undefined;

function generateTempPassword() {
  return `Reldro-${Math.random().toString(36).slice(2, 8)}!`;
}

/**
 * Public, unauthenticated intake form for prospective specialists. Unlike
 * the demo-request flow, this creates the User + Specialist right away (a
 * platform admin only flips `approved` from Platform Admin > Specialists) so
 * an applicant can log in and review/edit their own profile while it's
 * pending review - they just won't surface as a match until approved.
 */
export async function applyAsSpecialist(_prevState: SpecialistApplicationState, formData: FormData): Promise<SpecialistApplicationState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const headline = String(formData.get("headline") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const yearsExperience = Number(formData.get("yearsExperience") ?? "");
  const location = String(formData.get("location") ?? "").trim() || undefined;
  const hourlyRateRaw = String(formData.get("hourlyRate") ?? "").trim();
  const hourlyRate = hourlyRateRaw ? Number(hourlyRateRaw) : undefined;
  const industries = formData.getAll("industries").map(String).filter(Boolean);
  const functions = formData.getAll("functions").map(String).filter(Boolean);
  const tools = String(formData.get("tools") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!name || !email || !headline || !bio) return { error: "Name, email, headline, and bio are required." };
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (!Number.isFinite(yearsExperience) || yearsExperience < 0) return { error: "Enter your years of experience." };
  if (industries.length === 0) return { error: "Select at least one industry you specialize in." };
  if (functions.length === 0) return { error: "Select at least one function you specialize in." };
  if (hourlyRate !== undefined && (!Number.isFinite(hourlyRate) || hourlyRate < 0)) return { error: "Enter a valid hourly rate." };

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
          availability: "Pending review",
          approved: false,
          tags: {
            create: [
              ...industries.map((value) => ({ type: "INDUSTRY" as const, value })),
              ...functions.map((value) => ({ type: "FUNCTION" as const, value })),
              ...tools.map((value) => ({ type: "TOOL" as const, value })),
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
    html: specialistApplicationNotificationHtml({ name, email, headline, yearsExperience, industries, functions }),
  });

  const host = (await headers()).get("host");
  const { sent } = await sendEmail({
    to: email,
    subject: "Thanks for applying to Reldro",
    html: specialistApplicationReceivedHtml({ name, loginUrl: `https://${host}/login`, tempPassword }),
  });

  return sent ? { success: true } : { success: true, tempPassword };
}
