"use client";

import { useState } from "react";
import { addComment } from "@/lib/actions/safetyReports";
import { Textarea } from "@/components/ui/Field";
import { useAct } from "./useAct";

export function CommentBox({ reportId, canRestrict }: { reportId: string; canRestrict: boolean }) {
  const [text, setText] = useState("");
  const [restricted, setRestricted] = useState(false);
  const { run, pending, error } = useAct();
  return (
    <div className="space-y-2">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Add an update or question…" />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={pending || !text.trim()}
          onClick={() => run(() => addComment(reportId, text, restricted), () => setText(""))}
          className="rounded-full bg-brand-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-40"
        >
          {pending ? "Posting…" : "Post"}
        </button>
        {canRestrict && (
          <label className="flex items-center gap-2 text-xs text-ink-600">
            <input type="checkbox" checked={restricted} onChange={(e) => setRestricted(e.target.checked)} />
            Safety team only
          </label>
        )}
      </div>
    </div>
  );
}
