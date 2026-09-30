export type NavItem = { href: string; label: string };

export type NavAudience = {
  isAdmin: boolean;
  isSafetyTeam: boolean;
  isSupervisor: boolean;
};

/**
 * One short list per audience. Workers get four destinations, supervisors
 * five, the safety team the full set. Nothing here is "coming soon".
 */
export function getNavItems(a: NavAudience): NavItem[] {
  if (a.isSafetyTeam) {
    return [
      { href: "/dashboard/overview", label: "Overview" },
      { href: "/dashboard/reports", label: "Reports" },
      { href: "/dashboard/investigations", label: "Investigations" },
      { href: "/dashboard/actions", label: "Corrective actions" },
      { href: "/dashboard/inspections", label: "Inspections" },
      { href: "/dashboard/training", label: "People & Training" },
      { href: "/dashboard/sites", label: "Sites" },
      { href: "/dashboard/insights", label: "Insights" },
      ...(a.isAdmin ? [{ href: "/dashboard/settings", label: "Settings" }] : []),
    ];
  }
  if (a.isSupervisor) {
    return [
      { href: "/dashboard/overview", label: "Overview" },
      { href: "/dashboard/reports", label: "Reports" },
      { href: "/dashboard/actions", label: "Corrective actions" },
      { href: "/dashboard/inspections", label: "Inspections" },
      { href: "/dashboard/training", label: "Training" },
    ];
  }
  return [
    { href: "/dashboard/overview", label: "Home" },
    { href: "/dashboard/reports", label: "My reports" },
    { href: "/dashboard/actions", label: "My corrective actions" },
    { href: "/dashboard/training", label: "Toolbox talks" },
  ];
}
