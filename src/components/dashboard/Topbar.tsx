import Link from "next/link";
import { logout } from "@/lib/actions/auth";

export function Topbar({
  name,
  roleLabel,
  title,
  onMenuClick,
}: {
  name: string;
  roleLabel: string;
  title?: string;
  onMenuClick?: () => void;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-200 text-ink-700 hover:bg-surface-sunken md:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        {title && <h1 className="truncate text-base font-semibold text-ink-900">{title}</h1>}
      </div>
      <div className="flex items-center gap-4">
        <Link href="/dashboard/account" className="flex items-center gap-2.5 hover:opacity-80">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-orchid-deep">
            {initials}
          </span>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-ink-900">{name}</p>
            <p className="text-[11px] leading-tight text-ink-500">{roleLabel}</p>
          </div>
        </Link>
        <form action={logout}>
          <button className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50">
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
