"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { notifyProjectTeam } from "@/lib/actions/marketplace";

export function NotifyTeamButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  return (
    <button
      disabled={pending || sent}
      onClick={() =>
        startTransition(async () => {
          await notifyProjectTeam(projectId);
          setSent(true);
        })
      }
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
    >
      <Bell size={12} /> {sent ? "Team notified" : pending ? "Sending…" : "Notify team"}
    </button>
  );
}
