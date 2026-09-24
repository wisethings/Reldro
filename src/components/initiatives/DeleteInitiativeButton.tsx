"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteInitiative } from "@/lib/actions/initiatives";

export function DeleteInitiativeButton({ initiativeId }: { initiativeId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this initiative? This can't be undone.")) {
          startTransition(async () => {
            await deleteInitiative(initiativeId);
            router.push("/dashboard/initiatives");
          });
        }
      }}
      className="shrink-0 rounded-full border border-danger px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete initiative"}
    </button>
  );
}
