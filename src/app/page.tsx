import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ScoreRing } from "@/components/ui/Progress";

const loopSteps = [
  { step: "Assess", desc: "Score your organization's AI maturity across usage, skills, governance, and leadership." },
  { step: "Discover", desc: "Surface AI opportunities by department, ranked by business impact and effort." },
  { step: "Learn", desc: "Give employees short, role-specific training tied directly to their real workflows." },
  { step: "Implement", desc: "Roll out AI-enabled workflows, and bring in a vetted specialist when it's complex." },
  { step: "Measure", desc: "Track adoption, hours saved, and ROI by department, role, and workflow." },
  { step: "Optimize", desc: "Feed results back into the opportunity engine and keep compounding." },
];

const problems = [
  "Where should we actually use AI?",
  "Which workflows should change?",
  "How do we get employees to actually change behavior?",
  "When should we hire an AI specialist?",
  "How do we know AI adoption is creating measurable value?",
];

const industries = [
  { name: "Retail & CPG", items: ["Merchandising", "Demand forecasting", "Product descriptions", "Customer service"] },
  { name: "Financial services", items: ["Research", "Compliance", "Reporting", "Advisor workflows"] },
  { name: "Healthcare", items: ["Administrative workflows", "Documentation", "Patient communication", "Scheduling"] },
  { name: "Professional services", items: ["Proposal creation", "Document analysis", "Client reporting", "Knowledge management"] },
  { name: "Manufacturing", items: ["Documentation", "Procurement", "Quality control", "Operations"] },
  { name: "Technology", items: ["Support triage", "Code review", "Product research", "Sales enablement"] },
];

const pricing = [
  { name: "Starter", price: "$499", period: "/month", desc: "For smaller teams getting started with AI adoption.", features: ["Up to 50 employees", "AI maturity assessment", "Workflow library", "Core analytics"] },
  { name: "Growth", price: "$1,500", period: "/month", desc: "For growing organizations scaling adoption across departments.", features: ["Up to 500 employees", "Opportunity engine", "Learning paths", "Specialist marketplace", "ROI engine"], highlighted: true },
  { name: "Enterprise", price: "Custom", period: "", desc: "For large, multi-department organizations with governance needs.", features: ["Unlimited employees", "SSO & advanced permissions", "Dedicated success manager", "Custom integrations"] },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
        <span className="inline-flex items-center rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600">
          AI adoption operating system
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
          Make AI adoption actually happen.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-ink-600 sm:text-lg">
          Reldro helps companies discover where AI can improve work, equip employees with the skills to use it, and
          connect teams with specialists to implement it.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="rounded-lg bg-brand-700 px-5 py-3 text-sm font-medium text-white hover:bg-brand-800">
            Assess your organization
          </Link>
          <Link href="#how-it-works" className="rounded-lg border border-ink-300 px-5 py-3 text-sm font-medium text-ink-800 hover:bg-ink-50">
            Explore the platform
          </Link>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-ink-900">
                Everyone knows they need AI. Almost nobody knows how to adopt it.
              </h2>
              <p className="mt-3 text-sm text-ink-600">
                Most organizations can buy AI tools. Very few can answer the questions that actually determine
                whether adoption sticks.
              </p>
              <ul className="mt-6 space-y-3">
                {problems.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-ink-700">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Example organization</p>
              <div className="mt-4 flex items-center gap-5">
                <ScoreRing value={54} label="/ 100" />
                <div>
                  <p className="text-sm font-semibold text-ink-900">AI Adoption Score</p>
                  <p className="text-xs text-ink-500">Northstar Consumer Group · 412 employees</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                {[
                  ["AI literacy", 72],
                  ["AI usage", 43],
                  ["Workflow integration", 38],
                  ["Governance", 67],
                  ["Measurement", 29],
                  ["Leadership adoption", 61],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-lg bg-ink-50 px-3 py-2">
                    <p className="text-ink-500">{label}</p>
                    <p className="text-sm font-semibold text-ink-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works / loop */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-ink-900">The Reldro loop</h2>
          <p className="mt-3 text-sm text-ink-600">
            Every major screen in Reldro reinforces one loop — because AI adoption isn't a course you finish, it's an
            operating rhythm.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loopSteps.map((s, i) => (
            <div key={s.step} className="rounded-xl border border-ink-200 p-5">
              <span className="text-xs font-medium text-brand-700">Step {i + 1}</span>
              <h3 className="mt-1 text-base font-semibold text-ink-900">{s.step}</h3>
              <p className="mt-2 text-sm text-ink-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Marketplace */}
      <section id="marketplace" className="border-y border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-ink-900">
                When implementation gets complex, bring in a vetted specialist.
              </h2>
              <p className="mt-3 text-sm text-ink-600">
                Reldro matches you with AI marketing, sales, RevOps, automation, and data specialists based on your
                workflow, tech stack, industry, and budget — not just keyword search.
              </p>
              <Link href="/signup" className="mt-6 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
                Explore the specialist marketplace →
              </Link>
            </div>
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Recommended match</p>
              <div className="mt-4 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-900">Maya Johnson</p>
                  <p className="text-xs text-ink-500">AI Marketing &amp; Automation</p>
                  <p className="mt-1 text-xs text-ink-500">Marketing · HubSpot · Claude · ChatGPT</p>
                </div>
                <div className="text-right text-xs text-ink-500">
                  <p className="font-semibold text-ink-900">4.9 ★</p>
                  <p>42 projects</p>
                  <p>$175/hr</p>
                </div>
              </div>
              <p className="mt-4 text-xs font-medium text-ink-500">Recommended because</p>
              <ul className="mt-1.5 space-y-1 text-xs text-ink-600">
                <li>· 12 similar HubSpot + AI implementations</li>
                <li>· 4 projects in consumer products</li>
                <li>· Experience with 400+ employee organizations</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-ink-900">Works across every industry</h2>
          <p className="mt-3 text-sm text-ink-600">
            Reldro is industry-agnostic at the infrastructure level, with workflows, learning, and specialists
            tailored to your vertical.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((ind) => (
            <div key={ind.name} className="rounded-xl border border-ink-200 p-5">
              <h3 className="text-sm font-semibold text-ink-900">{ind.name}</h3>
              <ul className="mt-3 space-y-1.5 text-xs text-ink-600">
                {ind.items.map((i) => (
                  <li key={i}>· {i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ROI */}
      <section className="border-y border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-2xl font-semibold text-ink-900">Prove the business case, not just the training</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-ink-600">
            Every workflow and initiative rolls up into a configurable ROI model — investment, estimated annual
            value, and return — broken down by department and workflow.
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <p className="text-xs text-ink-500">AI investment</p>
              <p className="mt-1 text-2xl font-semibold text-ink-900">$84,000</p>
            </div>
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <p className="text-xs text-ink-500">Est. annual value</p>
              <p className="mt-1 text-2xl font-semibold text-ink-900">$620,000</p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
              <p className="text-xs text-brand-700">Estimated ROI</p>
              <p className="mt-1 text-2xl font-semibold text-brand-800">638%</p>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-md text-xs text-ink-400">
            Illustrative example based on demo data. Your ROI model uses your own configurable assumptions.
          </p>
        </div>
      </section>

      {/* Testimonials placeholder */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-2xl font-semibold text-ink-900">What adoption looks like in practice</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {[
            { quote: "We finally know which teams need training versus which need a specialist.", role: "Head of People, consumer products company" },
            { quote: "The opportunity matrix turned a vague AI mandate into a prioritized backlog.", role: "COO, professional services firm" },
            { quote: "Adoption analytics gave us the ammunition to keep investing in this.", role: "CIO, financial services company" },
          ].map((t) => (
            <div key={t.role} className="rounded-xl border border-ink-200 p-5">
              <p className="text-sm text-ink-700">“{t.quote}”</p>
              <p className="mt-4 text-xs text-ink-500">{t.role}</p>
              <p className="text-[11px] text-ink-400">Illustrative example</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-ink-900">Pricing</h2>
            <p className="mt-3 text-sm text-ink-600">Marketplace transactions are billed separately from your subscription.</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-6 ${p.highlighted ? "border-brand-600 bg-white shadow-card ring-1 ring-brand-600" : "border-ink-200 bg-white"}`}
              >
                {p.highlighted && <Badge>Most popular</Badge>}
                <h3 className="mt-2 text-lg font-semibold text-ink-900">{p.name}</h3>
                <p className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-ink-900">{p.price}</span>
                  <span className="text-sm text-ink-500">{p.period}</span>
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
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-2xl font-semibold text-ink-900">Ready to see where your organization stands?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-600">
          Run your AI maturity assessment in minutes and get a prioritized opportunity map for your organization.
        </p>
        <Link href="/signup" className="mt-6 inline-block rounded-lg bg-brand-700 px-5 py-3 text-sm font-medium text-white hover:bg-brand-800">
          Assess your organization
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-700 px-2.5 py-1 text-[11px] font-medium text-white">
      {children}
    </span>
  );
}
