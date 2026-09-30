"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { addReportEvent } from "@/lib/safety/context";
import { hashFollowUpCode, normalizeFollowUpCode } from "@/lib/safety/followUp";

export type FollowUpView = {
  reference: string;
  status: string;
  closed: boolean;
  submittedAt: string;
  steps: { at: string; text: string; from: "you" | "team" | "system" }[];
};

export type FollowUpResult = { ok: true; view: FollowUpView } | { ok: false; error: string };

/** Plain wording for the reporter; internal status names like "Assigned" mean little outside the team. */
const REPORTER_STATUS: Record<string, string> = {
  NEW: "Received",
  ASSIGNED: "With the safety team",
  INVESTIGATING: "Being looked into",
  ACTIONS_OPEN: "Fixes are under way",
  CLOSED: "Closed",
};

const NOT_FOUND = "We couldn't find a report for that code. Check it and try again.";

async function load(code: string) {
  const normalized = normalizeFollowUpCode(code);
  if (normalized.length !== 12) return null;
  return prisma.safetyReport.findUnique({
    where: { followUpHash: hashFollowUpCode(normalized) },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
}

/**
 * Public, no login. The case code is the only credential, so lookups are rate limited by IP and
 * the response contains nothing about who handled the report: no names, no internal notes.
 */
export async function lookupFollowUp(code: string): Promise<FollowUpResult> {
  const ip = await getClientIp();
  if (!(await checkRateLimit(`followup:${ip}`, 20, 15))) return { ok: false, error: "Too many tries. Please wait a few minutes and try again." };
  const report = await load(code);
  if (!report) return { ok: false, error: NOT_FOUND };

  const steps: FollowUpView["steps"] = [];
  for (const e of report.events) {
    if (e.restricted) continue;
    if (e.type === "CREATED") steps.push({ at: e.createdAt.toISOString(), text: "Your report was received.", from: "system" });
    else if (e.type === "ACKNOWLEDGED") steps.push({ at: e.createdAt.toISOString(), text: "The safety team has seen your report.", from: "system" });
    else if (e.type === "STATUS" && /^Status set to/.test(e.message)) steps.push({ at: e.createdAt.toISOString(), text: `Status: ${REPORTER_STATUS[Object.keys(REPORTER_STATUS).find((k) => e.message.toLowerCase().includes(k.replace("_", " ").toLowerCase())) ?? ""] ?? "updated"}.`, from: "system" });
    else if (e.toReporter) steps.push({ at: e.createdAt.toISOString(), text: e.message, from: "team" });
    else if (e.type === "REPORTER_REPLY") steps.push({ at: e.createdAt.toISOString(), text: e.message, from: "you" });
  }
  return {
    ok: true,
    view: {
      reference: `SR-${String(report.number).padStart(4, "0")}`,
      status: REPORTER_STATUS[report.status] ?? "In progress",
      closed: report.status === "CLOSED",
      submittedAt: report.createdAt.toISOString(),
      steps,
    },
  };
}

export async function sendFollowUpReply(code: string, message: string): Promise<FollowUpResult> {
  const ip = await getClientIp();
  if (!(await checkRateLimit(`followup-reply:${ip}`, 10, 60))) return { ok: false, error: "Too many messages. Please wait a while and try again." };
  const text = message.trim().slice(0, 2000);
  if (text.length < 2) return { ok: false, error: "Write a message first." };
  const report = await load(code);
  if (!report) return { ok: false, error: NOT_FOUND };
  if (report.status === "CLOSED") return { ok: false, error: "This report is closed, so replies can't be added. You can file a new report." };
  await addReportEvent({ reportId: report.id, type: "REPORTER_REPLY", message: text, actor: null });
  return lookupFollowUp(code);
}
