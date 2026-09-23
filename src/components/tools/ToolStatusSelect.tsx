"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ToolApprovalStatus } from "@prisma/client";
import { setToolStatus } from "@/lib/actions/tools";
import { TOOL_STATUS_LABEL } from "@/lib/toolCatalog";

const STATUSES: ToolApprovalStatus[] = ["APPROVED", "RECOMMENDED", "UNDER_REVIEW", "RESTRICTED", "DEPRECATED"];

export function ToolStatusSelect({ toolId, currentStatus }: { toolId: string; currentStatus: ToolApprovalStatus | null }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <select
      defaultValue={currentStatus ?? ""}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          await setToolStatus(toolId, e.target.value as ToolApprovalStatus);
          router.refresh();
        })
      }
      className="rounded-lg border border-ink-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
    >
      {!currentStatus && <option value="" disabled>Not in library</option>}
      {STATUSES.map((s) => (
        <option key={s} value={s}>{TOOL_STATUS_LABEL[s]}</option>
      ))}
    </select>
  );
}
