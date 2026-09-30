"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDot, ClipboardCheck, Clock, Hourglass, Play, ShieldCheck, XCircle } from "lucide-react";
import { approveAction, cancelAction, completeAction, remindOwner, reopenAction, startAction, updateActionPlan, verifyAction } from "@/lib/actions/safetyActions";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { PhotoField } from "./PhotoField";
import { useAct } from "./useAct";

type Props = {
  actionId: string;
  status: string;
  ownerId: string | null;
  ownerName: string | null;
  dueDate: string | null;
  isSafetyTeam: boolean;
  isOwner: boolean;
  people: { id: string; name: string }[];
};

const btn = "rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50";
const primary = `${btn} bg-brand-700 text-white hover:bg-brand-800`;
const secondary = `${btn} border border-ink-300 text-ink-800 hover:bg-surface-hover`;

/** What to do now, in plain words, with the one main button; everything else is tucked under "More options". */
export function ActionControls({ actionId, status, ownerId, ownerName, isSafetyTeam, isOwner }: Props) {
  const { run, pending, error } = useAct();
  const [completeState, completeForm, completing] = useActionState(completeAction, undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const router = useRouter();
  useEffect(() => { if (completeState?.success) { setShowDone(false); router.refresh(); } }, [completeState, router]);

  const canWork = isSafetyTeam || isOwner;
  const who = ownerName ?? "the owner";
  type Step = { tone: "act" | "wait" | "done" | "off"; Icon: typeof Play; title: string; body: string; button?: React.ReactNode };
  const step: Step = (() => {
    switch (status) {
      case "PROPOSED":
        return isSafetyTeam
          ? { tone: "act", Icon: ClipboardCheck, title: "Review this proposal", body: `Approving it makes it official and lets ${who} start.`, button: <button disabled={pending} onClick={() => run(() => approveAction(actionId))} className={primary}>Approve corrective action</button> }
          : { tone: "wait", Icon: Hourglass, title: "Waiting for the safety team", body: "Someone on the safety team will review and approve this before work starts." };
      case "APPROVED":
        return canWork
          ? { tone: "act", Icon: Play, title: isOwner ? "You’re up. Start the work" : `Ready for ${who} to start`, body: "Mark it started so everyone can see it’s underway.", button: <button disabled={pending} onClick={() => run(() => startAction(actionId))} className={primary}>Start work</button> }
          : { tone: "wait", Icon: Hourglass, title: `Waiting for ${who} to start`, body: "It’s approved and ready." };
      case "IN_PROGRESS":
        return canWork
          ? { tone: "act", Icon: CircleDot, title: isOwner ? "Finish the work, then record it" : `${ownerName ? `${ownerName} is` : "The owner is"} working on this`, body: "When the fix is in place, say what was done. Someone else then checks it before it counts as fixed.", button: showDone ? undefined : <button onClick={() => setShowDone(true)} className={primary}>Mark as done…</button> }
          : { tone: "wait", Icon: Clock, title: `${ownerName ?? "The owner"} is working on this`, body: "You’ll see it here when it’s marked done." };
      case "COMPLETED":
        return isSafetyTeam
          ? { tone: "act", Icon: ShieldCheck, title: "Check the fix, then verify", body: "Look at what was done and the photos below. Verify if the fix holds, or send it back with a note.", button: <span className="flex flex-wrap gap-2"><button disabled={pending} onClick={() => run(() => verifyAction(actionId))} className={primary}>Verify the fix</button><button disabled={pending} onClick={() => { const r = window.prompt("What still needs to be done? (optional)"); if (r !== null) run(() => reopenAction(actionId, r)); }} className={secondary}>Send back</button></span> }
          : { tone: "wait", Icon: Hourglass, title: "Waiting for the safety team to verify", body: "It doesn’t count as fixed until someone checks it." };
      case "VERIFIED":
        return { tone: "done", Icon: CheckCircle2, title: "Fixed and verified", body: "Nothing more to do on this corrective action." };
      default:
        return { tone: "off", Icon: XCircle, title: "Cancelled", body: "This corrective action is closed." };
    }
  })();

  const toneStyle = { act: "border-brand-700/30 bg-orchid-soft/40", wait: "border-ink-200 bg-ink-50", done: "border-sage-deep/30 bg-sage/50", off: "border-ink-200 bg-ink-50" }[step.tone];
  const iconStyle = { act: "bg-brand-700 text-white", wait: "bg-white text-ink-500 ring-1 ring-ink-200", done: "bg-sage-deep text-white", off: "bg-white text-ink-500 ring-1 ring-ink-200" }[step.tone];
  const hasMore = isSafetyTeam && (!["VERIFIED", "CANCELLED"].includes(status) || Boolean(ownerId));

  return (
    <div className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      <div className={`rounded-xl border p-4 ${toneStyle}`}>
        <div className="flex items-start gap-3">
          <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconStyle}`}><step.Icon size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900">{step.title}</p>
            <p className="mt-0.5 text-sm leading-snug text-ink-600">{step.body}</p>
            {step.button && <div className="mt-3">{step.button}</div>}
          </div>
        </div>

        {showDone && ["APPROVED", "IN_PROGRESS"].includes(status) && canWork && (
          <form action={completeForm} className="mt-4 space-y-3 border-t border-ink-200/70 pt-4">
            <input type="hidden" name="actionId" value={actionId} />
            {completeState?.error && <Alert tone="error">{completeState.error}</Alert>}
            <Field label="What was done?" required hint="Enough detail that someone else can check it.">
              <Textarea name="completionNotes" rows={3} required />
            </Field>
            <div>
              <p className="mb-1 text-xs font-medium text-ink-700">Photo evidence <span className="font-normal text-ink-500">optional</span></p>
              <PhotoField name="evidence" label="Add photo" />
            </div>
            <div className="flex gap-2">
              <button disabled={completing} className={primary}>{completing ? "Saving…" : "Mark done and ask for verification"}</button>
              <button type="button" onClick={() => setShowDone(false)} className={secondary}>Not yet</button>
            </div>
          </form>
        )}
        {status === "APPROVED" && canWork && !showDone && (
          <p className="mt-3 border-t border-ink-200/70 pt-3 text-xs text-ink-600">Already finished? <button onClick={() => setShowDone(true)} className="font-medium text-orchid-deep hover:text-oxblood">Mark it done now</button></p>
        )}
      </div>

      {hasMore && (
        <details className="group rounded-xl border border-ink-200">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
            More options
            <span aria-hidden className="text-ink-400 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="flex flex-wrap gap-2 border-t border-ink-200 p-3">
            {ownerId && ["APPROVED", "IN_PROGRESS", "COMPLETED"].includes(status) && (
              <button disabled={pending} onClick={() => run(async () => setMessage((await remindOwner(actionId)).message))} className={secondary}>Email a reminder to {ownerName ?? "the owner"}</button>
            )}
            {!["VERIFIED", "CANCELLED"].includes(status) && (
              <button disabled={pending} onClick={() => confirm("Cancel this corrective action? You can reopen it later.") && run(() => cancelAction(actionId))} className={`${secondary} text-danger`}>Cancel corrective action</button>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

/** Owner and due date, editable by the safety team. Kept apart from the next step so each does one job. */
export function ActionPlanEditor({ actionId, ownerId, dueDate, people }: { actionId: string; ownerId: string | null; dueDate: string | null; people: { id: string; name: string }[] }) {
  const { run, pending, error } = useAct();
  return (
    <div className="space-y-2">
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Owner">
          <Select defaultValue={ownerId ?? ""} disabled={pending} onChange={(e) => run(() => updateActionPlan(actionId, { ownerId: e.target.value || null }))}>
            <option value="">No owner</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Due date">
          <Input type="date" defaultValue={dueDate ?? ""} disabled={pending} onChange={(e) => run(() => updateActionPlan(actionId, { dueDate: e.target.value || null }))} />
        </Field>
      </div>
    </div>
  );
}
