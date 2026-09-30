"use client";

import { useState, useTransition } from "react";
import { resendInvite, type ResendInviteResult } from "@/lib/actions/invites";
import { InviteResult } from "./InviteResult";

export function ResendInviteButton({ userId, name }: { userId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ResendInviteResult>();

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Resend ${name}'s invite? This issues a new temporary password and the old one stops working.`)) return;
          startTransition(async () => {
            try {
              setResult(await resendInvite(userId));
            } catch {
              setResult({ error: "Couldn't resend the invite. Check your connection and try again." });
            }
          });
        }}
        className="rounded-full border border-ink-300 px-3 py-1 text-xs font-medium text-ink-700 hover:border-brand-500 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Resend invite"}
      </button>
      <InviteResult result={result} className="max-w-sm text-left text-xs" />
    </div>
  );
}
