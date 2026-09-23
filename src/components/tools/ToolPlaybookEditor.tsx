"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setToolPlaybook } from "@/lib/actions/tools";

export function ToolPlaybookEditor({
  toolId,
  toolName,
  guidance,
  approvedUses,
  restrictedUses,
}: {
  toolId: string;
  toolName: string;
  guidance: string | null;
  approvedUses: string[];
  restrictedUses: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [guidanceText, setGuidanceText] = useState(guidance ?? "");
  const [approvedText, setApprovedText] = useState(approvedUses.join("\n"));
  const [restrictedText, setRestrictedText] = useState(restrictedUses.join("\n"));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const hasPlaybook = Boolean(guidance) || approvedUses.length > 0 || restrictedUses.length > 0;

  if (!editing) {
    return (
      <div className="space-y-3">
        {hasPlaybook ? (
          <>
            {guidance && <p className="text-sm text-ink-700">{guidance}</p>}
            {approvedUses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-sage-deep">DO</p>
                <ul className="mt-1 space-y-1 text-sm text-ink-700">
                  {approvedUses.map((u) => (
                    <li key={u}>✓ {u}</li>
                  ))}
                </ul>
              </div>
            )}
            {restrictedUses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-danger">DO NOT</p>
                <ul className="mt-1 space-y-1 text-sm text-ink-700">
                  {restrictedUses.map((u) => (
                    <li key={u}>✕ {u}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-500">No playbook defined yet for how {toolName} should be used here.</p>
        )}
        <button
          onClick={() => setEditing(true)}
          className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
        >
          {hasPlaybook ? "Edit playbook" : "+ Add playbook"}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await setToolPlaybook({
            toolId,
            guidance: guidanceText,
            approvedUses: approvedText.split("\n").map((s) => s.trim()).filter(Boolean),
            restrictedUses: restrictedText.split("\n").map((s) => s.trim()).filter(Boolean),
          });
          setEditing(false);
          router.refresh();
        });
      }}
      className="space-y-3"
    >
      <div>
        <label className="block text-xs font-medium text-ink-600">Purpose / guidance</label>
        <textarea
          value={guidanceText}
          onChange={(e) => setGuidanceText(e.target.value)}
          rows={2}
          placeholder={`How should employees use ${toolName} here?`}
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Approved uses (one per line)</label>
        <textarea
          value={approvedText}
          onChange={(e) => setApprovedText(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Restricted uses (one per line)</label>
        <textarea
          value={restrictedText}
          onChange={(e) => setRestrictedText(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save playbook"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-ink-300 px-4 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
