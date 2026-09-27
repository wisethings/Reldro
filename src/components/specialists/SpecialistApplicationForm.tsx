"use client";

import { useActionState } from "react";
import { applyAsSpecialist } from "@/lib/actions/specialistApplication";
import { INDUSTRIES, DEPARTMENT_OPTIONS } from "@/lib/data/catalog";

const ENGAGEMENT_TYPES = [
  { value: "advisory", label: "Strategic advisory" },
  { value: "implementation", label: "Hands-on implementation" },
  { value: "augmentation", label: "Embedded team augmentation" },
];

const inputClass =
  "mt-1 w-full rounded-lg border border-ink-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "block text-xs font-medium text-ink-600";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-ink-200 pt-6 first:border-t-0 first:pt-0">
      <legend className="mb-4 w-full">
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
      </legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

function CheckboxGrid({ name, options }: { name: string; options: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {options.map((opt) => (
        <label key={opt} className="flex items-start gap-2 text-xs text-ink-700">
          <input type="checkbox" name={name} value={opt} className="mt-0.5 rounded border-ink-300" />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

export function SpecialistApplicationForm() {
  const [state, formAction, pending] = useActionState(applyAsSpecialist, undefined);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-card sm:p-10">
        <h2 className="text-lg font-semibold text-ink-900">Application received</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600">
          {state.tempPassword
            ? "Here's a temporary password so you can log in and review your profile while our team takes a look:"
            : "We've emailed you login details so you can review your profile while our team takes a look."}{" "}
          You&apos;ll start showing up as a match once approved.
        </p>
        {state.tempPassword && (
          <p className="mt-4 rounded-lg bg-ink-50 px-4 py-2 font-mono text-sm text-ink-900">{state.tempPassword}</p>
        )}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-2xl border border-ink-200 bg-white p-5 shadow-card sm:space-y-8 sm:p-8"
    >
      {state?.error && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{state.error}</p>}

      <Section title="Contact">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Full name</label>
            <input name="name" required className={inputClass} placeholder="Jordan Lee" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input name="email" type="email" required className={inputClass} placeholder="you@example.com" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Location (optional)</label>
            <input name="location" className={inputClass} placeholder="Austin, TX" />
          </div>
          <div>
            <label className={labelClass}>LinkedIn (optional)</label>
            <input name="linkedinUrl" className={inputClass} placeholder="linkedin.com/in/yourname" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Portfolio or website (optional)</label>
          <input name="portfolioUrl" className={inputClass} placeholder="yoursite.com" />
        </div>
      </Section>

      <Section title="Professional background">
        <div>
          <label className={labelClass}>Headline</label>
          <input name="headline" required className={inputClass} placeholder="AI implementation consultant for finance teams" />
        </div>
        <div>
          <label className={labelClass}>Bio</label>
          <textarea
            name="bio"
            required
            rows={4}
            className={inputClass}
            placeholder="A few sentences on your background and the kind of AI adoption work you do."
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Years of experience</label>
            <input name="yearsExperience" type="number" min={0} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Availability</label>
            <select name="availability" defaultValue="" className={`${inputClass} bg-white`}>
              <option value="" disabled>
                Select
              </option>
              <option>Available now</option>
              <option>2 weeks out</option>
              <option>Booked</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Rates" description="Optional - helps us match you against the right budget.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Hourly rate ($)</label>
            <input name="hourlyRate" type="number" min={0} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Project rate min ($)</label>
            <input name="projectRateMin" type="number" min={0} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Project rate max ($)</label>
            <input name="projectRateMax" type="number" min={0} className={inputClass} />
          </div>
        </div>
      </Section>

      <Section title="Expertise">
        <div>
          <label className={labelClass}>Industries you specialize in</label>
          <div className="mt-2">
            <CheckboxGrid name="industries" options={INDUSTRIES} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Functions you specialize in</label>
          <div className="mt-2">
            <CheckboxGrid name="functions" options={DEPARTMENT_OPTIONS} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Tools you&apos;re strongest with (comma separated)</label>
            <input name="tools" className={inputClass} placeholder="ChatGPT, Copilot, Power BI" />
          </div>
          <div>
            <label className={labelClass}>Certifications (comma separated, optional)</label>
            <input name="certifications" className={inputClass} placeholder="Salesforce Certified Administrator" />
          </div>
        </div>
      </Section>

      <Section title="Engagement preferences" description="Select every model you're open to.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ENGAGEMENT_TYPES.map((t) => (
            <label key={t.value} className="flex items-start gap-2 text-xs text-ink-700">
              <input type="checkbox" name="engagementTypes" value={t.value} className="mt-0.5 rounded border-ink-300" />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Notable work" description="Share 1-2 projects that best show what you can do.">
        <textarea
          name="notableProjects"
          rows={5}
          className={inputClass}
          placeholder="e.g. Led an AI-assisted claims triage rollout for a 300-person insurance carrier, cutting review time 40% in 8 weeks."
        />
      </Section>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-700 px-4 py-3 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
