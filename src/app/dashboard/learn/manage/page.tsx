import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { CreateCourseForm } from "@/components/learning/CreateCourseForm";

export default async function ManageLearnPage() {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");

  const employee = session.employeeId
    ? await prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } })
    : null;
  const isCompanyAdmin = session.role === "COMPANY_ADMIN";
  const canAuthorLessons = isCompanyAdmin || Boolean(employee?.isDepartmentAdmin);
  if (!canAuthorLessons) redirect("/dashboard/learn");

  const [courses, departments] = await Promise.all([
    prisma.course.findMany({
      // A department admin only manages their own team's courses - without
      // this, the list (and the "Manage" link into each one) exposed every
      // department's team-authored content, not just their own.
      where: { organizationId: session.organizationId, ...(isCompanyAdmin ? {} : { department: employee?.department?.name ?? "__none__" }) },
      include: { lessons: true },
      orderBy: { department: "asc" },
    }),
    prisma.department.findMany({ where: { organizationId: session.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/dashboard/learn" className="text-xs font-medium text-ink-500 hover:text-ink-800">
          ← Learn
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-ink-900">Team lessons</h1>
        <p className="text-sm text-ink-500">
          {isCompanyAdmin
            ? "Create lessons for any department, using your own team's real workflows, tools, and edge cases."
            : `Create lessons for ${employee?.department?.name ?? "your team"}. Only your department's employees will see these.`}
        </p>
      </div>

      <Card>
        <CardHeader title="New course" subtitle="A course is a small group of lessons on one topic." />
        <CardBody>
          <CreateCourseForm
            lockDepartment={isCompanyAdmin ? null : employee?.department?.name ?? null}
            departmentOptions={departments.map((d) => d.name)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Your courses" />
        <CardBody className="divide-y divide-ink-200 p-0">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/learn/manage/${c.id}`}
              className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-ink-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{c.title}</p>
                <p className="text-xs text-ink-500">{c.department} · {c.lessons.length} lesson{c.lessons.length === 1 ? "" : "s"}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-orchid-deep">Manage →</span>
            </Link>
          ))}
          {courses.length === 0 && <p className="p-6 text-sm text-ink-500">No team-authored courses yet. Create one above.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
