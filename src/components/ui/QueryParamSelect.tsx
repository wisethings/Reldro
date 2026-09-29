"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * A single real (not decorative) dropdown that updates one query param via
 * the router, preserving every other param already set. Used for the small
 * "range"/"type" selects that sit in a card header (adoption trend range,
 * activity feed type) - the hosting server component reads the param back
 * out of its own searchParams and actually changes what it queries/shows.
 */
export function QueryParamSelect({
  paramKey,
  options,
  defaultValue,
}: {
  paramKey: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== defaultValue) params.set(paramKey, value);
    else params.delete(paramKey);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      defaultValue={searchParams.get(paramKey) ?? defaultValue}
      onChange={(e) => update(e.target.value)}
      className="rounded-full border border-ink-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
