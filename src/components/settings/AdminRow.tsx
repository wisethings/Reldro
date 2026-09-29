"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeCompanyAdmin } from "@/lib/actions/invites";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ResendInviteButton } from "@/components/team/ResendInviteButton";

export function AdminRow({ admin, isSelf }: { admin: { id: string; name: string; email: string; pending: boolean }; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-start gap-3 py-2.5 text-sm">
      <Avatar name={admin.name} size={28} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink-900">{admin.name}</p>
        <p className="text-xs text-ink-500">{admin.email}</p>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      <div className="flex shrink-0 items-start gap-2">
        {isSelf && <span className="pt-1 text-xs text-ink-400">You</span>}
        {admin.pending && <Badge tone="amber">Invite pending</Badge>}
        {admin.pending && <ResendInviteButton userId={admin.id} name={admin.name} />}
        {!isSelf && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Remove ${admin.name} as an admin? Their account will be deleted and they will lose access immediately.`)) return;
              setError(null);
              startTransition(async () => {
                const res = await removeCompanyAdmin(admin.id);
                if (res.error) setError(res.error);
                else router.refresh();
              });
            }}
            className="rounded-full border border-danger px-3 py-1 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            {pending ? "Removing…" : "Remove"}
          </button>
        )}
      </div>
    </div>
  );
}
