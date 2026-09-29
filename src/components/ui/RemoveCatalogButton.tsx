"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeCatalogItem } from "@/lib/actions/catalog";
import type { HideableType } from "@/lib/queries/hidden";

export function RemoveCatalogButton({
  type,
  id,
  title,
  label = "Delete",
  redirectTo,
  compact = false,
}: {
  type: HideableType;
  id: string;
  title: string;
  label?: string;
  redirectTo?: string;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete "${title}" for your organization?\n\nIt will disappear for everyone in your organization. Other organizations aren't affected, and you can restore it from Settings.`)) return;
          setError(null);
          startTransition(async () => {
            try {
              await removeCatalogItem(type, id);
              if (redirectTo) router.push(redirectTo);
              else router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Couldn't delete this.");
            }
          });
        }}
        className={
          compact
            ? "shrink-0 rounded-full border border-ink-200 px-2.5 py-1 text-[11px] font-medium text-ink-500 hover:border-danger hover:text-danger disabled:opacity-50"
            : "shrink-0 rounded-full border border-danger px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
        }
      >
        {pending ? (compact ? "…" : "Deleting…") : label}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
