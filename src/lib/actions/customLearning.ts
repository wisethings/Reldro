"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import type { LessonType } from "@prisma/client";

export type CustomCourseState = { error?: string; success?: string; courseId?: string } | undefined;
export type CustomLessonState = { error?: string; success?: string } | undefined;

/**
 * Team-authored lessons: a company admin can create a course for any
 * department, and a department admin (manager) can create one for their own
 * team - never someone else's. Mirrors the "teams create their own lessons
 * for their teams" ask directly, rather than opening lesson authoring to
 * every employee.
 */
async function requireLearningAuthor() {
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
  throw new Error("Only company admins and team managers can create lessons.");
}

export async function createCustomCourse(_prevState: CustomCourseState, formData: FormData): Promise<CustomCourseState> {
  const { session, isCompanyAdmin, department: myDepartment } = await requireLearningAuthor();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const department = isCompanyAdmin ? String(formData.get("department") ?? "").trim() : myDepartment ?? "";

  if (!title || !description || !department) {
    return { error: "Title, description, and department are required." };
  }

  const existing = await prisma.course.findUnique({ where: { title } });
  if (existing) return { error: "A course with that title already exists — pick a different title." };

  const course = await prisma.course.create({
    data: { title, description, department, organizationId: session.organizationId!, createdByName: session.name },
  });

  revalidatePath("/dashboard/learn");
  revalidatePath("/dashboard/learn/manage");
  return { success: "Course created — now add a lesson to it below.", courseId: course.id };
}

export async function deleteCustomCourse(courseId: string) {
  const { session } = await requireLearningAuthor();
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.organizationId !== session.organizationId) throw new Error("Course not found.");

  await prisma.course.delete({ where: { id: courseId } });
  revalidatePath("/dashboard/learn");
  revalidatePath("/dashboard/learn/manage");
}

export async function createCustomLesson(_prevState: CustomLessonState, formData: FormData): Promise<CustomLessonState> {
  const { session } = await requireLearningAuthor();

  const courseId = String(formData.get("courseId") ?? "");
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.organizationId !== session.organizationId) return { error: "Course not found." };

  const title = String(formData.get("title") ?? "").trim();
  const concept = String(formData.get("concept") ?? "").trim();
  const example = String(formData.get("example") ?? "").trim();
  const exercise = String(formData.get("exercise") ?? "").trim();
  if (!title || !concept || !example || !exercise) {
    return { error: "Title, concept (Learn), example (See it), and exercise (Apply) are required." };
  }

  const type = String(formData.get("type") ?? "CONCEPT") as LessonType;
  const objective = String(formData.get("objective") ?? "").trim();
  const whyItMatters = String(formData.get("whyItMatters") ?? "").trim();
  const tryItPrompt = String(formData.get("tryItPrompt") ?? "").trim();
  const evaluatePrompt = String(formData.get("evaluatePrompt") ?? "").trim();
  const takeaway = String(formData.get("takeaway") ?? "").trim();
  const durationMin = Math.max(1, Math.round(Number(formData.get("durationMin")) || 8));

  const knowledgeCheckQuestion = String(formData.get("knowledgeCheckQuestion") ?? "").trim();
  const knowledgeCheckOptions = [0, 1, 2, 3]
    .map((i) => String(formData.get(`kcOption${i}`) ?? "").trim())
    .filter(Boolean);
  const hasKnowledgeCheck = Boolean(knowledgeCheckQuestion) && knowledgeCheckOptions.length >= 2;
  const knowledgeCheckCorrectIndex = hasKnowledgeCheck
    ? Math.max(0, Math.min(knowledgeCheckOptions.length - 1, Number(formData.get("kcCorrectIndex")) || 0))
    : -1;

  const maxOrder = await prisma.lesson.aggregate({ where: { courseId }, _max: { order: true } });

  await prisma.lesson.create({
    data: {
      courseId,
      title,
      type,
      objective,
      whyItMatters,
      concept,
      example,
      tryItPrompt,
      evaluatePrompt,
      exercise,
      takeaway,
      durationMin,
      knowledgeCheckQuestion: hasKnowledgeCheck ? knowledgeCheckQuestion : "",
      knowledgeCheckOptions: hasKnowledgeCheck ? knowledgeCheckOptions : [],
      knowledgeCheckCorrectIndex,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  revalidatePath(`/dashboard/learn/manage/${courseId}`);
  revalidatePath("/dashboard/learn");
  return { success: "Lesson added to the course." };
}

export async function deleteCustomLesson(lessonId: string, courseId: string) {
  const { session } = await requireLearningAuthor();
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.organizationId !== session.organizationId) throw new Error("Course not found.");

  await prisma.lesson.delete({ where: { id: lessonId } });
  revalidatePath(`/dashboard/learn/manage/${courseId}`);
  revalidatePath("/dashboard/learn");
}
