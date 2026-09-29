"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recalculateOpportunityValues } from "@/lib/actions/settings";

/**
 * Opportunity value estimates are computed once, using the org's hourly
 * rate at that moment, and stored - so saving a new rate above doesn't by
 * itself change any number already shown on Opportunities/ROI/Analytics.
 * This button re-applies the org's current rate to every existing
 * opportunity in one pass, so correcting the rate actually shows up.
 */
export function RecalculateValueEstimatesButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(null);
            const { updated } = await recalculateOpportunityValues();
            setResult(`Updated ${updated} opportunit${updated === 1 ? "y" : "ies"}.`);
            router.refresh();
          })
        }
        className="rounded-full border border-ink-300 px-4 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
      >
        {pending ? "Recalculating…" : "Recalculate estimates with this rate"}
      </button>
      {result && <p className="text-xs text-ink-500">{result}</p>}
    </div>
  );
}
