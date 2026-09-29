"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCustomTool, deleteCustomTool } from "@/lib/actions/tools";
import { TOOL_CATEGORY_LABEL } from "@/lib/toolCatalog";
import { Modal } from "@/components/ui/Modal";
import { Field, FieldGrid, Input, Select, Textarea } from "@/components/ui/Field";
import type { ToolCategory } from "@prisma/client";

const CATEGORIES = Object.keys(TOOL_CATEGORY_LABEL) as ToolCategory[];

type Tool = { id: string; name: string; category: ToolCategory; vendor: string | null; description: string; capabilities: string[] };

export function CustomToolControls({ tool }: { tool: Tool }) {
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState<ToolCategory>(tool.category);
  const [vendor, setVendor] = useState(tool.vendor ?? "");
  const [description, setDescription] = useState(tool.description);
  const [capabilities, setCapabilities] = useState(tool.capabilities.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
      >
        Edit
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete ${tool.name} from your tool library? Workflows and templates that mention it will keep the name but stop linking to a tool page.`)) return;
          startTransition(async () => {
            try {
              await deleteCustomTool(tool.id);
              router.push("/dashboard/integrations/tools");
            } catch (e) {
              alert(e instanceof Error ? e.message : "Couldn't delete this tool.");
            }
          });
        }}
        className="rounded-full border border-danger px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>

      {editing && (
        <Modal title={`Edit ${tool.name}`} onClose={() => setEditing(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              startTransition(async () => {
                try {
                  await updateCustomTool({
                    toolId: tool.id,
                    category,
                    vendor: vendor || undefined,
                    description,
                    capabilities: capabilities.split(",").map((c) => c.trim()).filter(Boolean),
                  });
                  setEditing(false);
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Couldn't save this tool.");
                }
              });
            }}
            className="space-y-3"
          >
            <FieldGrid columns={2}>
              <Field label="Tool name" hint="The name can't change because workflows and templates reference it.">
                <Input value={tool.name} disabled />
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
                <Input value={capabilities} onChange={(e) => setCapabilities(e.target.value)} />
              </Field>
            </FieldGrid>
            <Field label="Description" required>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} />
            </Field>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={pending || !description.trim()}
              className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
