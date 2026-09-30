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
  // Every cell is the same height, so the bar never resizes between pages; the raised Report button rises out of it.
  const cell = "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] leading-none";
  const tab = (href: string, label: string, Icon: typeof Home) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link href={href} aria-current={active ? "page" : undefined} className={`${cell} ${active ? "font-semibold text-orchid-deep" : "font-medium text-ink-500"}`}>
        <Icon size={22} aria-hidden />
        {label}
      </Link>
    );
  };

  return (
    <nav aria-label="Primary" className="relative z-20 flex shrink-0 items-stretch border-t border-ink-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_-8px_rgba(42,10,12,0.12)] md:hidden">
      {tab("/dashboard/overview", "Home", Home)}
      {tab("/dashboard/reports", "Reports", ClipboardList)}
      <Link href="/dashboard/reports/new" className={`${cell} font-semibold text-ink-900`}>
        <span className="flex h-8 w-11 items-center justify-center rounded-full bg-brand-700 text-white">
          <Plus size={22} aria-hidden />
        </span>
        Report
      </Link>
      {tab("/dashboard/actions", "Actions", ListChecks)}
      <button type="button" onClick={onMenu} className={`${cell} font-medium text-ink-500`}>
        <Menu size={22} aria-hidden />
        More
      </button>
    </nav>
  );
}
