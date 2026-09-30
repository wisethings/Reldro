"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { setActionStatus } from "@/lib/actions/safetyActions";
import { Alert } from "@/components/ui/Alert";
import { useAct } from "./useAct";
import { Spinner } from "@/components/ui/Spinner";

const STEPS = [
  { key: "PROPOSED", label: "Proposed" },
  { key: "APPROVED", label: "Open" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "COMPLETED", label: "Ready to verify" },
  { key: "VERIFIED", label: "Verified" },
];

/**
 * Where the corrective action is, at a glance. Finished steps that the viewer may go back to are buttons: choosing one
 * asks for a short reason and moves the action back, so a mistake or a change of plan can always be undone.
 */
export function ActionProgress({ actionId, status, backTo }: { actionId: string; status: string; backTo: string[] }) {
  const { run, pending, error, setError } = useAct();
  const [target, setTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const cancelled = status === "CANCELLED";
  const current = STEPS.findIndex((s) => s.key === status);

  const label = STEPS.find((s) => s.key === target)?.label;
  return (
    <div className="space-y-3">
      <ol className="flex items-start" aria-label="Progress">
        {STEPS.map((s, i) => {
          const done = !cancelled && i < current;
          const isCurrent = !cancelled && i === current;
          const canGoBack = backTo.includes(s.key) && (cancelled ? i <= 2 : i < current);
          const dot = (
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                isCurrent ? "border-brand-700 bg-brand-700 text-white" : done ? "border-sage-deep bg-sage text-sage-deep" : "border-ink-200 bg-white text-ink-400"
              } ${canGoBack ? "group-hover:border-orchid-deep group-hover:bg-orchid-soft group-hover:text-orchid-deep" : ""}`}
            >
              {done ? <Check size={14} aria-hidden /> : i + 1}
            </span>
          );
          const text = <span className={`mt-1.5 block text-xs leading-tight sm:text-xs ${isCurrent ? "font-semibold text-ink-900" : done ? "text-ink-700" : "text-ink-400"}`}>{s.label}</span>;
          return (
            <li key={s.key} className="relative flex-1 text-center" aria-current={isCurrent ? "step" : undefined}>
              {i > 0 && <span aria-hidden className={`absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2 ${!cancelled && i <= current ? "bg-sage-deep/60" : "bg-ink-200"}`} />}
              {canGoBack ? (
                <button type="button" onClick={() => { setTarget(s.key); setError(null); }} className="group relative mx-auto block rounded-lg px-1 outline-none focus-visible:ring-2 focus-visible:ring-brand-500" aria-label={`Move back to ${s.label}`} title={`Move back to ${s.label}`}>
                  {dot}
                  {text}
                </button>
              ) : (
                <div className="relative mx-auto px-1">
                  {dot}
                  {text}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {backTo.length > 0 && !target && !cancelled && current > 0 && <p className="text-center text-xs text-ink-500">Need to undo a step? Select an earlier one.</p>}

      {target && (
        <div className="space-y-2 rounded-xl border border-orchid-deep/30 bg-orchid-soft/50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900"><RotateCcw size={14} aria-hidden /> {cancelled ? `Reopen as “${label}”` : `Move back to “${label}”`}</p>
          <p className="text-xs text-ink-600">The stages after it are cleared and the change is added to the report timeline.</p>
          {error && <Alert tone="error">{error}</Alert>}
          <label className="sr-only" htmlFor="move-reason">Reason (optional)</label>
          <textarea id="move-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder="Why? (optional, for example: fix did not hold, plan changed)" className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 sm:text-sm" />
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={() => run(() => setActionStatus(actionId, target, reason), () => { setTarget(null); setReason(""); })} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? <><Spinner /> Moving…</> : "Confirm"}</button>
            <button type="button" onClick={() => { setTarget(null); setReason(""); }} className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-surface-hover">Keep as is</button>
          </div>
        </div>
      )}
      {cancelled && !target && backTo.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-sunken px-4 py-3 text-sm text-ink-700">
          This corrective action was cancelled.
          <button type="button" onClick={() => setTarget("PROPOSED")} className="font-medium text-orchid-deep hover:text-oxblood">Reopen it</button>
        </div>
      )}
      {cancelled && backTo.length === 0 && <p className="rounded-xl bg-surface-sunken px-4 py-3 text-sm text-ink-700">This corrective action was cancelled.</p>}
    </div>
  );
}
