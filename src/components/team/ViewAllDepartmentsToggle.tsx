"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setViewAllDepartments } from "@/lib/actions/team";

export function ViewAllDepartmentsToggle({ employeeId, viewAllDepartments }: { employeeId: string; viewAllDepartments: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      title="Cross-department content visibility (opportunities, templates, workflows, lessons) - not a formal permission tier, just a view override"
      onClick={() =>
        startTransition(async () => {
          await setViewAllDepartments(employeeId, !viewAllDepartments);
          router.refresh();
        })
      }
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium disabled:opacity-50 ${
        viewAllDepartments ? "border-ink-300 text-ink-600 hover:bg-ink-50" : "border-orchid-deep text-orchid-deep hover:bg-orchid-deep/5"
      }`}
    >
      {pending ? "…" : viewAllDepartments ? "Remove all-dept. access" : "Give all-dept. access"}
    </button>
  );
}
