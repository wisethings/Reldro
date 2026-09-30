"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeReport, assignReport, setReportStatus, updateTriage } from "@/lib/actions/safetyReports";
import { startInvestigation } from "@/lib/actions/safetyInvestigations";
import { Select } from "@/components/ui/Field";
import { useAct } from "./useAct";

type Opt = { key: string; label: string };

export function ReportControls({
  reportId,
  status,
  severity,
  severityConfirmed,
  category,
  ownerId,
  acknowledged,
  hasInvestigation,
  isSafetyTeam,
  people,
  severities,
  categories,
}: {
  reportId: string;
  status: string;
  severity: string;
  severityConfirmed: boolean;
  category: string;
  ownerId: string | null;
  acknowledged: boolean;
  hasInvestigation: boolean;
  isSafetyTeam: boolean;
  people: { id: string; name: string }[];
  severities: Opt[];
  categories: Opt[];
}) {
  const { run, pending, error } = useAct();
  const router = useRouter();
  const [owner, setOwner] = useState(ownerId ?? "");

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {!acknowledged && (
          <button disabled={pending} onClick={() => run(() => acknowledgeReport(reportId))} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">
            Acknowledge report
          </button>
        )}
        {!hasInvestigation && status !== "CLOSED" && (
          <button
            disabled={pending}
            onClick={() => run(async () => { const id = await startInvestigation(reportId); router.push(`/dashboard/investigations/${id}`); })}
            className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50 disabled:opacity-50"
          >
            Open investigation
          </button>
        )}
        {status !== "CLOSED" ? (
          <button disabled={pending} onClick={() => run(() => setReportStatus(reportId, "CLOSED"))} className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50 disabled:opacity-50">
            Close report
          </button>
        ) : (
          <button disabled={pending} onClick={() => run(() => setReportStatus(reportId, "ASSIGNED"))} className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50 disabled:opacity-50">
            Reopen
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {isSafetyTeam && (
          <label className="block text-xs font-medium text-ink-600">
            Owner
            <Select
              value={owner}
              disabled={pending}
              onChange={(e) => { setOwner(e.target.value); run(() => assignReport(reportId, e.target.value || null)); }}
              className="mt-1"
            >
              <option value="">Unassigned</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </label>
        )}
        <div>
          <label className="block text-xs font-medium text-ink-600">
            Seriousness {severityConfirmed ? "(confirmed)" : "(suggested, not yet confirmed)"}
            <Select value={severity} disabled={pending} onChange={(e) => run(() => updateTriage(reportId, { severity: e.target.value }))} className="mt-1">
              {severities.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </Select>
          </label>
          {!severityConfirmed && (
            <button disabled={pending} onClick={() => run(() => updateTriage(reportId, { severity }))} className="mt-1.5 text-xs font-medium text-orchid-deep hover:text-oxblood disabled:opacity-40">
              Confirm this level
            </button>
          )}
        </div>
        <label className="block text-xs font-medium text-ink-600">
          Topic
          <Select value={category} disabled={pending} onChange={(e) => run(() => updateTriage(reportId, { category: e.target.value }))} className="mt-1">
            {categories.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </Select>
        </label>
      </div>
    </div>
  );
}
