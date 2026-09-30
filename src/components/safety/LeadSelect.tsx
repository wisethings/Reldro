"use client";

import { setInvestigationLead } from "@/lib/actions/safetyInvestigations";
import { PersonSelect, type PersonOpt } from "@/components/ui/PersonSelect";
import { useAct } from "./useAct";

export function LeadSelect({ investigationId, leadId, people }: { investigationId: string; leadId: string | null; people: PersonOpt[] }) {
  const { run, pending, error } = useAct();
  return (
    <div>
      <PersonSelect defaultValue={leadId ?? ""} disabled={pending} onChange={(v) => run(() => setInvestigationLead(investigationId, v || null))} people={people} emptyLabel="Not assigned" aria-label="Investigation lead" />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
