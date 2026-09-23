import "server-only";
import { prisma } from "@/lib/prisma";
import { getFluencyForEmployee } from "@/lib/queries/fluency";
import { EMPLOYEE_SKILL_LABELS, type EmployeeSkillCategory } from "@/lib/scoring";
import { awardPoints } from "@/lib/rewards";
import { logAudit } from "@/lib/audit";

export type RequiredSkill = { skill: EmployeeSkillCategory; minScore: number };

export const CERTIFICATION_DEFAULTS: {
  key: string;
  title: string;
  description: string;
  minFluency: number | null;
  requiredSkills: RequiredSkill[];
  minCoursesCompleted: number;
  minSimulationsPassed: number;
  pointsAwarded: number;
  order: number;
}[] = [
  {
    key: "ai-practitioner",
    title: "AI Practitioner",
    description: "Uses company-approved AI tools and workflows effectively in day-to-day work.",
    minFluency: 55,
    requiredSkills: [],
    minCoursesCompleted: 1,
    minSimulationsPassed: 1,
    pointsAwarded: 100,
    order: 1,
  },
  {
    key: "ai-workflow-builder",
    title: "AI Workflow Builder",
    description: "Demonstrates strong workflow judgment and can adapt AI-enabled processes, not just follow them.",
    minFluency: 70,
    requiredSkills: [{ skill: "workflowDesign", minScore: 65 }],
    minCoursesCompleted: 2,
    minSimulationsPassed: 2,
    pointsAwarded: 150,
    order: 2,
  },
  {
    key: "ai-champion",
    title: "AI Champion",
    description: "Advanced AI capability with consistently strong evaluation judgment across realistic scenarios.",
    minFluency: 80,
    requiredSkills: [{ skill: "evaluation", minScore: 75 }],
    minCoursesCompleted: 3,
    minSimulationsPassed: 3,
    pointsAwarded: 250,
    order: 3,
  },
];

/** Idempotent - safe to call whenever certifications might be checked. */
export async function ensureCertificationCatalog() {
  await prisma.certification.createMany({
    data: CERTIFICATION_DEFAULTS.map((c) => ({
      key: c.key,
      title: c.title,
      description: c.description,
      minFluency: c.minFluency,
      requiredSkills: c.requiredSkills,
      minCoursesCompleted: c.minCoursesCompleted,
      minSimulationsPassed: c.minSimulationsPassed,
      pointsAwarded: c.pointsAwarded,
      order: c.order,
    })),
    skipDuplicates: true,
  });
}

async function getCompletedCourseCount(employeeId: string): Promise<number> {
  const courses = await prisma.course.findMany({ select: { id: true, lessons: { select: { id: true } } } });
  const completedLessonIds = new Set(
    (await prisma.lessonCompletion.findMany({ where: { employeeId }, select: { lessonId: true } })).map((l) => l.lessonId)
  );
  return courses.filter((c) => c.lessons.length > 0 && c.lessons.every((l) => completedLessonIds.has(l.id))).length;
}

async function getPassedSimulationCount(employeeId: string): Promise<number> {
  const passed = await prisma.simulationAttempt.findMany({
    where: { employeeId, passed: true },
    select: { simulationId: true },
    distinct: ["simulationId"],
  });
  return passed.length;
}

export type CertificationReadiness = {
  key: string;
  title: string;
  description: string;
  pointsAwarded: number;
  earned: boolean;
  earnedAt: Date | null;
  percentComplete: number;
  checklist: { label: string; met: boolean }[];
};

/** Real, checkable readiness against data already tracked elsewhere - never a guessed percentage. */
export async function getCertificationReadiness(employeeId: string): Promise<CertificationReadiness[]> {
  await ensureCertificationCatalog();

  const [certifications, earned, fluency, coursesCompleted, simulationsPassed] = await Promise.all([
    prisma.certification.findMany({ orderBy: { order: "asc" } }),
    prisma.employeeCertification.findMany({ where: { employeeId } }),
    getFluencyForEmployee(employeeId),
    getCompletedCourseCount(employeeId),
    getPassedSimulationCount(employeeId),
  ]);
  const earnedByCertId = new Map(earned.map((e) => [e.certificationId, e.earnedAt]));

  return certifications.map((cert) => {
    const requiredSkills = cert.requiredSkills as unknown as RequiredSkill[];
    const checklist: { label: string; met: boolean }[] = [];

    if (cert.minFluency) {
      checklist.push({ label: `AI fluency ${cert.minFluency}+`, met: (fluency?.overallScore ?? 0) >= cert.minFluency });
    }
    for (const rs of requiredSkills) {
      checklist.push({
        label: `${EMPLOYEE_SKILL_LABELS[rs.skill]} ${rs.minScore}+`,
        met: (fluency?.breakdown[rs.skill] ?? 0) >= rs.minScore,
      });
    }
    if (cert.minCoursesCompleted > 0) {
      checklist.push({
        label: `Complete ${cert.minCoursesCompleted} learning path${cert.minCoursesCompleted > 1 ? "s" : ""} (${coursesCompleted}/${cert.minCoursesCompleted})`,
        met: coursesCompleted >= cert.minCoursesCompleted,
      });
    }
    if (cert.minSimulationsPassed > 0) {
      checklist.push({
        label: `Pass ${cert.minSimulationsPassed} simulation${cert.minSimulationsPassed > 1 ? "s" : ""} (${simulationsPassed}/${cert.minSimulationsPassed})`,
        met: simulationsPassed >= cert.minSimulationsPassed,
      });
    }

    const metCount = checklist.filter((c) => c.met).length;
    const isEarned = earnedByCertId.has(cert.id);

    return {
      key: cert.key,
      title: cert.title,
      description: cert.description,
      pointsAwarded: cert.pointsAwarded,
      earned: isEarned,
      earnedAt: earnedByCertId.get(cert.id) ?? null,
      percentComplete: isEarned ? 100 : checklist.length ? Math.round((metCount / checklist.length) * 100) : 0,
      checklist,
    };
  });
}

/** Call after any event that could newly satisfy a certification (lesson/course completion, simulation attempt). Awards points and logs the audit trail for each newly-earned certification. */
export async function checkAndAwardCertifications(employeeId: string): Promise<void> {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { organizationId: true } });
  if (!employee) return;

  const readiness = await getCertificationReadiness(employeeId);
  const newlyEarned = readiness.filter((r) => !r.earned && r.checklist.length > 0 && r.checklist.every((c) => c.met));
  if (newlyEarned.length === 0) return;

  const certifications = await prisma.certification.findMany({ where: { key: { in: newlyEarned.map((r) => r.key) } } });

  for (const cert of certifications) {
    const created = await prisma.employeeCertification.createMany({
      data: [{ employeeId, certificationId: cert.id }],
      skipDuplicates: true,
    });
    if (created.count === 0) continue;

    await logAudit({
      organizationId: employee.organizationId,
      action: "certification.earned",
      entityType: "Certification",
      entityId: cert.id,
      metadata: { employeeId, title: cert.title },
    });

    if (cert.pointsAwarded > 0) {
      await awardPoints({
        employeeId,
        organizationId: employee.organizationId,
        ruleKey: `certification_${cert.key.replace(/-/g, "_")}`,
        reason: `Earned ${cert.title} certification`,
        entityType: "Certification",
        entityId: cert.id,
        dedupeKey: `certification:${cert.id}`,
      });
    }
  }
}
