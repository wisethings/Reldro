"use client";

import { useEffect, useState } from "react";

const OPTS: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };

/**
 * A moment in time shown in the reader's own time zone. The server doesn't know where the reader is,
 * so on the server it renders in UTC with a "UTC" label, then switches to local time in the browser.
 * For an incident timeline, showing the wrong hour is worse than a brief flash.
 */
export function LocalTime({ value, withYear = false }: { value: Date | string | null | undefined; withYear?: boolean }) {
  const iso = value ? new Date(value).toISOString() : null;
  const [local, setLocal] = useState<string | null>(null);
  useEffect(() => {
    if (iso) setLocal(new Date(iso).toLocaleString(undefined, withYear ? { ...OPTS, year: "numeric" } : OPTS));
  }, [iso, withYear]);
  if (!iso) return <>—</>;
  const utc = new Date(iso).toLocaleString("en-US", { ...OPTS, ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" }) + " UTC";
  return (
    <time dateTime={iso} suppressHydrationWarning title={local ? undefined : "Shown in UTC until your device's time zone loads"}>
      {local ?? utc}
    </time>
  );
}
