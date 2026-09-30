"use client";

import { useState, useTransition } from "react";
import { unwrap } from "@/lib/actionResult";
import { DraftLabel } from "./ui";
import { Spinner } from "@/components/ui/Spinner";

type Draft = { text: string; generatedBy: "model" | "rules"; sources?: string[] };

/**
 * Generic "ask for a draft, show it clearly labeled, let a person copy or
 * discard it" control. It never saves anything itself.
 */
export function AiTextDraft({
  label,
  generate,
  useLabel,
  onUse,
  disabled,
}: {
  label: string;
  generate: () => Promise<Draft>;
  /** Text for the button that takes the draft (omit to make the draft read-only). */
  useLabel?: string;
  onUse?: (text: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              const d = unwrap(await generate());
              setDraft(d);
              setText(d.text);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Couldn't draft that.");
            }
          })
        }
        className="rounded-full border border-orchid-deep px-3 py-1.5 text-xs font-medium text-orchid-deep hover:bg-orchid-soft disabled:opacity-40"
      >
        {pending ? <><Spinner /> Drafting…</> : label}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
      {draft && (
        <div className="space-y-2 rounded-xl border border-orchid bg-orchid-soft/40 p-3">
          <DraftLabel generatedBy={draft.generatedBy} />
          {draft.sources && draft.sources.length > 0 && (
            <p className="text-xs text-ink-600">
              <span className="font-medium">Built from:</span> {draft.sources.join(" · ")}. Check it against these before you use it.
            </p>
          )}
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={Math.min(14, Math.max(4, text.split("\n").length + 1))} className="w-full rounded-lg border border-ink-200 bg-white p-2 text-sm text-ink-800" aria-label="Draft text (editable)" />
          <div className="flex gap-2">
            {onUse && useLabel && (
              <button type="button" onClick={async () => { await onUse(text); setDraft(null); }} className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800">
                {useLabel}
              </button>
            )}
            <button type="button" onClick={() => setDraft(null)} className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700">
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
