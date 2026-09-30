"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { replyToSupport } from "@/lib/actions/support";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export function SupportReplyForm({ userId }: { userId: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await replyToSupport(userId, text);
          if (r.error) return setError(r.error);
          setText("");
          router.refresh();
        });
      }}
    >
      {error && <Alert tone="error">{error}</Alert>}
      <label htmlFor="reply" className="sr-only">Reply</label>
      <textarea id="reply" value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={4000} placeholder="Write a reply" className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 sm:text-sm" />
      <button disabled={pending || !text.trim()} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? <><Spinner /> Sending…</> : "Send reply"}</button>
    </form>
  );
}
