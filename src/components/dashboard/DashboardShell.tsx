"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileTabBar } from "./MobileTabBar";
import { SupportChat } from "./SupportChat";
import type { NavAudience } from "./nav";

export function DashboardShell({
  audience,
  orgName,
  name,
  roleLabel,
  showSupport = false,
  children,
}: {
  audience: NavAudience;
  orgName: string | null;
  name: string;
  roleLabel: string;
  showSupport?: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  // The Report shortcut lives in the top bar (desktop) and the tab bar (phone); don't repeat it where the page already is one.
  const workerHome = !audience.isSafetyTeam && !audience.isSupervisor && pathname === "/dashboard/overview";
  const hideReportCta = pathname.startsWith("/dashboard/reports/new") || workerHome;

  return (
    <div className="fixed inset-0 flex overflow-clip bg-ink-100">
      <Sidebar audience={audience} orgName={orgName} name={name} roleLabel={roleLabel} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
        <div className="flex min-h-0 flex-1 flex-col overflow-clip bg-white md:rounded-2xl md:border md:border-ink-200/70 md:shadow-[0_1px_2px_rgba(42,10,12,0.04)]">
          <Topbar audience={audience} onMenuClick={() => setMobileOpen(true)} hideReportCta={hideReportCta} />
          <main className="min-w-0 flex-1 overflow-y-auto bg-surface-muted pb-24 [scrollbar-gutter:stable] md:pb-0">{children}</main>
        </div>
      </div>
      <MobileTabBar onMenu={() => setMobileOpen(true)} />
      {showSupport && <SupportChat />}
    </div>
  );
}
