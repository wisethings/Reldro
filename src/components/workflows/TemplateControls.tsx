"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { CreateTemplateForm } from "./CreateTemplateForm";
import { DeleteTemplateButton } from "./DeleteTemplateButton";

type Template = { id: string; title: string; prompt: string; department: string; tools: string[]; imageUrl: string | null; videoUrl: string | null };

export function TemplateControls({
  template,
  lockDepartment,
  departmentOptions,
  toolOptions,
}: {
  template: Template;
  lockDepartment: string | null;
  departmentOptions: string[];
  toolOptions: string[];
}) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="shrink-0 rounded-full border border-ink-200 px-2.5 py-1 text-[11px] font-medium text-ink-500 hover:border-brand-500 hover:text-brand-700"
      >
        Edit
      </button>
      <DeleteTemplateButton templateId={template.id} />
      {editing && (
        <Modal title="Edit template" onClose={() => setEditing(false)}>
          <CreateTemplateForm
            template={template}
            lockDepartment={lockDepartment}
            departmentOptions={departmentOptions}
            toolOptions={toolOptions}
            onSaved={() => setEditing(false)}
          />
        </Modal>
      )}
    </>
  );
}
