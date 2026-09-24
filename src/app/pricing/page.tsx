import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const included = [
  "AI maturity assessment",
  "Opportunity engine",
  "Workflow library",
  "Personalized learning paths",
  "Expert help on demand",
  "ROI engine and analytics",
  "SSO and advanced permissions",
  "Governance and audit controls",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-3xl font-semibold text-ink-900">Pricing for your organization</h1>
        <p className="mt-3 text-sm text-ink-600">
          There's no fixed tier to pick from. Pricing depends on your headcount, departments, and how much of the
          platform you roll out. Request a demo and we'll put together a plan that fits.
        </p>
        <Link
          href="/demo"
          className="mt-8 inline-block rounded-full bg-brand-700 px-6 py-3 text-sm font-medium text-white hover:bg-brand-800"
        >
          Request a demo
        </Link>

        <div className="mt-16 text-left">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">What's included</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {included.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-ink-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 text-xs text-ink-400">Expert-help engagements are billed separately from your subscription.</p>
      </section>
      <MarketingFooter />
    </div>
  );
}
