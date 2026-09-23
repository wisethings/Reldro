import type { Role } from "@prisma/client";

export type NavItem = { href: string; label: string };

export function getNavItems(role: Role, isDepartmentAdmin = false): NavItem[] {
  if (role === "SPECIALIST") {
    return [
      { href: "/dashboard/specialist", label: "Overview" },
      { href: "/dashboard/specialist/profile", label: "My Profile" },
      { href: "/dashboard/specialist/projects", label: "Projects" },
    ];
  }

  const base: NavItem[] = [
    { href: "/dashboard/overview", label: "Overview" },
    { href: "/dashboard/assessment", label: "AI Assessment" },
    { href: "/dashboard/opportunities", label: "Opportunities" },
    { href: "/dashboard/workflows", label: "Workflows" },
    { href: "/dashboard/templates", label: "Templates" },
    { href: "/dashboard/learn", label: "Learn" },
    { href: "/dashboard/rewards", label: "Rewards" },
    { href: "/dashboard/initiatives", label: "Initiatives" },
  ];

  if (role === "COMPANY_ADMIN") {
    return [
      ...base,
      { href: "/dashboard/expert-help", label: "Expert Help" },
      { href: "/dashboard/analytics", label: "Analytics" },
      { href: "/dashboard/team", label: "Team" },
      { href: "/dashboard/integrations", label: "Integrations" },
      { href: "/dashboard/settings", label: "Settings" },
    ];
  }

  // Employee: personalized, lighter-weight nav, plus a team rollup for
  // department admins (a manager-level view without full company-admin access).
  return isDepartmentAdmin ? [...base, { href: "/dashboard/my-team", label: "My Team" }] : base;
}
