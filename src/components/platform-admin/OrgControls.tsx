"use client";

import { useState } from "react";
import { resendAdminInvite, setSeatLimit, setSuspended, type ResendResult } from "@/lib/actions/platform-admin";
import { useAct } from "@/components/safety/useAct";
import { useConfirm } from "@/components/ui/useConfirm";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { InviteResult } from "@/components/team/InviteResult";
import { btnPrimary, btnSecondary } from "@/components/ui/FormParts";
import { Spinner } from "@/components/ui/Spinner";

export function SeatLimitForm({ orgId, limit, used }: { orgId: string; limit: number | null; used: number }) {
  const { run, pending, error } = useAct();
  const [value, setValue] = useState(limit === null ? "" : String(limit));
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => { e.preventDefault(); setSaved(false); run(() => setSeatLimit(orgId, value), () => setSaved(true)); }}
    >
      <Field label="Seats" hint={`${used} in use. A seat is one admin or employee with a sign-in. Leave empty for no limit.`}>
        <Input name="seats" inputMode="numeric" value={value} onChange={(e) => { setValue(e.target.value); setSaved(false); }} placeholder="No limit" className="sm:max-w-[12rem]" />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>{pending ? <><Spinner /> Saving…</> : "Save seats"}</button>
        {saved && !error && <span className="text-sm text-sage-deep" role="status">Saved.</span>}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  );
}

export function SuspendControls({ orgId, name, suspended, isDemo }: { orgId: string; name: string; suspended: boolean; isDemo: boolean }) {
  const { run, pending, error } = useAct();
  const { ask, dialog } = useConfirm();
  const [reason, setReason] = useState("");

  if (isDemo) return <p className="text-sm text-ink-500">This is the sample workspace. It can&apos;t be suspended.</p>;

  if (suspended) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-700">Nobody in this workspace can sign in right now. Their data is untouched.</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => ask({ title: `Reopen ${name}?`, body: "Everyone in the workspace can sign in again straight away.", confirmLabel: "Reopen workspace", onConfirm: () => run(() => setSuspended(orgId, false, "")) })}
          className={btnPrimary}
        >
          {pending ? <><Spinner /> Working…</> : "Reopen workspace"}
        </button>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {dialog}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-700">Suspending locks everyone in this workspace out straight away, including people who are signed in. Nothing is deleted, and you can reopen it at any time.</p>
      <Field label="Reason" hint="Kept in the staff activity log.">
        <Textarea name="reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <button
        type="button"
        disabled={pending || !reason.trim()}
        onClick={() => ask({ title: `Suspend ${name}?`, body: "Everyone in this workspace will be signed out and unable to sign in until you reopen it.", confirmLabel: "Suspend workspace", destructive: true, onConfirm: () => run(() => setSuspended(orgId, true, reason), () => setReason("")) })}
        className="rounded-full border border-danger/40 bg-white px-5 py-2 text-sm font-medium text-danger transition-colors hover:bg-coral-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <><Spinner /> Working…</> : "Suspend workspace"}
      </button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {dialog}
    </div>
  );
}

export function ResendInviteButton({ userId }: { userId: string }) {
  const [result, setResult] = useState<ResendResult>();
  const { run, pending, error } = useAct();
  return (
    <div className="space-y-2">
      <button type="button" disabled={pending} onClick={() => run(async () => { setResult(await resendAdminInvite(userId)); })} className={`${btnSecondary} !px-3 !py-1.5 !text-xs`}>
        {pending ? <><Spinner /> Sending…</> : "Resend invite"}
      </button>
      <InviteResult result={result} />
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
