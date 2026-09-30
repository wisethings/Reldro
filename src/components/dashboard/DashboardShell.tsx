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
    <div className="flex h-screen overflow-hidden bg-ink-100">
      <Sidebar audience={audience} orgName={orgName} name={name} roleLabel={roleLabel} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
        {isDemo && (
          <div role="status" className="flex items-center justify-center gap-2 bg-olive-soft px-4 py-1 text-center text-[11px] font-medium text-olive md:mb-2 md:rounded-lg">
            <FlaskConical size={13} aria-hidden className="shrink-0" />
            <span>Sample workspace. Everything here is made up for practice, and no email or message is sent to anyone.</span>
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white md:rounded-2xl md:border md:border-ink-200/70 md:shadow-[0_1px_2px_rgba(42,10,12,0.04)]">
          <Topbar audience={audience} onMenuClick={() => setMobileOpen(true)} hideReportCta={hideReportCta} />
          <main className="flex-1 overflow-y-auto bg-white pb-24 md:pb-0">{children}</main>
        </div>
      </div>
      <MobileTabBar onMenu={() => setMobileOpen(true)} />
    </div>
  );
}
