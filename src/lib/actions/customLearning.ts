"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { toEmbedUrl } from "@/lib/videoEmbed";
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
  if (existing) return { error: "A course with that title already exists. Pick a different title." };

  const course = await prisma.course.create({
    data: { title, description, department, organizationId: session.organizationId!, createdByName: session.name },
  });

  revalidatePath("/dashboard/learn");
  revalidatePath("/dashboard/learn/manage");
  return { success: "Course created. Now add a lesson to it below.", courseId: course.id };
}

export async function updateCustomCourse(_prevState: CustomCourseState, formData: FormData): Promise<CustomCourseState> {
  const { session, isCompanyAdmin, department: myDepartment } = await requireLearningAuthor();

  const courseId = String(formData.get("courseId") ?? "");
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.organizationId !== session.organizationId) return { error: "Course not found." };
  if (!isCompanyAdmin && course.department !== myDepartment) return { error: "Course not found." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const department = isCompanyAdmin ? String(formData.get("department") ?? "").trim() : course.department;
  if (!title || !description || !department) return { error: "Title, description, and department are required." };

  const clash = await prisma.course.findUnique({ where: { title } });
  if (clash && clash.id !== courseId) return { error: "A course with that title already exists. Pick a different title." };

  await prisma.course.update({ where: { id: courseId }, data: { title, description, department } });
  await logAudit({ organizationId: session.organizationId, userId: session.sub, action: "content.updated", entityType: "Course", entityId: courseId, metadata: { title } });

  revalidatePath("/dashboard/learn");
  revalidatePath("/dashboard/learn/manage");
  revalidatePath(`/dashboard/learn/manage/${courseId}`);
  return { success: "Course saved.", courseId };
}

export async function deleteCustomCourse(courseId: string) {
  const { session, isCompanyAdmin, department: myDepartment } = await requireLearningAuthor();
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.organizationId !== session.organizationId) throw new Error("Course not found.");
  // Creation already restricts a department admin to their own department -
  // delete has to enforce the same boundary, or any department admin could
  // delete another team's course just by knowing its id.
  if (!isCompanyAdmin && course.department !== myDepartment) throw new Error("Course not found.");

  await prisma.course.delete({ where: { id: courseId } });
  await logAudit({ organizationId: session.organizationId, userId: session.sub, action: "content.deleted", entityType: "Course", entityId: courseId, metadata: { title: course.title } });
  revalidatePath("/dashboard/learn");
  revalidatePath("/dashboard/learn/manage");
}

type ParsedLesson = Omit<Parameters<typeof prisma.lesson.create>[0]["data"], "courseId" | "order" | "course">;

function parseLessonForm(formData: FormData): { error: string } | { data: ParsedLesson } {
  const title = String(formData.get("title") ?? "").trim();
  const concept = String(formData.get("concept") ?? "").trim();
  const example = String(formData.get("example") ?? "").trim();
  const exercise = String(formData.get("exercise") ?? "").trim();
  if (!title || !concept || !example || !exercise) {
    return { error: "Title, concept (Learn), example (See it), and exercise (Apply) are required." };
  }

  const knowledgeCheckQuestion = String(formData.get("knowledgeCheckQuestion") ?? "").trim();
  const knowledgeCheckOptions = [0, 1, 2, 3]
    .map((i) => String(formData.get(`kcOption${i}`) ?? "").trim())
    .filter(Boolean);
  const hasKnowledgeCheck = Boolean(knowledgeCheckQuestion) && knowledgeCheckOptions.length >= 2;

  const imageDataUri = String(formData.get("imageUrl") ?? "").trim();
  // Client compresses to a data: URI before submitting; cap it here too in case that didn't run.
  const imageUrl = imageDataUri.startsWith("data:image/") && imageDataUri.length < 3_000_000 ? imageDataUri : null;

  const videoUrlInput = String(formData.get("videoUrl") ?? "").trim();
  if (videoUrlInput && !/^https?:\/\//i.test(videoUrlInput)) {
    return { error: "Video link must be a full URL (starting with https://)." };
  }

  return {
    data: {
      title,
      type: String(formData.get("type") ?? "CONCEPT") as LessonType,
      objective: String(formData.get("objective") ?? "").trim(),
      whyItMatters: String(formData.get("whyItMatters") ?? "").trim(),
      concept,
      example,
      tryItPrompt: String(formData.get("tryItPrompt") ?? "").trim(),
      evaluatePrompt: String(formData.get("evaluatePrompt") ?? "").trim(),
      exercise,
      takeaway: String(formData.get("takeaway") ?? "").trim(),
      imageUrl,
      videoUrl: videoUrlInput || null,
      durationMin: Math.max(1, Math.round(Number(formData.get("durationMin")) || 8)),
      knowledgeCheckQuestion: hasKnowledgeCheck ? knowledgeCheckQuestion : "",
      knowledgeCheckOptions: hasKnowledgeCheck ? knowledgeCheckOptions : [],
      knowledgeCheckCorrectIndex: hasKnowledgeCheck
        ? Math.max(0, Math.min(knowledgeCheckOptions.length - 1, Number(formData.get("kcCorrectIndex")) || 0))
        : -1,
    },
  };
}

export async function createCustomLesson(_prevState: CustomLessonState, formData: FormData): Promise<CustomLessonState> {
  const { session, isCompanyAdmin, department: myDepartment } = await requireLearningAuthor();

  const courseId = String(formData.get("courseId") ?? "");
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.organizationId !== session.organizationId) return { error: "Course not found." };
  if (!isCompanyAdmin && course.department !== myDepartment) return { error: "Course not found." };

  const parsed = parseLessonForm(formData);
  if ("error" in parsed) return parsed;

  const maxOrder = await prisma.lesson.aggregate({ where: { courseId }, _max: { order: true } });
  await prisma.lesson.create({ data: { ...parsed.data, courseId, order: (maxOrder._max.order ?? 0) + 1 } });

  revalidatePath(`/dashboard/learn/manage/${courseId}`);
  revalidatePath("/dashboard/learn");
  return { success: "Lesson added to the course." };
}

export async function updateCustomLesson(_prevState: CustomLessonState, formData: FormData): Promise<CustomLessonState> {
  const { session, isCompanyAdmin, department: myDepartment } = await requireLearningAuthor();

  const lessonId = String(formData.get("lessonId") ?? "");
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: true } });
  if (!lesson || lesson.course.organizationId !== session.organizationId) return { error: "Lesson not found." };
  if (!isCompanyAdmin && lesson.course.department !== myDepartment) return { error: "Lesson not found." };

  const parsed = parseLessonForm(formData);
  if ("error" in parsed) return parsed;

  await prisma.lesson.update({ where: { id: lessonId }, data: parsed.data });
  await logAudit({ organizationId: session.organizationId, userId: session.sub, action: "content.updated", entityType: "Lesson", entityId: lessonId, metadata: { title: parsed.data.title as string, courseId: lesson.courseId } });

  revalidatePath(`/dashboard/learn/manage/${lesson.courseId}`);
  revalidatePath(`/dashboard/learn/lessons/${lessonId}`);
  revalidatePath("/dashboard/learn");
  return { success: "Lesson saved." };
}

export async function deleteCustomLesson(lessonId: string, courseId: string) {
  const { session, isCompanyAdmin, department: myDepartment } = await requireLearningAuthor();
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.organizationId !== session.organizationId) throw new Error("Course not found.");
  if (!isCompanyAdmin && course.department !== myDepartment) throw new Error("Course not found.");

  // Scope by courseId too - the course above is the one that was authorized, not necessarily the lesson's own.
  const { count } = await prisma.lesson.deleteMany({ where: { id: lessonId, courseId } });
  if (count === 0) throw new Error("Lesson not found.");
  revalidatePath(`/dashboard/learn/manage/${courseId}`);
  revalidatePath("/dashboard/learn");
}
