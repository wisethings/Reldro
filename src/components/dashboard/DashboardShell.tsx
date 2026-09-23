"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AssistantWidget } from "./AssistantWidget";

export function DashboardShell({
  role,
  orgName,
  name,
  roleLabel,
  showAssistant,
  children,
}: {
  role: Role;
  orgName: string | null;
  name: string;
  roleLabel: string;
  showAssistant: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <Sidebar role={role} orgName={orgName} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={name} roleLabel={roleLabel} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      {showAssistant && <AssistantWidget />}
    </div>
  );
}
