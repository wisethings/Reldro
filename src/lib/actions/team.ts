"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { sendEmail, inviteEmailHtml, getAppUrl } from "@/lib/email";
import { logAudit } from "@/lib/audit";

export type FormState = { error?: string; tempPassword?: string; emailSent?: boolean } | undefined;

function generateTempPassword() {
  return `Reldro-${Math.random().toString(36).slice(2, 8)}!`;
}

export async function inviteEmployee(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const departmentId = String(formData.get("departmentId") ?? "");
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();

  if (!name || !email || !jobTitle) return { error: "Name, email, and job title are required." };

  // The <select> only ever lists this admin's own departments, but the
  // server action has to enforce that too - otherwise a crafted request with
  // another org's departmentId would corrupt that org's department roster.
  if (departmentId) {
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department || department.organizationId !== session.organizationId) {
      return { error: "That department wasn't found." };
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId! } });

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "EMPLOYEE",
      organizationId: session.organizationId,
      employee: {
        create: {
          organizationId: session.organizationId!,
          departmentId: departmentId || null,
          jobTitle,
        },
      },
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: "employee.invited",
    entityType: "User",
    entityId: newUser.id,
    metadata: { name, email, jobTitle },
  });

  const { sent } = await sendEmail({
    to: email,
    subject: `You're invited to ${org?.name ?? "Reldro"} on Reldro`,
    html: inviteEmailHtml({ name, orgName: org?.name ?? "Reldro", loginUrl: `${getAppUrl()}/login`, tempPassword }),
  });

  revalidatePath("/dashboard/team");
  return sent ? { emailSent: true } : { tempPassword };
}

/**
 * Toggles department-lead status for an employee. Nothing stops more than
 * one employee in the same department from holding this at once - the ask
 * was for multiple team leads per department, and isDepartmentAdmin was
 * already a per-employee boolean with no such constraint, so this just adds
 * the missing control surface rather than a new capability.
 */
export async function setDepartmentAdmin(employeeId: string, isDepartmentAdmin: boolean) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.organizationId !== session.organizationId) throw new Error("Employee not found.");

  await prisma.employee.update({ where: { id: employeeId }, data: { isDepartmentAdmin } });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: isDepartmentAdmin ? "employee.made_department_lead" : "employee.removed_department_lead",
    entityType: "Employee",
    entityId: employeeId,
  });

  revalidatePath("/dashboard/team");
}

/**
 * Cross-department content visibility override - see
 * Employee.viewAllDepartments's doc comment. Not a real permission tier,
 * just a per-employee toggle for someone (typically a demo persona) who
 * needs to see every department's opportunities/templates/workflows/
 * lessons instead of only their own.
 */
export async function setViewAllDepartments(employeeId: string, viewAllDepartments: boolean) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.organizationId !== session.organizationId) throw new Error("Employee not found.");

  await prisma.employee.update({ where: { id: employeeId }, data: { viewAllDepartments } });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: viewAllDepartments ? "employee.granted_all_department_access" : "employee.revoked_all_department_access",
    entityType: "Employee",
    entityId: employeeId,
  });

  revalidatePath("/dashboard/team");
}
