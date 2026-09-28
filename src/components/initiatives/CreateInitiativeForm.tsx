"use client";

import { useActionState, useState } from "react";
import { createInitiative } from "@/lib/actions/initiatives";
import { Field, FieldGrid, Input, Textarea } from "@/components/ui/Field";

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
      <FieldGrid columns={2}>
        <Field label="Initiative name" required>
          <Input name="name" required placeholder="e.g. AI-first claims processing" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" required>
            <Input name="startDate" type="date" required />
          </Field>
          <Field label="Target end date" required>
            <Input name="endDate" type="date" required />
          </Field>
        </div>
      </FieldGrid>

      <Field label="Goal" required>
        <Textarea name="goalDescription" required rows={2} placeholder="What this initiative is trying to achieve" />
      </Field>

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
            <div key={i} className="grid grid-cols-2 gap-2 rounded-md border border-ink-100 p-2 sm:grid-cols-[2fr_1fr_1fr_1fr]">
              <Input name="kpiLabel" placeholder="Metric (e.g. Hours saved per week)" className="col-span-2 sm:col-span-1" />
              <Input name="kpiBaseline" type="number" placeholder="Baseline" />
              <Input name="kpiTarget" type="number" placeholder="Target" />
              <Input name="kpiUnit" placeholder="Unit (%, hrs...)" />
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
