"use client";

import { useState, useTransition } from "react";
import { postProjectMessage } from "@/lib/actions/marketplace";

type Message = { id: string; body: string; createdAt: string; senderName: string; senderUserId: string };

export function MessageThread({
  projectId,
  currentUserId,
  messages,
}: {
  projectId: string;
  currentUserId: string;
  messages: Message[];
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="max-h-72 space-y-3 overflow-y-auto scrollbar-thin">
        {messages.map((m) => {
          const mine = m.senderUserId === currentUserId;
          return (
            <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "ml-auto bg-brand-700 text-white" : "bg-ink-50 text-ink-800"}`}>
              {!mine && <p className="text-[11px] font-medium text-ink-500">{m.senderName}</p>}
              <p>{m.body}</p>
              <p className={`mt-1 text-[10px] ${mine ? "text-brand-100" : "text-ink-400"}`}>{new Date(m.createdAt).toLocaleString()}</p>
            </div>
          );
        })}
        {messages.length === 0 && <p className="text-sm text-ink-500">No messages yet.</p>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          const value = body;
          setBody("");
          startTransition(() => postProjectMessage(projectId, value));
        }}
        className="flex gap-2"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button disabled={pending} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
