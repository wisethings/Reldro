"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";

export async function approveSpecialist(specialistId: string) {
  await requireRole(["PLATFORM_ADMIN"]);
  await prisma.specialist.update({ where: { id: specialistId }, data: { approved: true } });
  revalidatePath("/platform-admin/specialists");
}

export async function rejectSpecialist(specialistId: string) {
  await requireRole(["PLATFORM_ADMIN"]);
  await prisma.specialist.update({ where: { id: specialistId }, data: { approved: false } });
  revalidatePath("/platform-admin/specialists");
}

export async function toggleFeaturedSpecialist(specialistId: string, featured: boolean) {
  await requireRole(["PLATFORM_ADMIN"]);
  await prisma.specialist.update({ where: { id: specialistId }, data: { featured } });
  revalidatePath("/platform-admin/specialists");
}
