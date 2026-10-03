"use client";

import { useActionState, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { saveKpiTargets } from "@/lib/actions/safetySettings";
import { DEFAULT_TARGETS, type Targets } from "@/lib/safety/metrics";
import { DATASETS } from "@/lib/safety/exportSpec";
import { Field, Input, Select } from "@/components/ui/Field";
import { AdaptiveSelect } from "@/components/ui/PersonSelect";
import { Spinner } from "@/components/ui/Spinner";
import { btnPrimary, btnSecondary } from "@/components/ui/FormParts";

/** Switches the whole page between all sites and one site, keeping the period and tab. */
export function SiteScope({ sites, value }: { sites: { id: string; name: string }[]; value: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <AdaptiveSelect
      variant="toolbar"
      aria-label="Site"
      noun="site"
      value={value}
      pinned={[{ value: "", label: "All sites" }]}
      options={sites.map((s) => ({ value: s.id, label: s.name }))}
      onChange={(id) => {
        const next = new URLSearchParams(sp.toString());
        if (id) next.set("site", id); else next.delete("site");
        const s = next.toString();
        router.replace(s ? `${path}?${s}` : path, { scroll: false });
      }}
      className="w-full min-w-[10rem] sm:w-56"
    />
  );
}

const TARGET_FIELDS: { key: keyof Targets; label: string; unit: string; hint: string }[] = [
  { key: "ackHours", label: "Time to acknowledge a report", unit: "hours, at most", hint: "Median, from report to first acknowledgement." },
  { key: "responsePct", label: "Reports acknowledged by their deadline", unit: "%, at least", hint: "Deadlines come from your escalation rules." },
  { key: "overdueActions", label: "Overdue corrective actions", unit: "at most", hint: "Open actions past their due date." },
  { key: "actionOnTimePct", label: "Actions finished by their due date", unit: "%, at least", hint: "Of the actions that fell due in the period." },
  { key: "inspectionOnTimePct", label: "Inspections done by their due date", unit: "%, at least", hint: "Of the inspections that fell due in the period." },
  { key: "talkAckPct", label: "Toolbox talks acknowledged", unit: "%, at least", hint: "Of the people each talk was for." },
  { key: "certPct", label: "Required certifications held and in date", unit: "%, at least", hint: "Expiring soon still counts as held." },
];

/** Company admins set the bar their own numbers are judged against. Blank fields use the default. */
export function TargetsForm({ saved }: { saved: Partial<Targets> }) {
  const [state, formAction, pending] = useActionState(saveKpiTargets, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {TARGET_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} hint={`${f.hint} Blank uses ${DEFAULT_TARGETS[f.key]}.`}>
            <div className="flex items-center gap-2">
              <Input name={f.key} inputMode="decimal" defaultValue={saved[f.key] ?? ""} placeholder={String(DEFAULT_TARGETS[f.key])} className="max-w-[7rem]" />
              <span className="text-xs text-ink-500">{f.unit}</span>
            </div>
          </Field>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>{pending ? <><Spinner /> Saving…</> : "Save targets"}</button>
        {state?.success && <span role="status" className="text-sm text-sage-deep">{state.success}</span>}
        {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}

/** Pick a dataset and the columns you want; the file is built from the current site and period. */
export function ExportPanel({ siteId, siteName, days }: { siteId: string | null; siteName: string | null; days: number }) {
  const [dataset, setDataset] = useState(DATASETS[0].key);
  const spec = DATASETS.find((d) => d.key === dataset)!;
  const [picked, setPicked] = useState<Record<string, string[]>>(() => Object.fromEntries(DATASETS.map((d) => [d.key, d.columns.filter((c) => c.on).map((c) => c.key)])));
  const cols = picked[dataset];
  const href = useMemo(() => {
    const q = new URLSearchParams({ dataset, days: String(days), cols: cols.join(",") });
    if (siteId) q.set("site", siteId);
    return `/api/safety/export/data?${q.toString()}`;
  }, [dataset, days, cols, siteId]);
  const toggle = (key: string) => setPicked((p) => ({ ...p, [dataset]: p[dataset].includes(key) ? p[dataset].filter((k) => k !== key) : [...p[dataset], key] }));
  return (
    <div className="space-y-4">
      <Field label="What to export" hint={`${spec.hint} ${siteName ? `Limited to ${siteName}.` : "Covers all sites."}`}>
        <Select value={dataset} onChange={(e) => setDataset(e.target.value)}>
          {DATASETS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </Select>
      </Field>
      <fieldset>
        <legend className="text-xs font-semibold text-ink-800">Columns</legend>
        <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {spec.columns.map((c) => (
            <label key={c.key} className="flex min-h-9 items-center gap-2 text-sm text-ink-800">
              <input type="checkbox" checked={cols.includes(c.key)} onChange={() => toggle(c.key)} className="h-4 w-4" />
              {c.label}
            </label>
          ))}
        </div>
        {dataset === "reports" && <p className="mt-2 text-xs text-ink-500">Titles and descriptions are exported as written, so they can contain names people typed. Reporter names are never included.</p>}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <a href={cols.length ? href : undefined} aria-disabled={!cols.length} download className={`${btnPrimary} inline-flex items-center gap-2 ${cols.length ? "" : "pointer-events-none opacity-50"}`}><Download size={15} aria-hidden /> Download CSV</a>
        <button type="button" className={btnSecondary} onClick={() => setPicked((p) => ({ ...p, [dataset]: spec.columns.map((c) => c.key) }))}>Select all</button>
        <button type="button" className={btnSecondary} onClick={() => setPicked((p) => ({ ...p, [dataset]: spec.columns.filter((c) => c.on).map((c) => c.key) }))}>Reset</button>
      </div>
    </div>
  );
}
