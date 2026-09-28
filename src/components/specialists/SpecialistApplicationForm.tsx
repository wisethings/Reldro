"use client";

import { useActionState } from "react";
import { applyAsSpecialist } from "@/lib/actions/specialistApplication";
import { INDUSTRIES, DEPARTMENT_OPTIONS } from "@/lib/data/catalog";
import { Field, FieldGrid, Input, Select, Textarea } from "@/components/ui/Field";

const ENGAGEMENT_TYPES = [
  { value: "advisory", label: "Strategic advisory" },
  { value: "implementation", label: "Hands-on implementation" },
  { value: "augmentation", label: "Embedded team augmentation" },
];

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
        <FieldGrid columns={2}>
          <Field label="Full name" required>
            <Input name="name" required placeholder="Jordan Lee" />
          </Field>
          <Field label="Email" required>
            <Input name="email" type="email" required placeholder="you@example.com" />
          </Field>
        </FieldGrid>
        <FieldGrid columns={3}>
          <Field label="Location" optional>
            <Input name="location" placeholder="Austin, TX" />
          </Field>
          <Field label="LinkedIn" optional>
            <Input name="linkedinUrl" placeholder="linkedin.com/in/yourname" />
          </Field>
          <Field label="Portfolio or website" optional>
            <Input name="portfolioUrl" placeholder="yoursite.com" />
          </Field>
        </FieldGrid>
      </Section>

      <Section title="Professional background">
        <Field label="Headline" required>
          <Input name="headline" required placeholder="AI implementation consultant for finance teams" />
        </Field>
        <Field label="Bio" required>
          <Textarea name="bio" required rows={4} placeholder="A few sentences on your background and the kind of AI adoption work you do." />
        </Field>
        <FieldGrid columns={2}>
          <Field label="Years of experience" required>
            <Input name="yearsExperience" type="number" min={0} required />
          </Field>
          <Field label="Availability">
            <Select name="availability" defaultValue="">
              <option value="" disabled>
                Select
              </option>
              <option>Available now</option>
              <option>2 weeks out</option>
              <option>Booked</option>
            </Select>
          </Field>
        </FieldGrid>
      </Section>

      <Section title="Rates" description="Optional - helps us match you against the right budget.">
        <FieldGrid columns={3}>
          <Field label="Hourly rate ($)" optional>
            <Input name="hourlyRate" type="number" min={0} />
          </Field>
          <Field label="Project rate min ($)" optional>
            <Input name="projectRateMin" type="number" min={0} />
          </Field>
          <Field label="Project rate max ($)" optional>
            <Input name="projectRateMax" type="number" min={0} />
          </Field>
        </FieldGrid>
      </Section>

      <Section title="Expertise">
        <Field label="Industries you specialize in">
          <CheckboxGrid name="industries" options={INDUSTRIES} />
        </Field>
        <Field label="Functions you specialize in">
          <CheckboxGrid name="functions" options={DEPARTMENT_OPTIONS} />
        </Field>
        <FieldGrid columns={2}>
          <Field label="Tools you're strongest with" hint="Comma separated">
            <Input name="tools" placeholder="ChatGPT, Copilot, Power BI" />
          </Field>
          <Field label="Certifications" hint="Comma separated" optional>
            <Input name="certifications" placeholder="Salesforce Certified Administrator" />
          </Field>
        </FieldGrid>
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
        <Textarea
          name="notableProjects"
          rows={5}
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
