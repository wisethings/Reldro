"use client";

import { useState, useTransition } from "react";
import { askAssistant } from "@/lib/actions/assistant";
import type { AssistantAnswer } from "@/lib/ai/assistant";

const SUGGESTIONS = [
  "Where should we adopt AI next?",
  "Which workflows should we prioritize?",
  "Should we hire a specialist?",
  "Show me our highest-value AI opportunities.",
];

type Turn = { question: string; answer?: AssistantAnswer };

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, startTransition] = useTransition();

  function ask(question: string) {
    if (!question.trim()) return;
    setInput("");
    setTurns((t) => [...t, { question }]);
    startTransition(async () => {
      const answer = await askAssistant(question);
      setTurns((t) => {
        const copy = [...t];
        copy[copy.length - 1] = { question, answer };
        return copy;
      });
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-orchid-deep text-white shadow-lg hover:brightness-95"
        aria-label="Open Reldro assistant"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3a9 9 0 100 18 9 9 0 000-18Z" opacity=".0" />
          <path d="M8 10h8M8 14h5" strokeLinecap="round" />
          <path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7A2.5 2.5 0 0117.5 16H10l-4 4v-4H6.5A2.5 2.5 0 014 13.5v-7Z" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink-900">Reldro assistant</p>
              <p className="text-[11px] text-ink-500">Answers from your organization's data</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-700">
              ✕
            </button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
            {turns.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-ink-500">Try asking:</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="block w-full rounded-xl border border-ink-200 px-3 py-2 text-left text-xs text-ink-700 hover:border-orchid hover:bg-orchid-soft"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className="space-y-1.5">
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-oxblood px-3 py-2 text-xs text-bone">
                  {t.question}
                </p>
                {t.answer ? (
                  <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-surface-sunken px-3 py-2 text-xs text-ink-800">
                    <p>{t.answer.answer}</p>
                    {t.answer.bullets && (
                      <ul className="mt-1.5 space-y-1">
                        {t.answer.bullets.map((b, j) => (
                          <li key={j} className="text-ink-600">
                            · {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-surface-sunken px-3 py-2 text-xs text-ink-400">Thinking…</div>
                )}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 border-t border-ink-200 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about adoption, opportunities, ROI…"
              className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-oxblood px-4 py-2 text-xs font-medium text-bone hover:bg-[#45181B] disabled:opacity-50"
            >
              Ask
            </button>
          </form>
        </div>
      )}
    </>
  );
}
