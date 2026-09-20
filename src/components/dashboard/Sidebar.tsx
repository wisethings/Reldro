"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { getNavItems } from "./nav";

export function Sidebar({ role, orgName }: { role: Role; orgName?: string | null }) {
  const pathname = usePathname();
  const items = getNavItems(role);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-ink-100 px-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-700 text-sm font-bold text-white">
          R
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">Reldro</p>
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
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-ink-100 p-3">
        <p className="px-1 text-[11px] text-ink-400">Reldro · AI adoption OS</p>
      </div>
    </aside>
  );
}
