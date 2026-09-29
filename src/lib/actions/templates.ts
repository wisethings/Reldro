"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";

/** Logs a real usage event when someone copies a prompt template (workflow-step-backed or standalone). */
export async function logTemplateCopy(templateId: string) {
  const session = await requireSession();
  if (!session.employeeId || !session.organizationId) return;

  const step = await prisma.workflowStep.findUnique({ where: { id: templateId }, include: { workflow: true } });
  if (step) {
    await prisma.aIUsageEvent.create({
      data: { organizationId: session.organizationId, employeeId: session.employeeId, tool: step.workflow.title, eventType: "template_copied", sourceId: step.id },
    });
    return;
  }

  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) return;
  await prisma.aIUsageEvent.create({
    data: { organizationId: session.organizationId, employeeId: session.employeeId, tool: template.title, eventType: "template_copied", sourceId: template.id },
  });
}

export type TemplateState = { error?: string; success?: string } | undefined;

/** Mirrors requireWorkflowAuthor/requireLearningAuthor: a company admin can author for any department, a department lead only for their own. */
async function requireTemplateAuthor() {
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
  throw new Error("Only company admins and team leads can create templates.");
}

export async function createTemplate(_prevState: TemplateState, formData: FormData): Promise<TemplateState> {
  const { session, isCompanyAdmin, department: myDepartment } = await requireTemplateAuthor();

  const title = String(formData.get("title") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const department = isCompanyAdmin ? String(formData.get("department") ?? "").trim() : myDepartment ?? "";
  // Multi-select chips from the Tool Library (ToolMultiSelect), one hidden input per tool.
  const tools = formData.getAll("tools").map(String).filter(Boolean);
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const videoUrl = String(formData.get("videoUrl") ?? "").trim() || null;

  if (!title || !prompt || !department) {
    return { error: "Title, prompt, and department are required." };
  }

  await prisma.template.create({
    data: { organizationId: session.organizationId!, department, title, prompt, tools, createdByName: session.name, imageUrl, videoUrl },
  });

  revalidatePath("/dashboard/templates");
  return { success: "Template added." };
}

export async function deleteTemplate(templateId: string) {
  const { session, isCompanyAdmin, department: myDepartment } = await requireTemplateAuthor();
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template || template.organizationId !== session.organizationId) throw new Error("Template not found.");
  if (!isCompanyAdmin && template.department !== myDepartment) throw new Error("Template not found.");

  await prisma.template.delete({ where: { id: templateId } });
  revalidatePath("/dashboard/templates");
}
