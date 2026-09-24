"use client";

import { useActionState, useState } from "react";
import { createInitiative } from "@/lib/actions/initiatives";

const inputClass =
  "w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600">{label}</label>
      {hint && <p className="text-[11px] text-ink-400">{hint}</p>}
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function CreateInitiativeForm({
  departmentOptions,
  employeeOptions,
}: {
  departmentOptions: string[];
  employeeOptions: { id: string; name: string; department: string }[];
}) {
  const [state, formAction, pending] = useActionState(createInitiative, undefined);
  const [kpiCount, setKpiCount] = useState(1);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Initiative name">
        <input name="name" required placeholder="e.g. AI-first claims processing" className={inputClass} />
      </Field>

      <Field label="Goal">
        <textarea name="goalDescription" required rows={2} placeholder="What this initiative is trying to achieve" className={inputClass} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Start date">
          <input name="startDate" type="date" required className={inputClass} />
        </Field>
        <Field label="Target end date">
          <input name="endDate" type="date" required className={inputClass} />
        </Field>
      </div>

      {departmentOptions.length > 0 && (
        <Field label="Departments involved">
          <div className="flex flex-wrap gap-3">
            {departmentOptions.map((d) => (
              <label key={d} className="flex items-center gap-1.5 text-xs text-ink-700">
                <input type="checkbox" name="departments" value={d} />
                {d}
              </label>
            ))}
          </div>
        </Field>
      )}

      {employeeOptions.length > 0 && (
        <Field label="Team members" hint="Who's driving this initiative">
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-ink-200 p-2">
            {employeeOptions.map((e) => (
              <label key={e.id} className="flex items-center gap-1.5 text-xs text-ink-700">
                <input type="checkbox" name="memberIds" value={e.id} />
                {e.name} <span className="text-ink-400">· {e.department}</span>
              </label>
            ))}
          </div>
        </Field>
      )}

      <div className="rounded-lg border border-ink-200 p-3">
        <p className="text-xs font-medium text-ink-700">KPIs</p>
        <p className="text-[11px] text-ink-400">What success looks like, measured over the initiative's timeline.</p>
        <div className="mt-2 space-y-2">
          {Array.from({ length: kpiCount }).map((_, i) => (
            <div key={i} className="space-y-1.5 rounded-md border border-ink-100 p-2">
              <input name="kpiLabel" placeholder="Metric (e.g. Hours saved per week)" className={inputClass} />
              <div className="grid grid-cols-3 gap-2">
                <input name="kpiBaseline" type="number" placeholder="Baseline" className={inputClass} />
                <input name="kpiTarget" type="number" placeholder="Target" className={inputClass} />
                <input name="kpiUnit" placeholder="Unit (%, hrs...)" className={inputClass} />
              </div>
            </div>
          ))}
        </div>
        {kpiCount < 4 && (
          <button
            type="button"
            onClick={() => setKpiCount((n) => Math.min(4, n + 1))}
            className="mt-2 text-xs font-medium text-orchid-deep hover:text-oxblood"
          >
            + Add another KPI
          </button>
        )}
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create initiative"}
      </button>
    </form>
  );
}
