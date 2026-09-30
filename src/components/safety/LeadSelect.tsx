"use client";

import { setInvestigationLead } from "@/lib/actions/safetyInvestigations";
import { Select } from "@/components/ui/Field";
import { useAct } from "./useAct";

export function LeadSelect({ investigationId, leadId, people }: { investigationId: string; leadId: string | null; people: { id: string; name: string }[] }) {
  const { run, pending, error } = useAct();
  return (
    <div>
      <Select defaultValue={leadId ?? ""} disabled={pending} onChange={(e) => run(() => setInvestigationLead(investigationId, e.target.value || null))} aria-label="Investigation lead">
        <option value="">Not assigned</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
