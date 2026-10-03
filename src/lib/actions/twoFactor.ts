"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import { createSession } from "@/lib/auth/session";
import { openSecret, verifyTotp } from "@/lib/auth/totp";
import { checkRateLimit } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";

export type TwoFactorState = { error?: string } | undefined;

/** Second sign-in step for Reldro staff: check the authenticator code, then upgrade the session. */
export async function verifyTwoFactor(_prev: TwoFactorState, formData: FormData): Promise<TwoFactorState> {
  const session = await requireSession();
  if (session.role !== "PLATFORM_ADMIN") redirect("/dashboard/overview");
  if (!(await checkRateLimit(`totp:${session.sub}`, 8, 15))) return { error: "Too many attempts. Wait 15 minutes and try again." };

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { totpSecret: true, totpEnabledAt: true, totpLastStep: true } });
  const secret = user?.totpSecret ? openSecret(user.totpSecret) : null;
  if (!user || !secret) return { error: "Two-factor sign-in isn't set up yet. Reload the page to start." };

  const step = verifyTotp(secret, String(formData.get("code") ?? ""), user.totpLastStep);
  if (step === null) return { error: "That code didn't work. Codes change every 30 seconds, so enter the current one." };

  const firstTime = !user.totpEnabledAt;
  await prisma.user.update({ where: { id: session.sub }, data: { totpLastStep: step, ...(firstTime ? { totpEnabledAt: new Date() } : {}) } });
  await logAudit({ userId: session.sub, action: firstTime ? "platform.two_factor_enabled" : "platform.signed_in", entityType: "User", entityId: session.sub });
  await createSession({ ...session, mfa: true });
  redirect("/platform-admin");
}
