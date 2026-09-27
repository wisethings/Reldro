import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PhotoObject } from "@/components/marketing/PhotoObject";
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
  { src: "/screenshots/analytics.png", alt: "Analytics page showing adoption over time and by department", caption: "Adoption over time, by department" },
  { src: "/screenshots/roi.png", alt: "ROI page showing real captured value and value by department", caption: "Value captured, by department" },
];

const testimonials = [
  {
    quote: "We finally know which teams need training versus which need a specialist.",
    name: "Priya Shah",
    role: "Head of People, consumer products company",
    photo: "/portraits/portrait-2.webp",
  },
  {
    quote: "The opportunity matrix turned a vague AI mandate into a prioritized backlog.",
    name: "Marcus Bennett",
    role: "COO, professional services firm",
    photo: "/portraits/portrait-3.webp",
  },
  {
    quote: "Adoption analytics gave us the ammunition to keep investing in this.",
    name: "Sofia Rossi",
    role: "CIO, financial services company",
    photo: "/portraits/portrait-4.webp",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-white">
      <MarketingNav />

      {/* Hero — large asymmetric statement, portrait as a physical object rather than a UI mockup */}
      <section className="relative border-b border-ink-200 bg-white">
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 sm:pt-28">
          <div className="grid gap-16 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <p className="font-serif text-lg text-orchid-deep">AI adoption operating system</p>
              <h1 className="mt-4 max-w-xl text-6xl font-semibold leading-[0.96] text-ink-900 sm:text-7xl lg:text-[5.5rem]">
                Make AI adoption <span className="bg-orchid-soft px-2 text-oxblood">actually happen</span>.
              </h1>
              <p className="mt-8 max-w-sm text-base text-ink-600 sm:text-lg">
                Reldro helps companies discover where AI can improve work, equip employees with the skills to use
                it, and connect teams with specialists to implement it.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link href="/demo" className="rounded-full bg-oxblood px-6 py-3.5 text-sm font-semibold text-white hover:bg-ink-900">
                  Request a demo
                </Link>
                <Link href="#how-it-works" className="rounded-full border border-ink-300 px-6 py-3.5 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                  Explore the platform
                </Link>
              </div>
            </div>

            <div className="relative lg:col-span-5">
              <span aria-hidden className="pointer-events-none absolute -left-6 -top-16 hidden select-none font-serif text-[11rem] leading-none text-oxblood/[0.06] lg:block">
                01
              </span>
              <PhotoObject
                src="/portraits/portrait-1.webp"
                alt="An employee at work, representing a team member adopting AI-assisted workflows in Reldro"
                edge="right"
                tone="sage"
                rotate="lg:rotate-1"
                caption={{ name: "Every team member, equipped", role: "Not just the early adopters" }}
                className="mx-auto aspect-[4/5] w-full max-w-sm lg:mx-0 lg:-mr-6 lg:mt-2 lg:max-w-none"
              />
            </div>
          </div>
        </div>

        {/* Product visual, cropped and offset rather than centered in a browser-chrome mockup */}
        <div className="relative mx-auto max-w-6xl px-6 pb-24">
          <div className="relative ml-auto max-w-3xl lg:mr-10">
            <div aria-hidden className="absolute -left-5 -top-5 h-full w-full bg-olive-soft sm:-left-8 sm:-top-8" />
            <figure className="relative -rotate-1 overflow-hidden border border-ink-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/screenshots/opportunities-matrix.png"
                alt="Reldro's opportunity matrix, plotting AI opportunities by business impact and effort"
                className="w-full"
              />
            </figure>
            <span className="absolute -bottom-5 left-6 inline-flex items-center gap-2 border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-sage-deep" />
              The opportunity matrix, live
            </span>
          </div>
        </div>
      </section>

      {/* Problem, paired with a plain (not card-boxed) score readout and a cropped portrait fragment */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-6">
              <h2 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
                Everyone knows they need AI. <span className="font-serif text-orchid-deep">Almost nobody</span>{" "}
                knows how to adopt it.
              </h2>
              <p className="mt-5 max-w-md text-sm text-ink-600 sm:text-base">
                Most organizations can buy AI tools. Very few can answer the questions that actually determine
                whether adoption sticks.
              </p>
              <ol className="mt-10 space-y-5 border-t border-ink-200 pt-6">
                {problems.map((p, i) => (
                  <li key={p} className="flex gap-4 text-sm text-ink-700 sm:text-base">
                    <span className="shrink-0 font-serif text-ink-300">{String(i + 1).padStart(2, "0")}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="relative lg:col-span-5 lg:col-start-8">
              <p className="text-xs font-medium uppercase text-ink-500">Example organization</p>
              <div className="mt-5 flex items-center gap-6">
                <ScoreRing value={54} label="/ 100" />
                <div>
                  <p className="text-lg font-semibold text-ink-900">AI Adoption Score</p>
                  <p className="text-sm text-ink-500">Havenbrook · 318 employees</p>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-ink-200 pt-6 text-sm">
                {[
                  ["AI literacy", 72],
                  ["AI usage", 43],
                  ["Workflow integration", 38],
                  ["Governance", 67],
                  ["Measurement", 29],
                  ["Leadership adoption", 61],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-ink-500">{label}</p>
                    <p className="text-xl font-semibold text-ink-900">{value}</p>
                  </div>
                ))}
              </div>
              <PhotoObject
                src="/portraits/portrait-2.webp"
                alt="An operations leader reviewing AI adoption results"
                edge="bottom"
                tone="olive"
                rotate="-rotate-2"
                className="mt-12 ml-auto aspect-[3/4] w-40 sm:w-48"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works / loop — oversized serial numbers as the visual anchor */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="max-w-xl">
          <p className="font-serif text-orchid-deep">How it works</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">The Reldro loop</h2>
          <p className="mt-5 text-sm text-ink-600 sm:text-base">
            Every major screen in Reldro reinforces the same loop, so teams keep coming back to it as part of their
            regular work.
          </p>
        </div>
        <div className="mt-20 space-y-14">
          {loopSteps.map((s, i) => (
            <div
              key={s.step}
              className={`flex items-start gap-6 border-b border-ink-200 pb-12 last:border-0 last:pb-0 sm:gap-10 ${i % 2 === 1 ? "sm:ml-24" : ""}`}
            >
              <span className="shrink-0 font-serif text-6xl leading-none text-oxblood sm:text-7xl">{String(i + 1).padStart(2, "0")}</span>
              <div className="pt-2">
                <h3 className="text-xl font-semibold text-ink-900 sm:text-2xl">{s.step}</h3>
                <p className="mt-2 max-w-md text-sm text-ink-600 sm:text-base">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bold statement band, with a cropped portrait bleeding in from the edge */}
      <section className="relative overflow-hidden bg-oxblood">
        <span aria-hidden className="pointer-events-none absolute -left-6 -top-20 select-none font-serif text-[16rem] leading-none text-bone/[0.06]">
          "
        </span>
        <div aria-hidden className="pointer-events-none absolute -right-16 bottom-0 hidden w-64 opacity-[0.14] mix-blend-luminosity sm:block lg:w-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/portraits/portrait-3.webp" alt="" className="w-full grayscale" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 py-24 sm:py-32">
          <p className="max-w-2xl text-3xl font-semibold leading-tight text-bone sm:text-4xl">
            AI adoption fails when nobody owns it. Reldro gives every team{" "}
            <span className="font-serif text-orchid">a plan</span>, a way to learn it, and a number that
            proves it worked.
          </p>
        </div>
      </section>

      {/* Screenshots, as an asymmetric mosaic with one image breaking full-bleed */}
      <section className="bg-bone/40 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl">
            <p className="font-serif text-orchid-deep">Inside Reldro</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              The whole loop, in one platform
            </h2>
            <p className="mt-5 text-sm text-ink-600 sm:text-base">Real screens, real data, from a live Reldro workspace.</p>
          </div>
        </div>

        {/* full-bleed: escapes the max-w container on both sides */}
        <div className="relative mx-[calc(50%-50vw)] mt-14 w-screen overflow-hidden">
          <figure className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={screenshots[0].src} alt={screenshots[0].alt} className="w-full" loading="lazy" />
            <figcaption className="absolute bottom-4 left-6 border border-ink-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-ink-700 shadow-card sm:left-12">
              {screenshots[0].caption}
            </figcaption>
          </figure>
        </div>

        <div className="mx-auto mt-8 max-w-6xl px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {screenshots.slice(1).map((s, i) => (
              <figure
                key={s.src}
                className={`relative overflow-hidden border border-ink-200 bg-white shadow-card ${i === 1 ? "sm:mt-10" : ""}`}
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

      {/* Expert help — specialist portrait as the lead visual, request card layered beneath/beside it */}
      <section id="expert-help" className="border-y border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid gap-16 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-6">
              <h2 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
                When implementation gets complex, bring in a vetted specialist.
              </h2>
              <p className="mt-5 max-w-md text-sm text-ink-600 sm:text-base">
                Request expert help directly from any opportunity or workflow. Our team matches you with a vetted
                AI specialist based on your industry, tech stack, and budget.
              </p>
              <Link href="/demo" className="mt-6 inline-block text-sm font-medium text-orchid-deep hover:text-oxblood">
                See how it works →
              </Link>

              <div className="mt-14 max-w-sm border-t border-ink-200 pt-6">
                <p className="bg-sage px-4 py-3 text-sm text-ink-800">
                  "We need help rolling out AI-assisted response drafting across our support team in the next 6
                  weeks."
                </p>
                <div className="mt-5 space-y-3">
                  {[
                    "We match you against specialists with relevant industry and tool experience",
                    "A specialist is assigned to a dedicated project workspace",
                    "Track stages, tasks, and deliverables from Discovery through Optimization",
                  ].map((step, i) => (
                    <div key={step} className="flex gap-3 text-xs text-ink-700 sm:text-sm">
                      <span className="shrink-0 font-serif text-ink-400">{String(i + 1).padStart(2, "0")}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 lg:col-start-8">
              <PhotoObject
                src="/portraits/portrait-5.webp"
                alt="A vetted AI implementation specialist available through Reldro's expert help network"
                edge="left"
                tone="orchid"
                rotate="-rotate-1"
                caption={{ name: "Matched to your industry", role: "Not a generic consultant bench" }}
                className="aspect-[4/5] w-full max-w-sm lg:ml-auto lg:max-w-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Industries, as an index list instead of a card grid */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="max-w-xl">
          <p className="font-serif text-orchid-deep">Everywhere AI shows up</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            Works across every industry
          </h2>
          <p className="mt-5 text-sm text-ink-600 sm:text-base">
            Reldro works the same way across industries. Workflows, learning, and specialists are tailored to
            yours.
          </p>
        </div>
        <div className="mt-16 divide-y divide-ink-200 border-t border-ink-200">
          {industries.map((ind) => (
            <div key={ind.name} className="grid gap-2 py-7 sm:grid-cols-12 sm:items-baseline sm:gap-6">
              <h3 className="font-serif text-xl text-ink-900 sm:col-span-3">{ind.name}</h3>
              <p className="text-sm text-ink-600 sm:col-span-9 sm:text-base">{ind.items.join(" · ")}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROI — the numbers themselves are the visual, not a stat card */}
      <section className="border-y border-ink-200 bg-oxblood/[0.03]">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="max-w-2xl">
            <p className="font-serif text-orchid-deep">Prove it</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              Measure the return on your AI investment
            </h2>
            <p className="mt-5 text-sm text-ink-600 sm:text-base">
              Every workflow and initiative rolls up into a configurable ROI model that tracks investment,
              estimated annual value, and return, broken down by department and workflow.
            </p>
          </div>
          <div className="mt-20 flex flex-col gap-10 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-12 sm:gap-y-10">
            <div>
              <p className="text-xs uppercase text-ink-500">AI investment</p>
              <p className="mt-2 text-6xl font-semibold leading-none text-ink-900 sm:text-7xl">$84,000</p>
            </div>
            <span className="font-serif text-3xl text-ink-300 sm:pb-3">becomes</span>
            <div>
              <p className="text-xs uppercase text-ink-500">Est. annual value</p>
              <p className="mt-2 text-6xl font-semibold leading-none text-ink-900 sm:text-7xl">$620,000</p>
            </div>
          </div>
          <div className="mt-10 border-t border-ink-200 pt-10">
            <p className="text-xs uppercase text-oxblood">Estimated ROI</p>
            <p className="mt-2 text-8xl font-semibold leading-none text-oxblood sm:text-9xl">638%</p>
          </div>
          <p className="mt-10 max-w-md text-xs text-ink-400">
            Illustrative example based on demo data. Your ROI model uses your own configurable assumptions.
          </p>
        </div>
      </section>

      {/* Testimonials — a wall of quotes with portraits treated as physical objects, staggered asymmetrically */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <h2 className="max-w-xl text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
          What adoption looks like in practice
        </h2>
        <div className="mt-20 grid gap-16 sm:grid-cols-12">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`sm:col-span-4 ${i === 1 ? "sm:mt-16" : ""} ${i === 2 ? "sm:mt-6" : ""}`}
            >
              <PhotoObject
                src={t.photo}
                alt={`${t.name}, ${t.role}`}
                edge={i % 2 === 0 ? "right" : "left"}
                tone={i === 0 ? "sage" : i === 1 ? "olive" : "orchid"}
                rotate={i % 2 === 0 ? "-rotate-1" : "rotate-1"}
                className="aspect-square w-32"
              />
              <span className="mt-6 block font-serif text-4xl text-orchid-deep">"</span>
              <p className="-mt-3 text-base text-ink-800">{t.quote}</p>
              <div className="mt-5 border-t border-ink-200 pt-3">
                <p className="text-xs font-medium text-ink-700">{t.name}</p>
                <p className="text-[11px] text-ink-400">{t.role} · Illustrative example</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <p className="font-serif text-orchid-deep">Sales-led, not tiered</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
                Pricing for your organization
              </h2>
              <p className="mt-5 text-sm text-ink-600 sm:text-base">
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
                  <li key={f} className="text-sm text-ink-700 sm:text-base">
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
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
            <div>
              <p className="font-serif text-orchid">Get started</p>
              <h2 className="mt-2 max-w-lg text-4xl font-semibold tracking-tight text-bone sm:text-6xl">
                Ready to see where your organization stands?
              </h2>
              <p className="mt-5 max-w-md text-sm text-bone/70 sm:text-base">
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
