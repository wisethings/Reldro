import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText, Users, ListChecks, Flag, FolderOpen, MessageCircle, DollarSign, Calendar, Link2, File } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconBadge } from "@/components/ui/IconBadge";
import { ProjectStageStepper } from "@/components/projects/ProjectStageStepper";
import { TaskList } from "@/components/projects/TaskList";
import { MilestoneList } from "@/components/projects/MilestoneList";
import { MessageThread } from "@/components/projects/MessageThread";
import { ProjectTeamCard } from "@/components/projects/ProjectTeamCard";
import { AddTaskForm } from "@/components/projects/AddTaskForm";
import { AddMilestoneForm } from "@/components/projects/AddMilestoneForm";
import { AddDeliverableForm } from "@/components/projects/AddDeliverableForm";
import { ProjectBudgetEditor } from "@/components/projects/ProjectBudgetEditor";
import { ProjectTargetDateEditor } from "@/components/projects/ProjectTargetDateEditor";
import { ProjectDescriptionEditor } from "@/components/projects/ProjectDescriptionEditor";
import { NotifyTeamButton } from "@/components/projects/NotifyTeamButton";

const TASK_FILTERS = [
  { value: "all", label: "All", statuses: null },
  { value: "todo", label: "To do", statuses: ["TODO"] },
  { value: "in_progress", label: "In progress", statuses: ["IN_PROGRESS"] },
  { value: "completed", label: "Completed", statuses: ["DONE"] },
] as const;

const DOCUMENT_EXTENSIONS = [".doc", ".docx", ".pdf", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"];

function inferDeliverableType(url: string): "Document" | "Link" {
  const lower = url.toLowerCase().split("?")[0];
  return DOCUMENT_EXTENSIONS.some((ext) => lower.endsWith(ext)) ? "Document" : "Link";
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tasks?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const { tasks: taskFilterParam } = await searchParams;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      organization: true,
      specialist: { include: { user: true } },
      tasks: { orderBy: { order: "asc" } },
      milestones: { orderBy: { dueDate: "asc" } },
      deliverables: true,
      messages: { include: { senderUser: true }, orderBy: { createdAt: "asc" } },
      workflow: true,
      opportunity: true,
      members: { include: { employee: { include: { user: true } } } },
    },
  });
  if (!project) notFound();

  const isOrgMember = session.organizationId === project.organizationId;
  const isAssignedSpecialist = session.specialistId && session.specialistId === project.specialistId;
  const isPlatformAdmin = session.role === "PLATFORM_ADMIN";
  if (!isOrgMember && !isAssignedSpecialist && !isPlatformAdmin) redirect("/dashboard/overview");

  const canEdit = Boolean(isOrgMember || isAssignedSpecialist || isPlatformAdmin);
  const canManageTeam = isPlatformAdmin || (session.role === "COMPANY_ADMIN" && isOrgMember);

  const candidates = canManageTeam
    ? await prisma.employee.findMany({
        where: {
          organizationId: project.organizationId,
          id: { notIn: project.members.map((m) => m.employeeId) },
        },
        include: { user: true },
        orderBy: { user: { name: "asc" } },
      })
    : [];

  const activeTaskFilter = TASK_FILTERS.find((f) => f.value === taskFilterParam) ?? TASK_FILTERS[0];
  const filteredTasks = activeTaskFilter.statuses
    ? project.tasks.filter((t) => (activeTaskFilter.statuses as readonly string[]).includes(t.status))
    : project.tasks;
  const taskCounts = {
    all: project.tasks.length,
    todo: project.tasks.filter((t) => t.status === "TODO").length,
    in_progress: project.tasks.filter((t) => t.status === "IN_PROGRESS").length,
    completed: project.tasks.filter((t) => t.status === "DONE").length,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Link href="/dashboard/expert-help" className="text-xs font-medium text-ink-500 hover:text-ink-800">
          ← Back to expert help
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{project.title}</h1>
            <p className="text-sm text-ink-500">
              {project.organization.name} {project.specialist && <>· {project.specialist.user.name}</>} · Created{" "}
              {project.createdAt.toLocaleDateString()}
            </p>
          </div>
          <Badge tone={project.status === "ACTIVE" ? "green" : "neutral"}>{project.status.toLowerCase()}</Badge>
        </div>
      </div>

      <Card>
        <CardBody>
          <ProjectStageStepper projectId={project.id} currentStage={project.stage} canAdvance={canEdit} />
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-4">
          <IconBadge icon={<DollarSign size={16} />} tone="coral" className="h-8 w-8" />
          <div className="min-w-0">
            <p className="text-xs text-ink-500">Budget</p>
            <p className="text-sm font-semibold text-ink-900">{project.budget ? `$${project.budget.toLocaleString()}` : "Not set"}</p>
            {canEdit && <ProjectBudgetEditor projectId={project.id} budget={project.budget} />}
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-4">
          <IconBadge icon={<Calendar size={16} />} tone="sage" className="h-8 w-8" />
          <div className="min-w-0">
            <p className="text-xs text-ink-500">Target completion</p>
            <p className="text-sm font-semibold text-ink-900">{project.targetEndDate?.toLocaleDateString() ?? "Not set"}</p>
            {canEdit && <ProjectTargetDateEditor projectId={project.id} targetEndDate={project.targetEndDate} />}
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-4">
          <IconBadge icon={<Link2 size={16} />} tone="orchid" className="h-8 w-8" />
          <div className="min-w-0">
            <p className="text-xs text-ink-500">Linked workflow</p>
            {project.workflow && isOrgMember ? (
              <Link href={`/dashboard/workflows/${project.workflow.id}`} className="block text-sm font-semibold text-orchid-deep hover:text-oxblood hover:underline">
                {project.workflow.title}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-ink-900">{project.workflow?.title ?? "None"}</p>
            )}
            {project.workflow && isOrgMember && (
              <Link href={`/dashboard/workflows/${project.workflow.id}`} className="mt-1 block text-xs font-medium text-orchid-deep hover:text-oxblood">
                View workflow →
              </Link>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader icon={<IconBadge icon={<FileText size={18} />} tone="sage" />} title="Description" />
        <CardBody>
          {canEdit ? (
            <ProjectDescriptionEditor projectId={project.id} description={project.description} />
          ) : (
            <p className="text-sm text-ink-700">{project.description}</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<Users size={18} />} tone="orchid" />} title="Project team" subtitle={canManageTeam ? "Add colleagues to collaborate with the specialist" : undefined} />
        <CardBody className="p-0">
          <ProjectTeamCard
            projectId={project.id}
            specialistName={project.specialist?.user.name}
            specialistHeadline={project.specialist?.headline}
            members={project.members.map((m) => ({ employeeId: m.employeeId, name: m.employee.user.name, jobTitle: m.employee.jobTitle }))}
            candidates={candidates.map((c) => ({ id: c.id, name: c.user.name, jobTitle: c.jobTitle }))}
            canManage={canManageTeam}
          />
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader icon={<IconBadge icon={<ListChecks size={18} />} tone="olive" />} title="Tasks" />
          <CardBody className="space-y-3 p-0">
            <div className="flex flex-wrap gap-1.5 px-5 pt-4">
              {TASK_FILTERS.map((f) => (
                <Link
                  key={f.value}
                  href={f.value === "all" ? `/dashboard/projects/${project.id}` : `/dashboard/projects/${project.id}?tasks=${f.value}`}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    activeTaskFilter.value === f.value ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"
                  }`}
                >
                  {f.label} ({taskCounts[f.value]})
                </Link>
              ))}
            </div>
            <TaskList tasks={filteredTasks} />
            {canEdit && <AddTaskForm projectId={project.id} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<IconBadge icon={<Flag size={18} />} tone="coral" />} title="Milestones" />
          <CardBody className="p-0">
            <MilestoneList milestones={project.milestones} currentStage={project.stage} />
            {canEdit && <AddMilestoneForm projectId={project.id} currentStage={project.stage} />}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader icon={<IconBadge icon={<FolderOpen size={18} />} tone="sage" />} title="Deliverables" />
        <CardBody className="p-0">
          {project.deliverables.length > 0 && (
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-ink-200 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-ink-400 sm:grid-cols-[1fr_auto_auto_auto]">
              <span>Name</span>
              <span className="hidden sm:block">Type</span>
              <span>Added</span>
              <span className="text-right">Link</span>
            </div>
          )}
          <div className="divide-y divide-ink-200">
            {project.deliverables.map((d) => {
              const type = inferDeliverableType(d.url);
              return (
                <div key={d.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-5 py-3 sm:grid-cols-[1fr_auto_auto_auto]">
                  <div className="flex min-w-0 items-center gap-2">
                    {type === "Document" ? <File size={14} className="shrink-0 text-ink-400" /> : <Link2 size={14} className="shrink-0 text-ink-400" />}
                    <span className="truncate text-sm text-ink-800">{d.name}</span>
                  </div>
                  <Badge tone="neutral" className="hidden sm:inline-flex">{type}</Badge>
                  <span className="text-xs text-ink-400">{d.uploadedAt.toLocaleDateString()}</span>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="justify-self-end text-xs font-medium text-orchid-deep hover:text-oxblood hover:underline">
                    Open ↗
                  </a>
                </div>
              );
            })}
          </div>
          {project.deliverables.length === 0 && <p className="p-5 text-sm text-ink-500">No deliverables uploaded yet.</p>}
          {canEdit && <AddDeliverableForm projectId={project.id} />}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={<IconBadge icon={<MessageCircle size={18} />} tone="orchid" />}
          title="Messages"
          action={canEdit ? <NotifyTeamButton projectId={project.id} /> : undefined}
        />
        <CardBody>
          <MessageThread
            projectId={project.id}
            currentUserId={session.sub}
            messages={project.messages.map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt.toISOString(), senderName: m.senderUser.name, senderUserId: m.senderUserId }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}
