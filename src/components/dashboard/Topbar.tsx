import { logout } from "@/lib/actions/auth";

export function Topbar({
  name,
  roleLabel,
  title,
}: {
  name: string;
  roleLabel: string;
  title?: string;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-200 bg-white px-6">
      <div className="min-w-0">
        {title && <h1 className="truncate text-base font-semibold text-ink-900">{title}</h1>}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
            {initials}
          </span>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-ink-900">{name}</p>
            <p className="text-[11px] leading-tight text-ink-500">{roleLabel}</p>
          </div>
        </div>
        <form action={logout}>
          <button className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50">
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
