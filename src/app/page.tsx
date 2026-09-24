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

const included = [
  "AI maturity assessment",
  "Opportunity engine",
  "Workflow library",
  "Personalized learning paths",
  "Expert help on demand",
  "ROI engine and analytics",
];

const screenshots = [
  { src: "/screenshots/overview.png", alt: "Reldro Overview dashboard showing an AI Adoption Score of 54, adoption trend, and organization-wide stats", caption: "See your organization's AI Adoption Score and what's driving it" },
  { src: "/screenshots/learn.png", alt: "Learn page showing role-specific lessons grouped by department", caption: "Short, role-specific lessons tied to real workflows" },
  { src: "/screenshots/workflows.png", alt: "Workflow library showing AI-enabled processes grouped by department", caption: "AI-enabled workflows for every department, ready to roll out" },
  { src: "/screenshots/analytics.png", alt: "Analytics page showing adoption over time and by department", caption: "Track adoption over time and by department" },
  { src: "/screenshots/roi.png", alt: "ROI page showing real captured value and value by department", caption: "Real value captured, broken down by department" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-4 pt-20 text-center sm:pt-28">
        <span className="inline-flex items-center rounded-full border border-oxblood/20 bg-bone px-3 py-1 text-xs font-medium text-oxblood">
          AI adoption operating system
        </span>
        <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tighter text-ink-900 sm:text-7xl">
          Make AI adoption actually happen.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-ink-600 sm:text-lg">
          Reldro helps companies discover where AI can improve work, equip employees with the skills to use it, and
          connect teams with specialists to implement it.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/demo" className="rounded-full bg-oxblood px-6 py-3.5 text-sm font-semibold text-white hover:bg-ink-900">
            Request a demo
          </Link>
          <Link href="#how-it-works" className="rounded-full border border-ink-300 px-6 py-3.5 text-sm font-semibold text-ink-800 hover:bg-ink-50">
            Explore the platform
          </Link>
        </div>
      </section>

      {/* Hero product visual */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-14">
        <figure className="overflow-hidden rounded-2xl border border-ink-200 shadow-[0_30px_80px_-30px_rgba(42,10,12,0.35)]">
          <div className="flex items-center gap-1.5 border-b border-ink-200 bg-ink-50 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-ink-200" />
            <span className="h-3 w-3 rounded-full bg-ink-200" />
            <span className="h-3 w-3 rounded-full bg-ink-200" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/screenshots/opportunities-matrix.png"
            alt="Reldro's opportunity matrix, plotting AI opportunities by business impact and effort"
            className="w-full"
          />
        </figure>
      </section>

      {/* Problem */}
      <section className="border-y border-ink-200">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
                Everyone knows they need AI. Almost nobody knows how to adopt it.
              </h2>
              <p className="mt-4 text-sm text-ink-600">
                Most organizations can buy AI tools. Very few can answer the questions that actually determine
                whether adoption sticks.
              </p>
              <ul className="mt-6 space-y-3">
                {problems.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-ink-700">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-oxblood" />
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
                  <p className="text-xs text-ink-500">Havenbrook · 318 employees</p>
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
                  <div key={label as string} className="rounded-lg bg-bone/60 px-3 py-2">
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
          <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">The Reldro loop</h2>
          <p className="mt-4 text-sm text-ink-600">
            Every major screen in Reldro reinforces the same loop, so teams keep coming back to it as part of their
            regular work.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loopSteps.map((s, i) => (
            <div key={s.step} className="rounded-xl border border-ink-200 p-6">
              <span className="text-2xl font-semibold tracking-tight text-orchid-deep">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-base font-semibold text-ink-900">{s.step}</h3>
              <p className="mt-2 text-sm text-ink-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bold statement band */}
      <section className="bg-oxblood">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="text-3xl font-semibold leading-tight tracking-tight text-bone sm:text-4xl">
            AI adoption fails when nobody owns it. Reldro gives every team a plan, a way to learn it, and a number
            that proves it worked.
          </p>
        </div>
      </section>

      {/* Screenshots */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">The whole loop, in one platform</h2>
          <p className="mt-4 text-sm text-ink-600">Real screens, real data, from a live Reldro workspace.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {screenshots.map((s) => (
            <figure key={s.src} className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-card">
              <div className="flex items-center gap-1.5 border-b border-ink-200 bg-ink-50 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.alt} className="w-full" loading="lazy" />
              <figcaption className="border-t border-ink-200 px-4 py-3 text-xs text-ink-500">{s.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Expert help */}
      <section id="expert-help" className="border-y border-ink-200">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
                When implementation gets complex, bring in a vetted specialist.
              </h2>
              <p className="mt-4 text-sm text-ink-600">
                Request expert help directly from any opportunity or workflow. Our team matches you with a vetted AI
                specialist based on your industry, tech stack, and budget.
              </p>
              <Link href="/demo" className="mt-6 inline-block text-sm font-medium text-orchid-deep hover:text-oxblood">
                See how it works →
              </Link>
            </div>
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Request expert help</p>
              <div className="mt-4 space-y-2 text-sm text-ink-700">
                <p className="rounded-lg bg-bone/60 px-3 py-2">
                  "We need help rolling out AI-assisted response drafting across our support team in the next 6 weeks."
                </p>
              </div>
              <p className="mt-4 text-xs font-medium text-ink-500">What happens next</p>
              <ul className="mt-1.5 space-y-1 text-xs text-ink-600">
                <li>· We match you against specialists with relevant industry and tool experience</li>
                <li>· A specialist is assigned to a dedicated project workspace</li>
                <li>· Track stages, tasks, and deliverables from Discovery through Optimization</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">Works across every industry</h2>
          <p className="mt-4 text-sm text-ink-600">
            Reldro works the same way across industries. Workflows, learning, and specialists are tailored to yours.
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
      <section className="border-y border-ink-200">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">Measure the return on your AI investment</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-ink-600">
            Every workflow and initiative rolls up into a configurable ROI model that tracks investment, estimated
            annual value, and return, broken down by department and workflow.
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
            <div className="rounded-xl border border-oxblood/20 bg-bone p-5">
              <p className="text-xs text-oxblood">Estimated ROI</p>
              <p className="mt-1 text-2xl font-semibold text-oxblood">638%</p>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-md text-xs text-ink-400">
            Illustrative example based on demo data. Your ROI model uses your own configurable assumptions.
          </p>
        </div>
      </section>

      {/* Testimonials placeholder */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">What adoption looks like in practice</h2>
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
      <section id="pricing" className="border-y border-ink-200">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">Pricing for your organization</h2>
          <p className="mt-4 text-sm text-ink-600">
            Pricing depends on your headcount, departments, and how much of the platform you roll out. Request a demo
            and we'll put together a plan that fits.
          </p>
          <Link
            href="/demo"
            className="mt-6 inline-block rounded-full bg-oxblood px-6 py-3.5 text-sm font-semibold text-white hover:bg-ink-900"
          >
            Request a demo
          </Link>
          <ul className="mx-auto mt-10 grid max-w-xl gap-3 text-left sm:grid-cols-2">
            {included.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-ink-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-oxblood" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-oxblood">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-bone sm:text-5xl">
            Ready to see where your organization stands?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-bone/70 sm:text-base">
            Run your AI maturity assessment in minutes and get a prioritized opportunity map for your organization.
          </p>
          <Link href="/demo" className="mt-8 inline-block rounded-full bg-bone px-6 py-3.5 text-sm font-semibold text-oxblood hover:bg-white">
            Request a demo
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
