"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, ListChecks, Menu, Plus } from "lucide-react";

/**
 * Phone-first bottom bar: the one action people need in the field (report
 * something) is always one thumb-tap away, in the middle.
 */
export function MobileTabBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const tab = (href: string, label: string, Icon: typeof Home) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link href={href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${active ? "text-orchid-deep" : "text-ink-500"}`}>
        <Icon size={20} />
        {label}
      </Link>
    );
  };

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 flex items-end border-t border-ink-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {tab("/dashboard/overview", "Home", Home)}
      {tab("/dashboard/reports", "Reports", ClipboardList)}
      <Link href="/dashboard/reports/new" className="-mt-5 flex flex-1 flex-col items-center gap-0.5 pb-2 text-xs font-semibold text-ink-900">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg">
          <Plus size={26} />
        </span>
        Report
      </Link>
      {tab("/dashboard/actions", "Actions", ListChecks)}
      <button type="button" onClick={onMenu} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium text-ink-500">
        <Menu size={20} />
        More
      </button>
    </nav>
  );
}
