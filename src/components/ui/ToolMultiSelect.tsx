"use client";

import { useMemo, useState } from "react";

/**
 * Type-to-filter multi-select for picking tools from the org's Tool Library,
 * instead of a free-text comma-separated field where someone could type
 * anything (misspellings, duplicates, tools that aren't actually in the
 * library). Selected tools submit as repeated hidden inputs under `name`,
 * so the server action reads them with formData.getAll(name) same as any
 * other multi-value field (checkboxes, multi-selects).
 */
export function ToolMultiSelect({ name, options, defaultValue = [] }: { name: string; options: string[]; defaultValue?: string[] }) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !selected.includes(o) && (!q || o.toLowerCase().includes(q))).slice(0, 8);
  }, [options, selected, query]);

  function add(tool: string) {
    setSelected((prev) => (prev.includes(tool) ? prev : [...prev, tool]));
    setQuery("");
  }

  function remove(tool: string) {
    setSelected((prev) => prev.filter((t) => t !== tool));
  }

  return (
    <div className="relative">
      {selected.map((tool) => (
        <input key={tool} type="hidden" name={name} value={tool} />
      ))}
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-ink-300 p-2">
        {selected.map((tool) => (
          <span key={tool} className="flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700">
            {tool}
            <button type="button" onClick={() => remove(tool)} className="text-ink-400 hover:text-ink-700" aria-label={`Remove ${tool}`}>
              ×
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={selected.length === 0 ? "Type to search the Tool Library…" : "Add another…"}
          className="min-w-[8rem] flex-1 border-0 p-1 text-sm outline-none focus:ring-0"
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-ink-200 bg-white py-1 shadow-card">
          {matches.map((tool) => (
            <button
              key={tool}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(tool)}
              className="block w-full px-3 py-1.5 text-left text-sm text-ink-700 hover:bg-ink-50"
            >
              {tool}
            </button>
          ))}
        </div>
      )}
      {open && matches.length === 0 && query.trim() && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink-400 shadow-card">
          No tool in the library matches "{query}". Add it to the Tool Library first.
        </div>
      )}
    </div>
  );
}
