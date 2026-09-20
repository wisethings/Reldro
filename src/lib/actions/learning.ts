"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import { evaluateSimulationResponse } from "@/lib/ai/simulationEvaluator";

export async function completeLesson(lessonId: string) {
  const session = await requireSession();
  if (!session.employeeId) throw new Error("No employee profile for this account");

  await prisma.lessonCompletion.upsert({
    where: { employeeId_lessonId: { employeeId: session.employeeId, lessonId } },
    update: {},
    create: { employeeId: session.employeeId, lessonId, score: 100 },
  });

  revalidatePath("/dashboard/learn");
}

export async function submitSimulationAttempt(simulationId: string, response: string) {
  const session = await requireSession();
  if (!session.employeeId) throw new Error("No employee profile for this account");

  const evaluation = evaluateSimulationResponse(response);

  await prisma.simulationAttempt.create({
    data: {
      employeeId: session.employeeId,
      simulationId,
      score: evaluation.score,
      feedback: evaluation.feedback,
    },
  });

  revalidatePath(`/dashboard/learn/simulations/${simulationId}`);
  return evaluation;
}
