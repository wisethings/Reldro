"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDepartmentIsolation } from "@/lib/actions/settings";

export function DepartmentIsolationToggle({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function choose(next: boolean) {
    if (next === enabled) return;
    startTransition(async () => {
      await setDepartmentIsolation(next);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => choose(false)}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
          !enabled ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50"
        }`}
      >
        Every department sees every workflow and lesson
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => choose(true)}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
          enabled ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50"
        }`}
      >
        Departments only see their own
      </button>
    </div>
  );
}
