"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { approveAction, cancelAction, completeAction, remindOwner, reopenAction, startAction, updateActionPlan, verifyAction } from "@/lib/actions/safetyActions";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { PhotoField } from "./PhotoField";
import { useAct } from "./useAct";

export function ActionControls({
  actionId,
  status,
  ownerId,
  dueDate,
  isSafetyTeam,
  isOwner,
  people,
}: {
  actionId: string;
  status: string;
  ownerId: string | null;
  dueDate: string | null;
  isSafetyTeam: boolean;
  isOwner: boolean;
  people: { id: string; name: string }[];
}) {
  const { run, pending, error } = useAct();
  const [completeState, completeForm, completing] = useActionState(completeAction, undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (completeState?.success) router.refresh();
  }, [completeState, router]);

  const btn = "rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50";
  const primary = `${btn} bg-brand-700 text-white hover:bg-brand-800`;
  const secondary = `${btn} border border-ink-300 text-ink-800 hover:bg-ink-50`;
  const canWork = isSafetyTeam || isOwner;

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {message && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">{message}</p>}

      <div className="flex flex-wrap gap-2">
        {status === "PROPOSED" && isSafetyTeam && <button disabled={pending} onClick={() => run(() => approveAction(actionId))} className={primary}>Approve corrective action</button>}
        {status === "APPROVED" && canWork && <button disabled={pending} onClick={() => run(() => startAction(actionId))} className={primary}>Start work</button>}
        {status === "COMPLETED" && isSafetyTeam && <button disabled={pending} onClick={() => run(() => verifyAction(actionId))} className={primary}>Verify the fix</button>}
        {["COMPLETED", "VERIFIED"].includes(status) && isSafetyTeam && (
          <button disabled={pending} onClick={() => { const r = window.prompt("What still needs to be done? (optional)") ?? ""; run(() => reopenAction(actionId, r)); }} className={secondary}>Send back</button>
        )}
        {isSafetyTeam && !["VERIFIED", "CANCELLED"].includes(status) && (
          <button disabled={pending} onClick={() => confirm("Cancel this corrective action?") && run(() => cancelAction(actionId))} className={secondary}>Cancel corrective action</button>
        )}
        {isSafetyTeam && ownerId && ["APPROVED", "IN_PROGRESS", "COMPLETED"].includes(status) && (
          <button disabled={pending} onClick={() => run(async () => setMessage((await remindOwner(actionId)).message))} className={secondary}>Remind owner</button>
        )}
      </div>

      {["APPROVED", "IN_PROGRESS"].includes(status) && canWork && (
        <form action={completeForm} className="space-y-3 rounded-xl border border-ink-200 p-4">
          <input type="hidden" name="actionId" value={actionId} />
          <p className="text-sm font-semibold text-ink-900">Mark as done</p>
          {completeState?.error && <p role="alert" className="text-sm text-danger">{completeState.error}</p>}
          <Field label="What was done?" required hint="Enough detail that someone else can check it.">
            <Textarea name="completionNotes" rows={3} required />
          </Field>
          <div>
            <p className="mb-1 text-xs font-medium text-ink-700">Photo evidence <span className="font-normal text-ink-400">optional</span></p>
            <PhotoField name="evidence" label="Add photo" />
          </div>
          <button disabled={completing} className={primary}>{completing ? "Saving…" : "Mark done, request verification"}</button>
        </form>
      )}

      {isSafetyTeam && !["VERIFIED", "CANCELLED"].includes(status) && (
        <div className="grid gap-3 rounded-xl border border-ink-200 p-4 sm:grid-cols-2">
          <Field label="Owner">
            <Select defaultValue={ownerId ?? ""} disabled={pending} onChange={(e) => run(() => updateActionPlan(actionId, { ownerId: e.target.value || null }))}>
              <option value="">No owner</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Due date">
            <Input type="date" defaultValue={dueDate ?? ""} disabled={pending} onChange={(e) => run(() => updateActionPlan(actionId, { dueDate: e.target.value || null }))} />
          </Field>
          <input type="hidden" value={reason} readOnly />
        </div>
      )}
    </div>
  );
}
