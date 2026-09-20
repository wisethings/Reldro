"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";

export async function updateSpecialistProfile(_prevState: unknown, formData: FormData) {
  const session = await requireSession();
  if (!session.specialistId) throw new Error("Not a specialist account");

  await prisma.specialist.update({
    where: { id: session.specialistId },
    data: {
      headline: String(formData.get("headline") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      hourlyRate: formData.get("hourlyRate") ? Number(formData.get("hourlyRate")) : null,
      availability: String(formData.get("availability") ?? "Available now"),
      location: String(formData.get("location") ?? ""),
    },
  });

  revalidatePath("/dashboard/specialist/profile");
  return { success: true };
}
