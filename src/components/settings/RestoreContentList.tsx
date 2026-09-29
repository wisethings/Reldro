"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreCatalogItem } from "@/lib/actions/catalog";

type Item = { id: string; typeLabel: string; title: string; hiddenByName: string; date: string };

export function RestoreContentList({ items }: { items: Item[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (items.length === 0) return <p className="text-sm text-ink-500">Nothing deleted. Catalog content you delete shows up here so you can bring it back.</p>;

  return (
    <div className="space-y-2">
      <div className="divide-y divide-ink-200 rounded-lg border border-ink-200">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm text-ink-800">
                {item.title} <span className="text-xs text-ink-400">· {item.typeLabel}</span>
              </p>
              <p className="text-xs text-ink-500">Deleted{item.hiddenByName ? ` by ${item.hiddenByName}` : ""} on {item.date}</p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await restoreCatalogItem(item.id);
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Couldn't restore this.");
                  }
                });
              }}
              className="rounded-full border border-ink-300 px-3 py-1 text-xs font-medium text-ink-700 hover:border-brand-500 disabled:opacity-50"
            >
              Restore
            </button>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
