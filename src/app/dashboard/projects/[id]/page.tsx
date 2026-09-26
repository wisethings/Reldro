import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProjectStageStepper } from "@/components/projects/ProjectStageStepper";
import { TaskList } from "@/components/projects/TaskList";
import { MilestoneList } from "@/components/projects/MilestoneList";
import { MessageThread } from "@/components/projects/MessageThread";
import { ProjectTeamCard } from "@/components/projects/ProjectTeamCard";
import { AddTaskForm } from "@/components/projects/AddTaskForm";
import { AddMilestoneForm } from "@/components/projects/AddMilestoneForm";
import { AddDeliverableForm } from "@/components/projects/AddDeliverableForm";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

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

  const canEdit = Boolean(isOrgMember || isAssignedSpecialist);
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">{project.title}</h1>
          <p className="text-sm text-ink-500">
            {project.organization.name} {project.specialist && <>· {project.specialist.user.name}</>}
          </p>
        </div>
        <Badge tone={project.status === "ACTIVE" ? "green" : "neutral"}>{project.status.toLowerCase()}</Badge>
      </div>

      <Card>
        <CardBody>
          <ProjectStageStepper projectId={project.id} currentStage={project.stage} canAdvance={Boolean(isAssignedSpecialist || isOrgMember)} />
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Budget" value={project.budget ? `$${project.budget.toLocaleString()}` : "Not set"} />
        <Stat label="Target completion" value={project.targetEndDate?.toLocaleDateString() ?? "Not set"} />
        <Stat label="Linked workflow" value={project.workflow?.title ?? "None"} />
      </div>

      <Card>
        <CardHeader title="Description" />
        <CardBody>
          <p className="text-sm text-ink-700">{project.description}</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Project team" subtitle={canManageTeam ? "Add colleagues to collaborate with the specialist" : undefined} />
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
          <CardHeader title="Tasks" />
          <CardBody className="p-0">
            <TaskList tasks={project.tasks} />
            {canEdit && <AddTaskForm projectId={project.id} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Milestones" />
          <CardBody className="p-0">
            <MilestoneList milestones={project.milestones} />
            {canEdit && <AddMilestoneForm projectId={project.id} currentStage={project.stage} />}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Deliverables" />
        <CardBody className="divide-y divide-ink-200 p-0">
          {project.deliverables.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-3">
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-ink-800 hover:text-orchid-deep hover:underline">
                {d.name}
              </a>
              <span className="text-xs text-ink-400">{d.uploadedAt.toLocaleDateString()}</span>
            </div>
          ))}
          {project.deliverables.length === 0 && <p className="p-5 text-sm text-ink-500">No deliverables uploaded yet.</p>}
          {canEdit && <AddDeliverableForm projectId={project.id} />}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Messages" />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
