"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTemplate } from "@/lib/actions/templates";

export function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this template?")) {
          startTransition(async () => {
            await deleteTemplate(templateId);
            router.refresh();
          });
        }
      }}
      className="shrink-0 rounded-full border border-ink-200 px-2.5 py-1 text-[11px] font-medium text-ink-500 hover:border-danger hover:text-danger disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
