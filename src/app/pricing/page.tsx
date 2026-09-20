import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const pricing = [
  {
    name: "Starter",
    price: "$499",
    desc: "For smaller teams getting started with AI adoption.",
    features: ["Up to 50 employees", "AI maturity assessment", "Workflow library", "Core analytics", "Email support"],
  },
  {
    name: "Growth",
    price: "$1,500",
    desc: "For growing organizations scaling adoption across departments.",
    features: [
      "Up to 500 employees",
      "Opportunity engine",
      "Personalized learning paths",
      "Specialist marketplace",
      "ROI engine",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
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
          <h1 className="text-3xl font-semibold text-ink-900">Simple, transparent pricing</h1>
          <p className="mt-3 text-sm text-ink-600">
            Subscriptions cover the platform. Marketplace specialist projects are billed separately — Reldro takes a
            platform fee from specialist transactions.
          </p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {pricing.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-6 ${p.highlighted ? "border-brand-600 bg-white shadow-card ring-1 ring-brand-600" : "border-ink-200 bg-white"}`}
            >
              <h3 className="text-lg font-semibold text-ink-900">{p.name}</h3>
              <p className="mt-1 text-3xl font-semibold text-ink-900">
                {p.price}
                {p.price !== "Custom" && <span className="text-sm font-normal text-ink-500">/month</span>}
              </p>
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
                href="/signup"
                className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-medium ${p.highlighted ? "bg-brand-700 text-white hover:bg-brand-800" : "border border-ink-300 text-ink-800 hover:bg-ink-50"}`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
