"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileTabBar } from "./MobileTabBar";
import type { NavAudience } from "./nav";

export function DashboardShell({
  audience,
  orgName,
  name,
  roleLabel,
  children,
}: {
  audience: NavAudience;
  orgName: string | null;
  name: string;
  roleLabel: string;
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
          {/* The scroll area ends exactly where the tab bar begins (the bar is part of the layout, not laid over it), so content
              can never run underneath it. `scroll-pb` keeps a focused field clear of a sticky action bar when the browser
              scrolls it into view. */}
          <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain bg-surface-muted [scrollbar-gutter:stable] scroll-pb-28 md:scroll-pb-0">{children}</main>
        </div>
        <MobileTabBar onMenu={() => setMobileOpen(true)} />
      </div>
    </div>
  );
}
