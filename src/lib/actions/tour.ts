"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";

export async function dismissOnboardingTour() {
  const session = await requireSession();
  await prisma.user.update({ where: { id: session.sub }, data: { hasSeenTour: true } });
}
