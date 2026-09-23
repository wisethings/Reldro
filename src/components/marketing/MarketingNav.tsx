import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#expert-help", label: "Expert help" },
  { href: "/pricing", label: "Pricing" },
];

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Logo height={30} />
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-ink-600 hover:text-ink-900">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/login" className="hidden text-sm font-medium text-ink-700 hover:text-ink-900 sm:inline">
            Log in
          </Link>
          <Link
            href="/signup"
            className="whitespace-nowrap rounded-full bg-brand-700 px-3 py-2 text-xs font-medium text-white hover:bg-brand-800 sm:px-3.5 sm:text-sm"
          >
            <span className="sm:hidden">Get started</span>
            <span className="hidden sm:inline">Assess your organization</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
