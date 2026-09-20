"use server";

import { requireOrganization } from "@/lib/auth/guards";
import { answerAssistantQuestion, type AssistantAnswer } from "@/lib/ai/assistant";

export async function askAssistant(question: string): Promise<AssistantAnswer> {
  const session = await requireOrganization();
  return answerAssistantQuestion(session.organizationId, question);
}
