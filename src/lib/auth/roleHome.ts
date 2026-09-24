import type { Role } from "@prisma/client";

/** Where a user of this role lands after login, or is bounced to from a page their role can't access. */
export function destinationForRole(role: Role) {
  if (role === "PLATFORM_ADMIN") return "/platform-admin";
  if (role === "SPECIALIST") return "/dashboard/specialist";
  return "/dashboard/overview";
}
