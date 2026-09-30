"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileTabBar } from "./MobileTabBar";
import type { NavAudience } from "./nav";

export function DashboardShell({
  audience,
  orgName,
  name,
  roleLabel,
  isDemo = false,
  children,
}: {
  audience: NavAudience;
  orgName: string | null;
  name: string;
  roleLabel: string;
  isDemo?: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  // The Report shortcut lives in the top bar (desktop) and the tab bar (phone); don't repeat it where the page already is one.
  const workerHome = !audience.isSafetyTeam && !audience.isSupervisor && pathname === "/dashboard/overview";
  const hideReportCta = pathname.startsWith("/dashboard/reports/new") || workerHome;

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <Sidebar audience={audience} orgName={orgName} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {isDemo && (
          <div role="status" className="flex items-center justify-center gap-2 bg-olive-soft px-4 py-1.5 text-center text-xs font-medium text-olive">
            <FlaskConical size={14} aria-hidden className="shrink-0" />
            <span>Sample workspace. All people, sites and events here are made up for practice, and no email or message is sent to anyone.</span>
          </div>
        )}
        <Topbar name={name} roleLabel={roleLabel} onMenuClick={() => setMobileOpen(true)} hideReportCta={hideReportCta} />
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">{children}</main>
      </div>
      <MobileTabBar onMenu={() => setMobileOpen(true)} />
    </div>
  );
}
