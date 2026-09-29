import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { ListOrdered, PlusCircle, Pencil } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { IconBadge } from "@/components/ui/IconBadge";
import { CreateCourseForm } from "@/components/learning/CreateCourseForm";
import { CreateLessonForm } from "@/components/learning/CreateLessonForm";
import { LessonManageRow } from "@/components/learning/LessonManageRow";
import { DeleteCourseButton } from "@/components/learning/DeleteCourseButton";

export default async function ManageCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const { courseId } = await params;

  const [employee, course, departments] = await Promise.all([
    session.employeeId
      ? prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } })
      : Promise.resolve(null),
    prisma.course.findUnique({
      where: { id: courseId },
      include: { lessons: { orderBy: { order: "asc" } } },
    }),
    prisma.department.findMany({ where: { organizationId: session.organizationId }, orderBy: { name: "asc" } }),
  ]);
  const isCompanyAdmin = session.role === "COMPANY_ADMIN";
  const canAuthorLessons = isCompanyAdmin || Boolean(employee?.isDepartmentAdmin);
  if (!canAuthorLessons) redirect("/dashboard/learn");
  if (!course || course.organizationId !== session.organizationId) notFound();
  // A department admin manages only their own team's courses - without this,
  // they could open (and, before the action-level fix, edit/delete) another
  // department's course just by knowing its id.
  if (!isCompanyAdmin && course.department !== employee?.department?.name) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/dashboard/learn/manage" className="text-xs font-medium text-ink-500 hover:text-ink-800">
          ← Team lessons
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{course.title}</h1>
            <p className="mt-1 text-sm text-ink-500">{course.department} · {course.description}</p>
          </div>
          <DeleteCourseButton courseId={course.id} />
        </div>
      </div>

      <Card>
        <CardHeader icon={<IconBadge icon={<Pencil size={18} />} tone="olive" />} title="Course details" subtitle="Edit the title, description, and department." />
        <CardBody>
          <CreateCourseForm
            course={course}
            lockDepartment={isCompanyAdmin ? null : employee?.department?.name ?? null}
            departmentOptions={departments.map((d) => d.name)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<ListOrdered size={18} />} tone="orchid" />} title="Lessons" subtitle="Shown to your team in this order." />
        <CardBody className="divide-y divide-ink-200 p-0">
          {course.lessons.map((lesson) => (
            <LessonManageRow key={lesson.id} lesson={lesson} courseId={course.id} />
          ))}
          {course.lessons.length === 0 && <p className="p-5 text-sm text-ink-500">No lessons yet. Add one below.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<PlusCircle size={18} />} tone="sage" />} title="Add a lesson" />
        <CardBody>
          <CreateLessonForm courseId={course.id} />
        </CardBody>
      </Card>
    </div>
  );
}
