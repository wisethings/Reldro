"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCustomTool } from "@/lib/actions/tools";
import { TOOL_CATEGORY_LABEL } from "@/lib/toolCatalog";
import type { ToolCategory } from "@prisma/client";
import { Field, FieldGrid, Input, Select, Textarea } from "@/components/ui/Field";

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
      <FieldGrid columns={2}>
        <Field label="Tool name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Havenbrook Claims Portal" />
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value as ToolCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{TOOL_CATEGORY_LABEL[c]}</option>
            ))}
          </Select>
        </Field>
      </FieldGrid>
      <FieldGrid columns={2}>
        <Field label="Vendor" optional>
          <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </Field>
        <Field label="Capabilities" hint="Comma-separated" optional>
          <Input value={capabilities} onChange={(e) => setCapabilities(e.target.value)} placeholder="e.g. Document search, Case notes" />
        </Field>
      </FieldGrid>
      <Field label="Description" required>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={2} />
      </Field>
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
