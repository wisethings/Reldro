import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-700 text-xs font-bold text-white">
                R
              </span>
              <span className="text-sm font-semibold text-ink-900">Reldro</span>
            </div>
            <p className="mt-2 max-w-xs text-xs text-ink-500">
              The AI adoption operating system for the modern workforce.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-8 text-sm">
            <div>
              <p className="font-medium text-ink-900">Product</p>
              <ul className="mt-2 space-y-1.5 text-ink-500">
                <li><Link href="/#how-it-works" className="hover:text-ink-800">How it works</Link></li>
                <li><Link href="/#expert-help" className="hover:text-ink-800">Expert help</Link></li>
                <li><Link href="/pricing" className="hover:text-ink-800">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-ink-900">Company</p>
              <ul className="mt-2 space-y-1.5 text-ink-500">
                <li><Link href="/login" className="hover:text-ink-800">Log in</Link></li>
                <li><Link href="/signup" className="hover:text-ink-800">Get started</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-ink-900">Industries</p>
              <ul className="mt-2 space-y-1.5 text-ink-500">
                <li>Retail &amp; CPG</li>
                <li>Financial services</li>
                <li>Professional services</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-ink-100 pt-6 text-xs text-ink-400">
          © {new Date().getFullYear()} Reldro. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
