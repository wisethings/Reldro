"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCustomTool } from "@/lib/actions/tools";
import { TOOL_CATEGORY_LABEL } from "@/lib/toolCatalog";
import type { ToolCategory } from "@prisma/client";

const CATEGORIES = Object.keys(TOOL_CATEGORY_LABEL) as ToolCategory[];

export function AddCustomToolForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ToolCategory>("INTERNAL_PLATFORM");
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
      >
        + Add tool
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await addCustomTool({
            name,
            category,
            vendor: vendor || undefined,
            description,
            capabilities: capabilities.split(",").map((c) => c.trim()).filter(Boolean),
          });
          setOpen(false);
          setName("");
          setVendor("");
          setDescription("");
          setCapabilities("");
          router.refresh();
        });
      }}
      className="space-y-3 rounded-lg border border-ink-200 p-4"
    >
      <p className="text-sm font-medium text-ink-900">Add a custom or internal tool</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-ink-600">Tool name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Havenbrook Claims Portal"
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ToolCategory)}
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{TOOL_CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Vendor (optional)</label>
        <input
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={2}
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Capabilities (comma-separated, optional)</label>
        <input
          value={capabilities}
          onChange={(e) => setCapabilities(e.target.value)}
          placeholder="e.g. Document search, Case notes"
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !name.trim() || !description.trim()}
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add tool"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
