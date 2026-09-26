"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import type { ComplexityLevel } from "@prisma/client";

export type CustomWorkflowState = { error?: string; success?: string; workflowId?: string } | undefined;
export type CustomWorkflowStepState = { error?: string; success?: string } | undefined;

/**
 * Team-authored workflows: a company admin can create a workflow for any
 * department, and a department admin (manager) can create one for their own
 * team - never someone else's. Mirrors how team-authored lessons work.
 */
async function requireWorkflowAuthor() {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");

  if (session.role === "COMPANY_ADMIN") {
    return { session, isCompanyAdmin: true as const, department: null as string | null };
  }
  if (session.employeeId) {
    const employee = await prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } });
    if (employee?.isDepartmentAdmin) {
      return { session, isCompanyAdmin: false as const, department: employee.department?.name ?? null };
    }
  }
  throw new Error("Only company admins and team managers can create workflows.");
}

function splitList(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createCustomWorkflow(_prevState: CustomWorkflowState, formData: FormData): Promise<CustomWorkflowState> {
  const { session, isCompanyAdmin, department: myDepartment } = await requireWorkflowAuthor();

  const title = String(formData.get("title") ?? "").trim();
  const department = isCompanyAdmin ? String(formData.get("department") ?? "").trim() : myDepartment ?? "";
  const summary = String(formData.get("summary") ?? "").trim();
  const currentProcess = String(formData.get("currentProcess") ?? "").trim();
  const aiProcess = String(formData.get("aiProcess") ?? "").trim();

  if (!title || !department || !summary || !currentProcess || !aiProcess) {
    return { error: "Title, department, summary, current process, and AI-enabled process are required." };
  }

  const difficulty = String(formData.get("difficulty") ?? "MEDIUM") as ComplexityLevel;
  const skillLevel = String(formData.get("skillLevel") ?? "Intermediate").trim() || "Intermediate";
  const timeSavedMinutes = Math.max(0, Math.round(Number(formData.get("timeSavedMinutes")) || 0));
  const toolsRequired = splitList(formData.get("toolsRequired"));
  const skillsRequired = splitList(formData.get("skillsRequired"));
  const securityNotes = String(formData.get("securityNotes") ?? "").trim() || null;
  const trainingNotes = String(formData.get("trainingNotes") ?? "").trim() || null;

  const workflow = await prisma.workflow.create({
    data: {
      title,
      department,
      summary,
      currentProcess,
      aiProcess,
      difficulty,
      skillLevel,
      timeSavedMinutes,
      toolsRequired,
      skillsRequired,
      securityNotes,
      trainingNotes,
      organizationId: session.organizationId!,
      createdByName: session.name,
    },
  });

  revalidatePath("/dashboard/workflows");
  revalidatePath("/dashboard/workflows/manage");
  return { success: "Workflow created. Now add its steps below.", workflowId: workflow.id };
}

export async function deleteCustomWorkflow(workflowId: string) {
  const { session, isCompanyAdmin, department: myDepartment } = await requireWorkflowAuthor();
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow || workflow.organizationId !== session.organizationId) throw new Error("Workflow not found.");
  // Creation already restricts a department admin to their own department -
  // delete has to enforce the same boundary, or any department admin could
  // delete another team's workflow just by knowing its id.
  if (!isCompanyAdmin && workflow.department !== myDepartment) throw new Error("Workflow not found.");

  await prisma.workflow.delete({ where: { id: workflowId } });
  revalidatePath("/dashboard/workflows");
  revalidatePath("/dashboard/workflows/manage");
}

export async function createWorkflowStep(_prevState: CustomWorkflowStepState, formData: FormData): Promise<CustomWorkflowStepState> {
  const { session, isCompanyAdmin, department: myDepartment } = await requireWorkflowAuthor();

  const workflowId = String(formData.get("workflowId") ?? "");
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow || workflow.organizationId !== session.organizationId) return { error: "Workflow not found." };
  if (!isCompanyAdmin && workflow.department !== myDepartment) return { error: "Workflow not found." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title || !description) {
    return { error: "Title and description are required." };
  }
  const aiPrompt = String(formData.get("aiPrompt") ?? "").trim() || null;
  const humanCheckpoint = formData.get("humanCheckpoint") === "on";

  const imageDataUri = String(formData.get("imageUrl") ?? "").trim();
  // Client compresses to a data: URI before submitting; cap it here too in case that didn't run.
  const imageUrl = imageDataUri.startsWith("data:image/") && imageDataUri.length < 3_000_000 ? imageDataUri : null;

  const videoUrlInput = String(formData.get("videoUrl") ?? "").trim();
  if (videoUrlInput && !/^https?:\/\//i.test(videoUrlInput)) {
    return { error: "Video link must be a full URL (starting with https://)." };
  }
  const videoUrl = videoUrlInput || null;

  const maxOrder = await prisma.workflowStep.aggregate({ where: { workflowId }, _max: { order: true } });

  await prisma.workflowStep.create({
    data: {
      workflowId,
      title,
      description,
      aiPrompt,
      humanCheckpoint,
      imageUrl,
      videoUrl,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  revalidatePath(`/dashboard/workflows/manage/${workflowId}`);
  revalidatePath(`/dashboard/workflows/${workflowId}`);
  return { success: "Step added to the workflow." };
}

export async function deleteWorkflowStep(stepId: string, workflowId: string) {
  const { session, isCompanyAdmin, department: myDepartment } = await requireWorkflowAuthor();
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow || workflow.organizationId !== session.organizationId) throw new Error("Workflow not found.");
  if (!isCompanyAdmin && workflow.department !== myDepartment) throw new Error("Workflow not found.");

  await prisma.workflowStep.delete({ where: { id: stepId } });
  revalidatePath(`/dashboard/workflows/manage/${workflowId}`);
  revalidatePath(`/dashboard/workflows/${workflowId}`);
}
