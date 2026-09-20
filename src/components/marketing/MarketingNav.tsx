import Link from "next/link";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#marketplace", label: "Specialists" },
  { href: "/pricing", label: "Pricing" },
];

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-700 text-sm font-bold text-white">
            R
          </span>
          <span className="text-base font-semibold tracking-tight text-ink-900">Reldro</span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-ink-600 hover:text-ink-900">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-ink-700 hover:text-ink-900">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Assess your organization
          </Link>
        </div>
      </div>
    </header>
  );
}
