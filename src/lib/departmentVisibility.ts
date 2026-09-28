import "server-only";
import type { SessionPayload } from "@/lib/auth/session";

type EmployeeForVisibility = { department: { name: string } | null } | null;

/**
 * When an org has department isolation on, a non-company-admin only sees
 * their own department's workflows/lessons - both the shared global catalog
 * and other departments' team-authored content are filtered out. Returns
 * undefined for "no restriction" (isolation off, or viewer is a company
 * admin), so callers can spread it straight into a Prisma `where.department`.
 *
 * An employee with no department assigned sees nothing department-scoped
 * once isolation is on, rather than falling back to "everything" - the
 * point of the setting is to fail closed, not open.
 */
export function departmentVisibilityFilter(
  session: SessionPayload,
  isolationEnabled: boolean,
  employee: EmployeeForVisibility,
): string | undefined {
  if (!isolationEnabled || session.role === "COMPANY_ADMIN") return undefined;
  return employee?.department?.name ?? "__none__";
}

/**
 * Unconditional department relevance, independent of the org's
 * departmentIsolationEnabled toggle (which only governs the Workflow
 * library). Opportunities, templates, and courses are always scoped to a
 * non-admin's own department - there's no "see every department's
 * opportunities" mode for a plain employee or department lead, only for a
 * company admin who administers the whole org. Returns the employee's
 * department name (by convention "__none__" when they have no department,
 * so the filter matches nothing rather than falling back to "everything").
 */
export function ownDepartmentFilter(session: SessionPayload, employee: EmployeeForVisibility): string | undefined {
  if (session.role === "COMPANY_ADMIN") return undefined;
  return employee?.department?.name ?? "__none__";
}
