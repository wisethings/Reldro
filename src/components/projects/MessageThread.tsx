"use client";

import { useState, useTransition } from "react";
import { postProjectMessage } from "@/lib/actions/marketplace";
import { Avatar } from "@/components/ui/Avatar";

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
        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-2.5">
            <Avatar name={m.senderName} size={28} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="text-xs font-medium text-ink-900">{m.senderName}</p>
                <p className="text-[10px] text-ink-400">{new Date(m.createdAt).toLocaleString()}</p>
              </div>
              <p className="mt-0.5 text-sm text-ink-700">{m.body}</p>
            </div>
          </div>
        ))}
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
        <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
