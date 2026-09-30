"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Plus } from "lucide-react";
import { getNavItems, type NavAudience } from "./nav";

/** Breadcrumb bar: where you are on the left, the one primary action on the right. */
export function Topbar({ audience, onMenuClick, hideReportCta = false }: { audience: NavAudience; onMenuClick?: () => void; hideReportCta?: boolean }) {
  const pathname = usePathname();
  const items = getNavItems(audience);
  const here = items.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  const Icon = here?.icon;
  const crumb = pathname.startsWith("/dashboard/account") ? { group: "Organization", label: "Account" } : here ? { group: here.group, label: here.label } : { group: undefined, label: "Reldro" };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-ink-200/70 px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" onClick={onMenuClick} aria-label="Open menu" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-100 md:hidden">
          <Menu size={18} aria-hidden />
        </button>
        {Icon && (
          <span aria-hidden className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orchid-soft text-orchid-deep sm:flex">
            <Icon size={14} />
          </span>
        )}
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
          {crumb.group && (
            <>
              <span className="hidden text-ink-500 sm:inline">{crumb.group}</span>
              <ChevronRight size={13} aria-hidden className="hidden text-ink-300 sm:block" />
            </>
          )}
          <span className="truncate font-medium text-ink-900">{crumb.label}</span>
        </nav>
      </div>
      {!hideReportCta && (
        <Link href="/dashboard/reports/new" className="hidden shrink-0 items-center gap-1.5 rounded-full bg-brand-700 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-800 sm:inline-flex">
          <Plus size={14} aria-hidden /> Report a safety concern
        </Link>
      )}
    </header>
  );
}
