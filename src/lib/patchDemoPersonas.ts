import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * One-off, idempotent adjustments to specific named demo personas so a
 * product walkthrough reads well - distinct from patchDemoMedia (which
 * only touches the shared global catalog). Matched by email, so this is a
 * no-op wherever that email doesn't exist.
 *
 * Priya Shah is the Havenbrook demo's department-lead persona (seed.ts
 * gives priya.shah@havenbrook.com a stable identity in Marketing for
 * exactly this reason - see "Give priya.shah@havenbrook.com a predictable
 * identity for the demo login button" there). A real department lead is
 * genuinely locked to their own department's opportunities/templates/
 * workflows/lessons; for a demo walkthrough that's too narrow to show the
 * product's breadth, so she gets the viewAllDepartments override instead
 * of loosening that boundary for every real customer's department leads.
 */
const PERSONA_OVERRIDES: { email: string; viewAllDepartments: boolean }[] = [{ email: "priya.shah@havenbrook.com", viewAllDepartments: true }];

export async function patchDemoPersonas() {
  let changed = 0;
  for (const override of PERSONA_OVERRIDES) {
    const user = await prisma.user.findUnique({
      where: { email: override.email },
      select: { employee: { select: { id: true, viewAllDepartments: true } } },
    });
    if (!user?.employee || user.employee.viewAllDepartments === override.viewAllDepartments) continue;
    await prisma.employee.update({ where: { id: user.employee.id }, data: { viewAllDepartments: override.viewAllDepartments } });
    changed++;
  }
  return { changed, total: PERSONA_OVERRIDES.length };
}
