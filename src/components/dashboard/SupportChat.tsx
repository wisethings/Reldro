"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CircleHelp, Send, X } from "lucide-react";
import { openSupportThread, sendSupportMessage, supportUnreadCount, type SupportMessageView } from "@/lib/actions/support";
import { Spinner } from "@/components/ui/Spinner";

const POLL_MS = 30_000;

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Help button (bottom left) that opens a message thread with the Reldro team. Company admins only. */
export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessageView[] | null>(null);
  const [sample, setSample] = useState(false);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    const t = await openSupportThread();
    setMessages(t.messages);
    setSample(t.sampleWorkspace);
    setUnread(0);
  }, []);

  useEffect(() => {
    if (open) return;
    let alive = true;
    // Skip the check while the tab is in the background: nobody sees it, and every check wakes the database.
    const check = () => { if (!document.hidden) supportUnreadCount().then((n) => alive && setUnread(n)).catch(() => {}); };
    check();
    const id = setInterval(check, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    load().catch(() => setError("Could not load your messages."));
    const id = setInterval(() => { if (!document.hidden) load().catch(() => {}); }, POLL_MS);
    closeRef.current?.focus();
    return () => clearInterval(id);
  }, [open, load]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages, open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await sendSupportMessage(text);
        if (r.error) return setError(r.error);
        if (r.message) setMessages((m) => [...(m ?? []), r.message!]);
        setDraft("");
      } catch {
        setError("Your message could not be sent. Check your connection and try again.");
      }
    });
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={unread > 0 ? `Help and messages, ${unread} unread` : "Help and messages"}
          className="fixed bottom-20 left-3 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-oxblood text-bone shadow-lg outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 md:bottom-20 md:left-4"
        >
          <CircleHelp size={20} aria-hidden />
          {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-semibold text-oxblood">{unread}</span>}
        </button>
      )}
      {open && (
        <section
          role="dialog"
          aria-label="Help with Reldro"
          className="fixed inset-x-3 bottom-20 z-50 flex max-h-[min(34rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl sm:inset-x-auto sm:left-4 sm:w-96 md:bottom-4"
        >
          <header className="flex items-start gap-2 bg-oxblood px-4 py-3 text-bone">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Help with Reldro</h2>
              <p className="text-xs text-bone/70">Questions about using Reldro, such as setup, sites, roles, or settings. Only the Reldro team and you can see this conversation.</p>
            </div>
            <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1 text-bone/80 hover:bg-white/10 hover:text-bone"><X size={16} aria-hidden /></button>
          </header>
          <div className="min-h-[10rem] flex-1 space-y-2 overflow-y-auto bg-ink-50 px-3 py-3" aria-live="polite">
            {messages === null ? (
              <p className="flex items-center justify-center gap-2 py-6 text-center text-xs text-ink-500"><Spinner /> Loading…</p>
            ) : messages.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-600">No messages yet. Ask how something in Reldro works, or what a setting does.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.fromStaff ? "items-start" : "items-end"}`}>
                  <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-snug ${m.fromStaff ? "rounded-bl-md bg-white text-ink-900 ring-1 ring-ink-200" : "rounded-br-md bg-orchid-soft text-ink-900"}`}>{m.body}</p>
                  <span className="mt-0.5 px-1 text-xs text-ink-500">{m.fromStaff ? m.senderName : "You"} · {when(m.createdAt)}</span>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="border-t border-ink-200 bg-white p-2.5">
            <p className="mb-2 text-xs leading-snug text-ink-500">This is for help using Reldro. Do not include names or details from reports. For an emergency, call your local emergency number.</p>
            {sample && <p className="mb-2 rounded-lg bg-olive-soft px-2.5 py-1.5 text-xs text-olive">This is a sample conversation. Sending is turned off in the sample workspace.</p>}
            {error && <p role="alert" className="mb-2 rounded-lg bg-coral-soft px-2.5 py-1.5 text-xs text-danger">{error}</p>}
            <div className="flex items-end gap-2">
              <label className="sr-only" htmlFor="support-draft">Your message</label>
              <textarea
                id="support-draft"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                rows={2}
                maxLength={2000}
                disabled={sample}
                placeholder="Ask a question about Reldro"
                className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-ink-200 bg-white px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:bg-ink-50 sm:text-sm"
              />
              <button type="submit" disabled={pending || sample || !draft.trim()} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-40"><Send size={16} aria-hidden /></button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
