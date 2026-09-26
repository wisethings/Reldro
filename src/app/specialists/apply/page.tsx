import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { SpecialistApplicationForm } from "@/components/marketing/SpecialistApplicationForm";

export default function SpecialistApplyPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <h1 className="text-3xl font-semibold text-ink-900">Become a Reldro specialist</h1>
            <p className="mt-4 text-sm text-ink-600">
              Reldro matches companies who need hands-on help implementing AI with specialists who've done it before.
              Tell us about your background and we'll reach out about active requests that fit.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-ink-700">
              {[
                "Get matched to expert-help requests in your industry and function",
                "Set your own rates and availability",
                "No cold outreach - companies come to you already scoped",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <SpecialistApplicationForm />
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
