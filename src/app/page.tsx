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
  { src: "/screenshots/overview.png", alt: "Reldro Overview dashboard showing an AI Adoption Score of 54, adoption trend, and organization-wide stats", caption: "Your AI Adoption Score and what's driving it" },
  { src: "/screenshots/learn.png", alt: "Learn page showing role-specific lessons grouped by department", caption: "Lessons tied to real workflows" },
  { src: "/screenshots/workflows.png", alt: "Workflow library showing AI-enabled processes grouped by department", caption: "Workflows for every department" },
  { src: "/screenshots/analytics.png", alt: "Analytics page showing adoption over time and by department", caption: "Adoption over time, by department" },
  { src: "/screenshots/roi.png", alt: "ROI page showing real captured value and value by department", caption: "Value captured, by department" },
];

const testimonials = [
  { quote: "We finally know which teams need training versus which need a specialist.", role: "Head of People, consumer products company" },
  { quote: "The opportunity matrix turned a vague AI mandate into a prioritized backlog.", role: "COO, professional services firm" },
  { quote: "Adoption analytics gave us the ammunition to keep investing in this.", role: "CIO, financial services company" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-200">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          <div className="mx-auto grid h-full max-w-6xl grid-cols-4 px-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border-l border-ink-200/70 first:border-l-0" />
            ))}
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-6 pt-20 sm:pt-28">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-6">
            <div className="lg:col-span-7">
              <p className="font-serif text-lg text-orchid-deep">AI adoption operating system</p>
              <h1 className="mt-3 max-w-2xl text-6xl font-semibold leading-[0.98] text-ink-900 sm:text-7xl">
                Make AI adoption <span className="bg-orchid-soft px-2 text-oxblood">actually happen</span>.
              </h1>
              <p className="mt-7 max-w-md text-base text-ink-600 sm:text-lg">
                Reldro helps companies discover where AI can improve work, equip employees with the skills to use
                it, and connect teams with specialists to implement it.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/demo" className="rounded-full bg-oxblood px-6 py-3.5 text-sm font-semibold text-white hover:bg-ink-900">
                  Request a demo
                </Link>
                <Link href="#how-it-works" className="rounded-full border border-ink-300 px-6 py-3.5 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                  Explore the platform
                </Link>
              </div>
            </div>
            <div className="relative hidden lg:col-span-5 lg:block">
              <span aria-hidden className="pointer-events-none absolute -right-6 -top-14 select-none font-serif text-[13rem] leading-none text-oxblood/[0.06]">
                01
              </span>
            </div>
          </div>
        </div>

        {/* Hero product visual, offset and layered instead of a browser-chrome mockup */}
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-10">
          <div className="relative mx-auto max-w-4xl">
            <div aria-hidden className="absolute -right-5 -top-5 h-full w-full bg-sage sm:-right-8 sm:-top-8" />
            <figure className="relative -rotate-1 overflow-hidden border border-ink-200 bg-white shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/screenshots/opportunities-matrix.png"
                alt="Reldro's opportunity matrix, plotting AI opportunities by business impact and effort"
                className="w-full"
              />
            </figure>
            <span className="absolute -bottom-5 left-6 inline-flex items-center gap-2 border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 shadow-card sm:left-10">
              <span className="h-1.5 w-1.5 rounded-full bg-sage-deep" />
              The opportunity matrix, live
            </span>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
                Everyone knows they need AI. <span className="font-serif text-orchid-deep">Almost nobody</span>{" "}
                knows how to adopt it.
              </h2>
              <p className="mt-4 max-w-md text-sm text-ink-600">
                Most organizations can buy AI tools. Very few can answer the questions that actually determine
                whether adoption sticks.
              </p>
              <ol className="mt-8 space-y-5 border-t border-ink-200 pt-6">
                {problems.map((p, i) => (
                  <li key={p} className="flex gap-4 text-sm text-ink-700">
                    <span className="shrink-0 font-serif text-ink-300">{String(i + 1).padStart(2, "0")}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="lg:col-span-5 lg:col-start-8">
              <div className="bg-bone p-7 lg:-mt-4">
                <p className="text-xs font-medium uppercase text-ink-500">Example organization</p>
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
                    <div key={label as string} className="bg-white/70 px-3 py-2">
                      <p className="text-ink-500">{label}</p>
                      <p className="text-sm font-semibold text-ink-900">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works / loop */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-xl">
          <p className="font-serif text-orchid-deep">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">The Reldro loop</h2>
          <p className="mt-4 text-sm text-ink-600">
            Every major screen in Reldro reinforces the same loop, so teams keep coming back to it as part of their
            regular work.
          </p>
        </div>
        <div className="mt-16 space-y-10">
          {loopSteps.map((s, i) => (
            <div key={s.step} className={`flex gap-6 border-b border-ink-200 pb-8 last:border-0 last:pb-0 sm:gap-10 ${i % 2 === 1 ? "sm:ml-16" : ""}`}>
              <span className="shrink-0 font-serif text-3xl text-oxblood sm:text-4xl">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="text-lg font-semibold text-ink-900">{s.step}</h3>
                <p className="mt-1.5 max-w-md text-sm text-ink-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bold statement band */}
      <section className="relative overflow-hidden bg-oxblood">
        <span aria-hidden className="pointer-events-none absolute -left-6 -top-20 select-none font-serif text-[16rem] leading-none text-bone/[0.06]">
          "
        </span>
        <div className="relative mx-auto max-w-4xl px-6 py-24">
          <p className="text-3xl font-semibold leading-tight text-bone sm:text-4xl">
            AI adoption fails when nobody owns it. Reldro gives every team{" "}
            <span className="font-serif text-orchid">a plan</span>, a way to learn it, and a number that
            proves it worked.
          </p>
        </div>
      </section>

      {/* Screenshots, as a mosaic instead of uniform mockup cards */}
      <section className="bg-bone/40 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl">
            <p className="font-serif text-orchid-deep">Inside Reldro</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              The whole loop, in one platform
            </h2>
            <p className="mt-4 text-sm text-ink-600">Real screens, real data, from a live Reldro workspace.</p>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
            {screenshots.map((s, i) => (
              <figure
                key={s.src}
                className={`relative overflow-hidden border border-ink-200 bg-white shadow-card ${i === 0 ? "lg:col-span-4" : "lg:col-span-2"} ${i % 2 === 1 ? "-rotate-1" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.alt} className="w-full" loading="lazy" />
                <figcaption className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] border border-ink-200 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-ink-700 shadow-card">
                  {s.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Expert help */}
      <section id="expert-help" className="border-y border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:order-2 lg:col-span-6">
              <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
                When implementation gets complex, bring in a vetted specialist.
              </h2>
              <p className="mt-4 text-sm text-ink-600">
                Request expert help directly from any opportunity or workflow. Our team matches you with a vetted
                AI specialist based on your industry, tech stack, and budget.
              </p>
              <Link href="/demo" className="mt-6 inline-block text-sm font-medium text-orchid-deep hover:text-oxblood">
                See how it works →
              </Link>
            </div>
            <div className="lg:order-1 lg:col-span-6">
              <div className="bg-sage p-6">
                <p className="text-xs font-medium uppercase text-ink-600">Request expert help</p>
                <p className="mt-4 bg-white/70 px-3 py-2 text-sm text-ink-700">
                  "We need help rolling out AI-assisted response drafting across our support team in the next 6
                  weeks."
                </p>
                <div className="mt-5 space-y-3 border-t border-ink-900/10 pt-4">
                  {[
                    "We match you against specialists with relevant industry and tool experience",
                    "A specialist is assigned to a dedicated project workspace",
                    "Track stages, tasks, and deliverables from Discovery through Optimization",
                  ].map((step, i) => (
                    <div key={step} className="flex gap-3 text-xs text-ink-700">
                      <span className="shrink-0 font-serif text-ink-500">{String(i + 1).padStart(2, "0")}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industries, as an index list instead of a card grid */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-xl">
          <p className="font-serif text-orchid-deep">Everywhere AI shows up</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Works across every industry
          </h2>
          <p className="mt-4 text-sm text-ink-600">
            Reldro works the same way across industries. Workflows, learning, and specialists are tailored to
            yours.
          </p>
        </div>
        <div className="mt-14 divide-y divide-ink-200 border-t border-ink-200">
          {industries.map((ind) => (
            <div key={ind.name} className="grid gap-2 py-6 sm:grid-cols-12 sm:items-baseline sm:gap-6">
              <h3 className="font-serif text-lg text-ink-900 sm:col-span-3">{ind.name}</h3>
              <p className="text-sm text-ink-600 sm:col-span-9">{ind.items.join(" · ")}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROI, as a single typographic statement instead of stat cards */}
      <section className="border-y border-ink-200 bg-oxblood/[0.03]">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="font-serif text-orchid-deep">Prove it</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              Measure the return on your AI investment
            </h2>
            <p className="mt-4 text-sm text-ink-600">
              Every workflow and initiative rolls up into a configurable ROI model that tracks investment,
              estimated annual value, and return, broken down by department and workflow.
            </p>
          </div>
          <div className="mt-14 flex flex-wrap items-end gap-x-4 gap-y-6 sm:gap-x-8">
            <div>
              <p className="text-xs uppercase text-ink-500">AI investment</p>
              <p className="mt-1 text-4xl font-semibold text-ink-900 sm:text-5xl">$84,000</p>
            </div>
            <span className="pb-2 font-serif text-3xl text-ink-300">becomes</span>
            <div>
              <p className="text-xs uppercase text-ink-500">Est. annual value</p>
              <p className="mt-1 text-4xl font-semibold text-ink-900 sm:text-5xl">$620,000</p>
            </div>
            <span className="pb-2 font-serif text-3xl text-ink-300">·</span>
            <div>
              <p className="text-xs uppercase text-oxblood">Estimated ROI</p>
              <p className="mt-1 text-4xl font-semibold text-oxblood sm:text-5xl">638%</p>
            </div>
          </div>
          <p className="mt-8 max-w-md text-xs text-ink-400">
            Illustrative example based on demo data. Your ROI model uses your own configurable assumptions.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
          What adoption looks like in practice
        </h2>
        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <div key={t.role} className={i === 1 ? "sm:mt-10" : ""}>
              <span className="font-serif text-5xl text-orchid-deep">"</span>
              <p className="-mt-4 text-base text-ink-800">{t.quote}</p>
              <div className="mt-5 border-t border-ink-200 pt-3">
                <p className="text-xs font-medium text-ink-700">{t.role}</p>
                <p className="text-[11px] text-ink-400">Illustrative example</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <p className="font-serif text-orchid-deep">Sales-led, not tiered</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
                Pricing for your organization
              </h2>
              <p className="mt-4 text-sm text-ink-600">
                Pricing depends on your headcount, departments, and how much of the platform you roll out. Request
                a demo and we'll put together a plan that fits.
              </p>
              <Link
                href="/demo"
                className="mt-8 inline-block rounded-full bg-oxblood px-6 py-3.5 text-sm font-semibold text-white hover:bg-ink-900"
              >
                Request a demo
              </Link>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <ul className="grid gap-4 border-t border-ink-200 pt-6 sm:grid-cols-2">
                {included.map((f) => (
                  <li key={f} className="text-sm text-ink-700">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-oxblood">
        <span aria-hidden className="pointer-events-none absolute -bottom-16 -right-10 select-none font-serif text-[14rem] leading-none text-bone/[0.06] sm:text-[18rem]">
          02
        </span>
        <div className="relative mx-auto max-w-6xl px-6 py-24">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="font-serif text-orchid">Get started</p>
              <h2 className="mt-2 max-w-lg text-3xl font-semibold tracking-tight text-bone sm:text-5xl">
                Ready to see where your organization stands?
              </h2>
              <p className="mt-4 max-w-md text-sm text-bone/70 sm:text-base">
                Run your AI maturity assessment in minutes and get a prioritized opportunity map for your
                organization.
              </p>
            </div>
            <Link
              href="/demo"
              className="inline-block shrink-0 rounded-full bg-bone px-8 py-4 text-sm font-semibold text-oxblood hover:bg-white"
            >
              Request a demo
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
