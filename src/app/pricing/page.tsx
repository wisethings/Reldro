import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const pricing = [
  {
    name: "Starter",
    desc: "For smaller teams getting started with AI adoption.",
    features: ["Up to 50 employees", "AI maturity assessment", "Workflow library", "Core analytics", "Email support"],
  },
  {
    name: "Growth",
    desc: "For growing organizations scaling adoption across departments.",
    features: [
      "Up to 500 employees",
      "Opportunity engine",
      "Personalized learning paths",
      "Expert help on demand",
      "ROI engine",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    desc: "For large, multi-department organizations with governance needs.",
    features: [
      "Unlimited employees",
      "SSO & advanced permissions",
      "Dedicated success manager",
      "Custom integrations",
      "Governance & audit controls",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold text-ink-900">Plans built around your organization</h1>
          <p className="mt-3 text-sm text-ink-600">
            Pricing is tailored to your headcount and rollout — request a demo and we'll figure out what fits.
            Expert-help engagements are billed separately from your subscription.
          </p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {pricing.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-6 ${p.highlighted ? "border-brand-600 bg-white shadow-card ring-1 ring-brand-600" : "border-ink-200 bg-white"}`}
            >
              <h3 className="text-lg font-semibold text-ink-900">{p.name}</h3>
              <p className="mt-2 text-sm text-ink-600">{p.desc}</p>
              <ul className="mt-5 space-y-2 text-sm text-ink-700">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/demo"
                className={`mt-6 block rounded-full px-4 py-2.5 text-center text-sm font-medium ${p.highlighted ? "bg-brand-700 text-white hover:bg-brand-800" : "border border-ink-300 text-ink-800 hover:bg-ink-50"}`}
              >
                Request a demo
              </Link>
            </div>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
