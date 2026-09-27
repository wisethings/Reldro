"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDepartmentAdmin } from "@/lib/actions/team";

export function DepartmentAdminToggle({ employeeId, isDepartmentAdmin }: { employeeId: string; isDepartmentAdmin: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        await setDepartmentAdmin(employeeId, !isDepartmentAdmin);
        router.refresh();
      })}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium disabled:opacity-50 ${
        isDepartmentAdmin ? "border-ink-300 text-ink-600 hover:bg-ink-50" : "border-brand-300 text-brand-700 hover:bg-brand-50"
      }`}
    >
      {pending ? "…" : isDepartmentAdmin ? "Remove as lead" : "Make dept. lead"}
    </button>
  );
}
