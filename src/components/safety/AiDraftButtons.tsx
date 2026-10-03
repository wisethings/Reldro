"use client";

import { aiSummarizeInvestigation, aiSummarizeThemes } from "@/lib/actions/safetyAi";
import { AiTextDraft } from "./AiTextDraft";

/** Thin client wrappers so server pages can pass plain ids instead of functions. */
export function TimelineSummaryDraft({ reportId }: { reportId: string }) {
  return <AiTextDraft label="Draft a timeline summary" generate={() => aiSummarizeInvestigation(reportId)} />;
}

export function ThemesSummaryDraft({ days, siteId = null }: { days: number; siteId?: string | null }) {
  return <AiTextDraft label="Draft a themes summary" generate={() => aiSummarizeThemes(days, siteId)} />;
}
