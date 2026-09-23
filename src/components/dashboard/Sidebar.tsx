"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { Logo } from "@/components/ui/Logo";
import { getNavItems } from "./nav";

function NavContent({ role, orgName, onNavigate }: { role: Role; orgName?: string | null; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = getNavItems(role);

  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-ink-200 px-5">
        <div className="min-w-0">
          <Logo height={28} />
          {orgName && <p className="truncate text-[11px] text-ink-500">{orgName}</p>}
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-orchid-soft text-orchid-deep" : "text-ink-600 hover:bg-surface-sunken hover:text-ink-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-ink-200 p-3">
        <p className="px-1 text-[11px] text-ink-400">Reldro · AI adoption OS</p>
      </div>
    </>
  );
}

export function Sidebar({
  role,
  orgName,
  mobileOpen = false,
  onClose,
}: {
  role: Role;
  orgName?: string | null;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
        <NavContent role={role} orgName={orgName} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-oxblood/40"
            onClick={onClose}
          />
          <aside className="relative flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-lg">
            <NavContent role={role} orgName={orgName} onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
