"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Mail } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { SUPPORT_MAILTO } from "@/lib/support";
import { Logo } from "@/components/ui/Logo";
import { getNavItems, type NavAudience, type NavItem } from "./nav";

function initialsOf(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function NavContent({ audience, orgName, name, roleLabel, onNavigate }: { audience: NavAudience; orgName?: string | null; name: string; roleLabel: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = getNavItems(audience);
  // Keep groups in order of first appearance; ungrouped items sit at the top.
  const groups: { label: string | null; items: NavItem[] }[] = [];
  for (const it of items) {
    const label = it.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(it);
    else groups.push({ label, items: [it] });
  }

  return (
    <>
      <div className="flex h-12 shrink-0 items-center px-4">
        <Link href="/dashboard/overview" onClick={onNavigate} className="min-w-0" aria-label="Reldro home">
          <Logo height={22} />
        </Link>
      </div>
      {orgName && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg bg-white/60 px-2 py-1.5">
          <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-oxblood text-[10px] font-semibold text-bone">{orgName.slice(0, 1).toUpperCase()}</span>
          <span className="truncate text-sm font-medium text-ink-900">{orgName}</span>
        </div>
      )}
      <nav aria-label="Primary" className="flex-1 space-y-4 overflow-y-auto px-3 pb-3 pt-1">
        {groups.map((g, gi) => (
          <div key={gi} className="space-y-0.5">
            {g.label && <p className="px-2 pb-1 text-xs font-medium text-ink-500">{g.label}</p>}
            {g.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-white text-ink-900 shadow-[0_0_0_1px_rgba(42,10,12,0.06)]" : "text-ink-600 hover:bg-white/60 hover:text-ink-900"
                  }`}
                >
                  <Icon size={16} aria-hidden className={active ? "text-orchid-deep" : "text-ink-500"} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-ink-200/70 p-3">
        <a
          href={SUPPORT_MAILTO}
          onClick={onNavigate}
          className="mb-2 flex min-h-10 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:bg-white/60 hover:text-ink-900 md:min-h-0"
        >
          <Mail size={16} aria-hidden className="text-ink-500" />
          Contact support
        </a>
        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/account" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 hover:bg-white/60" aria-label="Your account">
            <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orchid-soft text-xs font-semibold text-orchid-deep">{initialsOf(name)}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium leading-tight text-ink-900">{name}</span>
              <span className="block truncate text-xs leading-tight text-ink-500">{roleLabel}</span>
            </span>
          </Link>
          <form action={logout}>
            <button type="submit" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-white/60 hover:text-ink-900" aria-label="Log out" title="Log out">
              <LogOut size={15} aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export function Sidebar({
  audience,
  orgName,
  name,
  roleLabel,
  mobileOpen = false,
  onClose,
}: {
  audience: NavAudience;
  orgName?: string | null;
  name: string;
  roleLabel: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      <aside className="hidden w-56 shrink-0 flex-col md:flex">
        <NavContent audience={audience} orgName={orgName} name={name} roleLabel={roleLabel} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-oxblood/40" onClick={onClose} />
          <aside className="relative flex h-full w-72 max-w-[82vw] flex-col bg-ink-100 shadow-lg">
            <NavContent audience={audience} orgName={orgName} name={name} roleLabel={roleLabel} onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
