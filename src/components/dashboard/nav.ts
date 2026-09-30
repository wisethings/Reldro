import { BarChart3, ClipboardCheck, FileText, Home, ListChecks, MapPin, Megaphone, Search, Settings, Users, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; group?: string };

export type NavAudience = {
  isAdmin: boolean;
  isSafetyTeam: boolean;
  isSupervisor: boolean;
};

/**
 * One short list per audience. Workers get four destinations, supervisors
 * five, the safety team the full set, grouped by what they do. Nothing here is "coming soon".
 */
export function getNavItems(a: NavAudience): NavItem[] {
  if (a.isSafetyTeam) {
    return [
      { href: "/dashboard/overview", label: "Overview", icon: Home },
      { href: "/dashboard/reports", label: "Reports", icon: FileText, group: "Response" },
      { href: "/dashboard/investigations", label: "Investigations", icon: Search, group: "Response" },
      { href: "/dashboard/actions", label: "Corrective actions", icon: ListChecks, group: "Response" },
      { href: "/dashboard/inspections", label: "Inspections", icon: ClipboardCheck, group: "Prevention" },
      { href: "/dashboard/training", label: "People & Training", icon: Users, group: "Prevention" },
      { href: "/dashboard/sites", label: "Sites", icon: MapPin, group: "Prevention" },
      { href: "/dashboard/insights", label: "Insights", icon: BarChart3, group: "Organization" },
      ...(a.isAdmin ? [{ href: "/dashboard/settings", label: "Settings", icon: Settings, group: "Organization" }] : []),
    ];
  }
  if (a.isSupervisor) {
    return [
      { href: "/dashboard/overview", label: "Overview", icon: Home },
      { href: "/dashboard/reports", label: "Reports", icon: FileText, group: "Response" },
      { href: "/dashboard/actions", label: "Corrective actions", icon: ListChecks, group: "Response" },
      { href: "/dashboard/inspections", label: "Inspections", icon: ClipboardCheck, group: "Prevention" },
      { href: "/dashboard/training", label: "Training", icon: Megaphone, group: "Prevention" },
    ];
  }
  return [
    { href: "/dashboard/overview", label: "Home", icon: Home },
    { href: "/dashboard/reports", label: "My reports", icon: FileText },
    { href: "/dashboard/actions", label: "My corrective actions", icon: ListChecks },
    { href: "/dashboard/training", label: "Toolbox talks", icon: Megaphone },
  ];
}
