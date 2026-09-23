"use client";

import { useActionState } from "react";
import { provisionOrganization } from "@/lib/actions/platform-admin";

const SIZES = ["1-50", "51-200", "201-1000", "1000+"];

export function ProvisionOrgForm({
  demoRequestId,
  defaultCompanyName,
  defaultAdminEmail,
  defaultAdminName,
  onDone,
}: {
  demoRequestId?: string;
  defaultCompanyName?: string;
  defaultAdminEmail?: string;
  defaultAdminName?: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(provisionOrganization, undefined);

  if (state?.emailSent || state?.tempPassword) {
    return (
      <div className="rounded-lg border border-sage bg-sage/20 p-4 text-sm text-sage-deep">
        <p className="font-medium">Workspace created.</p>
        {state.emailSent ? (
          <p className="mt-1">An invite email with a temporary password was sent to the new admin.</p>
        ) : (
          <p className="mt-1">
            Email isn't configured in this environment - share this temporary password directly: <span className="font-mono font-semibold">{state.tempPassword}</span>
          </p>
        )}
        {onDone && (
          <button onClick={onDone} className="mt-3 text-xs font-medium text-orchid-deep hover:text-oxblood">
            Done
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      {demoRequestId && <input type="hidden" name="demoRequestId" value={demoRequestId} />}
      {state?.error && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-ink-600">Company name</label>
          <input
            name="companyName"
            required
            defaultValue={defaultCompanyName}
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Industry</label>
          <input
            name="industry"
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Insurance"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Company size</label>
          <select
            name="size"
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Not set</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s} employees
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Geography</label>
          <input
            name="geography"
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="North America"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Admin name</label>
          <input
            name="adminName"
            required
            defaultValue={defaultAdminName}
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Admin email</label>
          <input
            name="adminEmail"
            type="email"
            required
            defaultValue={defaultAdminEmail}
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}
