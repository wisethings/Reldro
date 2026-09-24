import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { DemoRequestForm } from "@/components/marketing/DemoRequestForm";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <h1 className="text-3xl font-semibold text-ink-900">See Reldro in action</h1>
            <p className="mt-4 text-sm text-ink-600">
              Tell us about your organization. We'll set up a walkthrough tailored to where your teams actually are
              with AI adoption, then get your workspace ready.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-ink-700">
              {[
                "A live look at your organization's AI Adoption Score model",
                "How Learn, Simulations, and workflows fit your actual departments",
                "What it takes to move from experimentation to measured adoption",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <DemoRequestForm />
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
