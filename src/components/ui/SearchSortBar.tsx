"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

/**
 * A real (not decorative) search-plus-sort control: both update the page's
 * own query params via the router, preserving whatever other filters
 * (department, category...) are already set. Enter or blur commits the
 * search text; the sort select commits immediately on change. The server
 * component reads `q`/`sort` back out of its own searchParams and actually
 * filters/orders with them - this never renders without a page wiring the
 * two ends together.
 */
export function SearchSortBar({
  sortOptions,
  placeholder = "Search...",
}: {
  sortOptions: { value: string; label: string }[];
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("q", q);
          }}
          onBlur={() => updateParam("q", q)}
          placeholder={placeholder}
          className="w-full rounded-full border border-ink-300 bg-white py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <select
        defaultValue={searchParams.get("sort") ?? sortOptions[0]?.value}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="rounded-full border border-ink-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
