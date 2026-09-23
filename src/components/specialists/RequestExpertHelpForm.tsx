"use client";

import { useState, useTransition } from "react";
import { requestExpertHelp } from "@/lib/actions/marketplace";

const ENGAGEMENT_MODELS = [
  { value: "unsure", label: "Not sure yet" },
  { value: "advisory", label: "Strategic advisory" },
  { value: "implementation", label: "Hands-on implementation" },
  { value: "augmentation", label: "Embedded team augmentation" },
];

const URGENCY_LEVELS = [
  { value: "exploratory", label: "Exploratory — just scoping" },
  { value: "planned", label: "Planned initiative (next quarter)" },
  { value: "time_sensitive", label: "Time-sensitive (this month)" },
  { value: "urgent", label: "Urgent" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RequestExpertHelpForm({
  opportunityId,
  workflowId,
}: {
  opportunityId?: string;
  workflowId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [objective, setObjective] = useState("");
  const [challenges, setChallenges] = useState("");
  const [engagementModel, setEngagementModel] = useState("unsure");
  const [urgency, setUrgency] = useState("planned");
  const [timeline, setTimeline] = useState("");
  const [budget, setBudget] = useState("");
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccDraft, setCcDraft] = useState("");
  const [ccError, setCcError] = useState<string | null>(null);
  const [result, setResult] = useState<{ emailSent: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function addCcEmail() {
    const email = ccDraft.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) return setCcError("That doesn't look like a valid email address.");
    if (ccEmails.includes(email)) return setCcError("That email is already in the list.");
    setCcEmails([...ccEmails, email]);
    setCcDraft("");
    setCcError(null);
  }

  if (result) {
    return (
      <div className="rounded-lg border border-sage bg-sage p-4 text-sm text-sage-deep">
        <p className="font-medium">Request received.</p>
        <p className="mt-1">
          {result.emailSent
            ? "We've emailed you a copy of the details."
            : "Our team will review the details you shared."}{" "}
          Expect us to reach out by email within one business day to discuss next steps and match you with a
          specialist.
          {ccEmails.length > 0 && ` We'll keep ${ccEmails.join(", ")} looped in too.`}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
      >
        Request expert help
      </button>
    );
  }

  const canSubmit = objective.trim().length > 0 && challenges.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        startTransition(async () => {
          const res = await requestExpertHelp({
            opportunityId,
            workflowId,
            objective,
            challenges,
            engagementModel,
            urgency,
            timeline: timeline || undefined,
            budget: budget ? Number(budget) : undefined,
            ccEmails,
          });
          setResult({ emailSent: res.emailSent });
        });
      }}
      className="space-y-4 rounded-lg border border-ink-200 p-4"
    >
      <div>
        <label className="block text-xs font-medium text-ink-600">What outcome are you trying to achieve?</label>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          required
          rows={2}
          placeholder="e.g. Cut proposal turnaround from 5 days to 1 without adding headcount"
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-600">What's the current situation, and what's blocking you?</label>
        <textarea
          value={challenges}
          onChange={(e) => setChallenges(e.target.value)}
          required
          rows={3}
          placeholder="Describe today's process, why it's not working, and any constraints (data, tools, stakeholders)…"
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-ink-600">Preferred engagement model</label>
          <select
            value={engagementModel}
            onChange={(e) => setEngagementModel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {ENGAGEMENT_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Urgency</label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {URGENCY_LEVELS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-ink-600">Target timeline (optional)</label>
          <input
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            placeholder="e.g. 6 weeks"
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Estimated budget (optional)</label>
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 10000"
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-600">Who else should we loop in?</label>
        <p className="mt-0.5 text-xs text-ink-400">We'll email you when we're ready to talk — add teammates or stakeholders to CC on that thread.</p>
        <div className="mt-2 flex gap-2">
          <input
            type="email"
            value={ccDraft}
            onChange={(e) => { setCcDraft(e.target.value); setCcError(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addCcEmail(); }
            }}
            placeholder="name@company.com"
            className="flex-1 rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={addCcEmail}
            className="shrink-0 rounded-lg border border-ink-300 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50"
          >
            + Add email
          </button>
        </div>
        {ccError && <p className="mt-1 text-xs text-oxblood">{ccError}</p>}
        {ccEmails.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {ccEmails.map((email) => (
              <li key={email} className="flex items-center gap-1.5 rounded-full bg-ink-100 py-1 pl-3 pr-1.5 text-xs text-ink-700">
                {email}
                <button
                  type="button"
                  onClick={() => setCcEmails(ccEmails.filter((e) => e !== email))}
                  aria-label={`Remove ${email}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-ink-400 hover:bg-ink-200 hover:text-ink-700"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send request"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
