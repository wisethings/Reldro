"use client";

import { useState } from "react";
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

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <Sidebar audience={audience} orgName={orgName} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={name} roleLabel={roleLabel} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">{children}</main>
      </div>
      <MobileTabBar onMenu={() => setMobileOpen(true)} />
    </div>
  );
}
